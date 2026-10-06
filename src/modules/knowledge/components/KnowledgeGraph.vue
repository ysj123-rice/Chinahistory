<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { Graph, GraphEvent } from '@antv/g6'

import {
  KNOWLEDGE_LAYOUT_GRAVITY,
  KNOWLEDGE_LAYOUT_MAX_ITERATION,
  KNOWLEDGE_LAYOUT_REPULSION,
  KNOWLEDGE_LAYOUT_SPRING,
  KNOWLEDGE_LAYOUT_SPRING_MAX,
  KNOWLEDGE_LAYOUT_TAO,
  KNOWLEDGE_NODE_RENDER_SIZE,
  NODE_TYPES,
  type KnowledgeEdge,
  type KnowledgeNode,
  type KnowledgeNodeType,
} from '@/modules/knowledge/constants'

type FilterKey = KnowledgeNodeType | 'all'

type GraphProps = {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

const props = defineProps<GraphProps>()

const containerRef = ref<HTMLDivElement | null>(null)
const activeType = ref<FilterKey>('all')
const isLayoutReady = ref(false)
const activeNode = ref<KnowledgeNode | null>(null)

let graph: Graph | null = null
let resizeObserver: ResizeObserver | null = null

const typeOptions: Array<{ key: FilterKey; label: string; color: string }> = [
  { key: 'all', label: '全部', color: '#1d2c3b' },
  ...NODE_TYPES,
]

const getEventNodeId = (event: unknown) => {
  const target = (event as { target?: { id?: string } }).target
  return typeof target?.id === 'string' ? target.id : null
}

const getVisibleNodes = () => {
  if (activeType.value === 'all') {
    return props.nodes
  }

  return props.nodes.filter((node) => node.type === activeType.value)
}

const getVisibleNodeIds = () => new Set(getVisibleNodes().map((node) => node.id))

const buildGraphData = () => ({
  nodes: props.nodes.map((node) => ({
    id: node.id,
    data: {
      label: node.label,
      type: node.type,
      description: node.description,
      ownerName: node.ownerName,
      isHidden: false,
    },
  })),
  edges: props.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: { label: edge.label, isHidden: false },
  })),
})

const fitGraphView = async () => {
  if (!graph) {
    return
  }
  await graph.fitView()
}

const buildGraph = async () => {
  if (!containerRef.value) {
    return
  }

  const { width, height } = containerRef.value.getBoundingClientRect()
  const canvasWidth = Math.max(width, 480)
  const canvasHeight = Math.max(height, 520)
  graph = new Graph({
    container: containerRef.value,
    width: canvasWidth,
    height: canvasHeight,
    data: buildGraphData(),
    zoom: 1,
    zoomRange: [0.6, 2],
    layout: {
      type: 'force-atlas2',
      // worker：1174 节点的迭代计算移出主线程，避免布局期间页面冻结
      worker: true,
      width: canvasWidth,
      height: canvasHeight,
      center: [canvasWidth / 2, canvasHeight / 2],
      kr: KNOWLEDGE_LAYOUT_REPULSION,
      kg: KNOWLEDGE_LAYOUT_GRAVITY,
      ks: KNOWLEDGE_LAYOUT_SPRING,
      ksmax: KNOWLEDGE_LAYOUT_SPRING_MAX,
      tao: KNOWLEDGE_LAYOUT_TAO,
      // 不开 preventOverlap：每轮迭代的 O(n²) 碰撞检测是最大计算黑洞；渲染尺寸本身已有间距
      maxIteration: KNOWLEDGE_LAYOUT_MAX_ITERATION,
    },
    node: {
      type: 'circle',
      style: (model) => {
        const type = model.data?.type as KnowledgeNodeType
        const label = model.data?.label as string
        const ownerName = model.data?.ownerName as string
        const isHidden = Boolean(model.data?.isHidden)
        const color = NODE_TYPES.find((item) => item.key === type)?.color ?? '#1f88a7'
        return {
          size: KNOWLEDGE_NODE_RENDER_SIZE,
          fill: color,
          stroke: '#ffffff',
          lineWidth: isHidden ? 0 : 1.2,
          opacity: isHidden ? 0 : 1,
          labelText: isHidden ? '' : ownerName ? `${label}\n${ownerName}` : label,
          labelFill: isHidden ? 'transparent' : '#1d2c3b',
          labelFontSize: 11,
          labelLineHeight: 16,
          labelPlacement: 'bottom',
          labelOffsetY: 8,
          labelMaxWidth: 120,
          labelBackground: !isHidden,
          labelBackgroundFill: 'rgba(255, 255, 255, 0.92)',
          labelBackgroundStroke: 'rgba(31, 136, 167, 0.2)',
          labelBackgroundLineWidth: isHidden ? 0 : 1,
          labelPadding: [4, 6],
        }
      },
    },
    edge: {
      type: 'line',
      style: (model) => {
        const isHidden = Boolean(model.data?.isHidden)
        return {
          stroke: '#b8c7d6',
          lineWidth: isHidden ? 0 : 1,
          opacity: isHidden ? 0 : 0.9,
          labelText: isHidden ? '' : (model.data?.label as string),
          labelFill: isHidden ? 'transparent' : '#4f6377',
          labelFontSize: 10,
          labelLineHeight: 12,
          labelBackground: !isHidden,
          labelBackgroundFill: 'rgba(255, 255, 255, 0.86)',
          labelBackgroundStroke: 'rgba(31, 136, 167, 0.15)',
          labelBackgroundLineWidth: isHidden ? 0 : 1,
          labelPadding: [2, 4],
        }
      },
    },
    behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element', 'hover-activate'],
  })

  graph.on(GraphEvent.BEFORE_LAYOUT, () => {
    isLayoutReady.value = false
  })

  graph.on(GraphEvent.AFTER_LAYOUT, () => {
    isLayoutReady.value = true
    void fitGraphView()
  })

  graph.on('canvas:click', () => {
    activeNode.value = null
  })

  graph.on('node:click', (event) => {
    const nodeId = getEventNodeId(event)
    if (!nodeId) {
      return
    }
    const nodeData = props.nodes.find((node) => node.id === nodeId) ?? null
    activeNode.value = nodeData
  })

  await graph.render()
  activeNode.value = getVisibleNodes()[0] ?? null
  void applyFilter()
}

const applyFilter = async () => {
  if (!graph) {
    return
  }

  const visibleNodeIds = getVisibleNodeIds()
  const visibleNodes = getVisibleNodes()

  graph.updateNodeData((nodes) =>
    nodes.map((node) => {
      const baseData = node.data ?? {}
      return {
        id: node.id,
        data: {
          ...baseData,
          isHidden: !visibleNodeIds.has(node.id as string),
        },
      }
    }),
  )

  graph.updateEdgeData((edges) =>
    edges.map((edge) => {
      const baseData = edge.data ?? {}
      return {
        id: edge.id,
        data: {
          ...baseData,
          isHidden:
            !visibleNodeIds.has(edge.source as string) ||
            !visibleNodeIds.has(edge.target as string),
        },
      }
    }),
  )

  await graph.draw()

  if (activeNode.value && visibleNodeIds.has(activeNode.value.id)) {
    return
  }
  activeNode.value = visibleNodes[0] ?? null
}

const updateGraphData = async () => {
  if (!graph) {
    return
  }

  isLayoutReady.value = false
  activeNode.value = null
  graph.setData(buildGraphData())
  await graph.render()
  activeNode.value = getVisibleNodes()[0] ?? null
  void applyFilter()
}

const setupResizeObserver = () => {
  if (!containerRef.value) {
    return
  }

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry || !graph) {
      return
    }
    const { width, height } = entry.contentRect
    const resizedWidth = Math.max(width, 480)
    const resizedHeight = Math.max(height, 520)
    graph.resize(resizedWidth, resizedHeight)
    if (isLayoutReady.value) {
      void fitGraphView()
    }
  })
  resizeObserver.observe(containerRef.value)
}

watch(activeType, () => {
  void applyFilter()
})

watch(
  () => [props.nodes, props.edges],
  () => {
    activeType.value = 'all'
    void updateGraphData()
  },
)

onMounted(() => {
  void buildGraph()
  setupResizeObserver()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  graph?.destroy()
  graph = null
})
</script>

<template>
  <div class="knowledge-graph">
    <div class="graph-panel">
      <div class="panel-title">类型筛选</div>
      <div class="type-list">
        <button
          v-for="type in typeOptions"
          :key="type.key"
          type="button"
          class="type-chip"
          :class="{ active: activeType === type.key }"
          @click="activeType = type.key"
        >
          <span class="dot" :style="{ background: type.color }"></span>
          {{ type.label }}
        </button>
      </div>
      <div class="panel-hint">点击节点可拖动，滚轮缩放视图</div>
    </div>

    <div v-if="activeNode" class="node-detail">
      <div class="detail-header">
        <div>
          <strong>{{ activeNode?.label }}</strong>
          <span class="detail-type">
            {{ typeOptions.find((item) => item.key === activeNode?.type)?.label }}
          </span>
        </div>
        <span class="detail-owner">归属：{{ activeNode?.ownerName }}</span>
      </div>
      <p class="detail-desc">{{ activeNode?.description }}</p>
      <div class="detail-grid">
        <div class="detail-item">
          <span>时代</span>
          <strong>{{ activeNode?.era ?? '未注明' }}</strong>
        </div>
        <div class="detail-item">
          <span>地点</span>
          <strong>{{ activeNode?.location ?? '未注明' }}</strong>
        </div>
        <div class="detail-item">
          <span>相关家族</span>
          <strong>{{ activeNode?.relatedClan ?? '未注明' }}</strong>
        </div>
        <div class="detail-item">
          <span>来源</span>
          <strong>{{ activeNode?.source ?? '未注明' }}</strong>
        </div>
      </div>
    </div>

    <div class="graph-container" ref="containerRef"></div>
  </div>
</template>

<style scoped>
.knowledge-graph {
  position: relative;
  height: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid var(--panel-border);
  background: var(--surface-2);
  overflow: hidden;
}

.graph-panel {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 10px;
  box-shadow: var(--shadow-soft);
  max-width: 220px;
}

.panel-title {
  font-size: 12px;
  color: var(--text-muted);
}

.type-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.type-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid rgba(31, 136, 167, 0.2);
  background: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  color: var(--text-primary);
}

.type-chip.active {
  background: rgba(31, 136, 167, 0.16);
  border-color: rgba(31, 136, 167, 0.45);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.panel-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.graph-container {
  width: 100%;
  height: 100%;
}

.node-detail {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 240px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 8px;
  box-shadow: var(--shadow-soft);
  z-index: 10;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}

.detail-header strong {
  display: block;
  font-size: 14px;
}

.detail-type {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.detail-owner {
  font-size: 11px;
  color: var(--text-muted);
}

.detail-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.detail-grid {
  display: grid;
  gap: 6px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
}

.detail-item strong {
  color: var(--text-strong);
}

@media (max-width: 960px) {
  .node-detail {
    position: static;
    width: auto;
    margin: 12px;
  }
}
</style>

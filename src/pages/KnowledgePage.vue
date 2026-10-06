<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AppHeader from '@/components/layout/AppHeader.vue'
import KnowledgeGraph from '@/modules/knowledge/components/KnowledgeGraph.vue'
import { fetchKnowledgeEdges, fetchKnowledgeNodes } from '@/modules/knowledge/api'
import { NODE_TYPES, type KnowledgeEdge, type KnowledgeNode } from '@/modules/knowledge/constants'
import { useMapSourceStore } from '@/stores/mapSource'

const mapSourceStore = useMapSourceStore()
const activeSourceKey = computed(() => mapSourceStore.activeSourceKey)
const knowledgeNodes = ref<KnowledgeNode[]>([])
const knowledgeEdges = ref<KnowledgeEdge[]>([])
const graphKey = ref(0)
const isLoading = ref(false)
const errorMessage = ref('')

const nodeCount = computed(() => knowledgeNodes.value.length)
const edgeCount = computed(() => knowledgeEdges.value.length)
const typeCount = NODE_TYPES.length

const loadKnowledgeData = async (sourceKey: string) => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    const [nodes, edges] = await Promise.all([
      fetchKnowledgeNodes(sourceKey),
      fetchKnowledgeEdges(sourceKey),
    ])
    knowledgeNodes.value = nodes
    knowledgeEdges.value = edges
    graphKey.value += 1
  } catch (error) {
    console.error('知识图谱加载失败', error)
    errorMessage.value = '知识图谱加载失败'
  } finally {
    isLoading.value = false
  }
}

watch(
  activeSourceKey,
  (sourceKey) => {
    void loadKnowledgeData(sourceKey)
  },
  { immediate: true },
)
</script>

<template>
  <div class="knowledge-page">
    <AppHeader />
    <div class="knowledge-body">
      <aside class="knowledge-aside">
        <section class="info-card">
          <h3>关系图谱</h3>
          <p>点击类型筛选后查看核心人物与事件之间的联系。</p>
        </section>
        <section class="info-card">
          <h3>分析建议</h3>
          <ul>
            <li>寻找关键人物与高关联节点</li>
            <li>观察事件与地点的聚合路径</li>
            <li>对比不同类型之间的连通度</li>
          </ul>
        </section>
      </aside>

      <section class="graph-area">
        <div v-if="errorMessage" class="load-error">{{ errorMessage }}</div>
        <div v-if="isLoading" class="load-hint">数据加载中...</div>
        <KnowledgeGraph :key="graphKey" :nodes="knowledgeNodes" :edges="knowledgeEdges" />
      </section>

      <aside class="knowledge-summary">
        <section class="summary-card">
          <h4>图谱概览</h4>
          <div class="summary-item">
            <span>节点数量</span>
            <strong>{{ nodeCount }}</strong>
          </div>
          <div class="summary-item">
            <span>关系数量</span>
            <strong>{{ edgeCount }}</strong>
          </div>
          <div class="summary-item">
            <span>类型</span>
            <strong>{{ typeCount }} 类</strong>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.knowledge-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.knowledge-body {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 200px;
  gap: 20px;
  padding: 24px;
}

.knowledge-aside,
.knowledge-summary {
  display: grid;
  gap: 16px;
}

.graph-area {
  min-height: 640px;
}

.load-error {
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(217, 93, 57, 0.08);
  border: 1px solid rgba(217, 93, 57, 0.2);
  color: #a94a31;
  font-size: 13px;
}

.load-hint {
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(31, 136, 167, 0.08);
  border: 1px solid rgba(31, 136, 167, 0.18);
  color: #1f6f93;
  font-size: 13px;
}

.info-card,
.summary-card {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-soft);
}

.info-card h3,
.summary-card h4 {
  margin: 0 0 8px;
  font-size: 15px;
}

.info-card p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.info-card ul {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--text-muted);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
}

.summary-item strong {
  color: var(--text-strong);
}

@media (max-width: 1200px) {
  .knowledge-body {
    grid-template-columns: 1fr;
  }
}
</style>

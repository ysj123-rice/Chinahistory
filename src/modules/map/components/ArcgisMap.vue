<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import ArcGISMap from '@arcgis/core/Map'
import MapView from '@arcgis/core/views/MapView'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer'
import WebTileLayer from '@arcgis/core/layers/WebTileLayer'
import Graphic from '@arcgis/core/Graphic'
import Point from '@arcgis/core/geometry/Point'
import Field from '@arcgis/core/layers/support/Field'
import PopupTemplate from '@arcgis/core/PopupTemplate'
import HeatmapRenderer from '@arcgis/core/renderers/HeatmapRenderer'
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol'
import FeatureReductionCluster from '@arcgis/core/layers/support/FeatureReductionCluster'
import LabelClass from '@arcgis/core/layers/support/LabelClass'
import TextSymbol from '@arcgis/core/symbols/TextSymbol'
// 显式注入 Popup：默认 popup 依赖懒注入在部分构建环境下不会触发（view.popup 为空对象）
import Popup from '@arcgis/core/widgets/Popup'

import {
  ARCGIS_API_KEY,
  BOUNDARY_FILL_COLOR,
  BOUNDARY_OUTLINE_COLOR,
  BOUNDARY_OUTLINE_WIDTH,
  buildTiandituTileUrl,
  CLUSTER_MAX_SIZE,
  CLUSTER_MIN_SIZE,
  CLUSTER_OUTLINE_COLOR,
  CLUSTER_OUTLINE_WIDTH,
  CLUSTER_RADIUS,
  CLUSTER_TEXT_COLOR,
  CLUSTER_TEXT_HALO,
  buildLayerUrl,
  HEATMAP_COLOR_STOPS,
  HEATMAP_MAX_DENSITY,
  HEATMAP_MIN_DENSITY,
  HEATMAP_RADIUS,
  HEATMAP_WEIGHT_MULTIPLIER,
  MAP_BASEMAP,
  MAP_CENTER,
  MAP_MAX_ZOOM,
  MAP_ZOOM,
  SCATTER_COLOR,
  SCATTER_OUTLINE_COLOR,
  SCATTER_OUTLINE_WIDTH,
  SCATTER_SIZE,
  TIANDITU_KEY,
  TIANDITU_SUBDOMAIN_LIST,
} from '@/modules/map/constants'
import { getLayerGroup } from '@/modules/map/layerDefinitions'
import { generateMockPoints } from '@/modules/map/mockPoints'
import { buildPersonGeoNote, createPersonPopupTemplate, fetchRealPersonPoints, registerSurnameCardAction, type RealPersonPoint } from '@/modules/map/realPoints'
import { SURNAME_MOD_BASE, SURNAME_OPTIONS } from '@/modules/map/surnameOptions'
import { useMapSourceStore } from '@/stores/mapSource'

const renderOptions = [
  { id: 'scatter', label: '散点图' },
  { id: 'heatmap', label: '热力图' },
  { id: 'cluster', label: '聚合图' },
] as const

type RenderMode = (typeof renderOptions)[number]['id']

const mapSourceStore = useMapSourceStore()
const activeMode = ref<RenderMode>('scatter')
const activeSourceKey = computed(() => mapSourceStore.activeSourceKey)
const activeServiceUrl = computed(() => mapSourceStore.activeServiceUrl)
const activeGeoJsonPath = computed(() => mapSourceStore.activeGeoJsonPath)
const layerGroup = computed(() => getLayerGroup(activeSourceKey.value))
const pointLayerDefinitions = computed(() => layerGroup.value.pointLayers)
const boundaryLayerDefinitions = computed(() => layerGroup.value.boundaryLayers)
const activePointLayerId = ref(layerGroup.value.defaultPointLayerId)
const hasArcgisApiKey = computed(() => Boolean(ARCGIS_API_KEY))
const hasTiandituKey = computed(() => Boolean(TIANDITU_KEY))
const activeSurnameKey = ref('all')
const mapContainer = ref<HTMLDivElement | null>(null)
const statusMessage = ref<string | null>(null)
const isReady = ref(false)

const boundaryVisibility = reactive<Record<number, boolean>>({})

let mapView: MapView | null = null
let activePointLayer: FeatureLayer | null = null

// 当前朝代的 CBDB 真实人物点；为空时回退到客户端示例点
let realPoints: RealPersonPoint[] = []
// 标记由真实人物点构建的图层（姓氏筛选语法与示例数据不同）
const realDataLayers = new WeakSet<FeatureLayer>()
let mapInstance: ArcGISMap | null = null
const pointLayerMap = new Map<number, FeatureLayer>()
const boundaryLayerMap = new Map<number, FeatureLayer | GeoJSONLayer>()


const createScatterRenderer = () =>
  new SimpleRenderer({
    symbol: new SimpleMarkerSymbol({
      color: SCATTER_COLOR,
      size: SCATTER_SIZE,
      outline: {
        color: SCATTER_OUTLINE_COLOR,
        width: SCATTER_OUTLINE_WIDTH,
      },
    }),
  })

const createHeatmapRenderer = () =>
  new HeatmapRenderer({
    minDensity: HEATMAP_MIN_DENSITY,
    maxDensity: HEATMAP_MAX_DENSITY,
    radius: HEATMAP_RADIUS,
    valueExpression: `1 * ${HEATMAP_WEIGHT_MULTIPLIER}`,
    colorStops: HEATMAP_COLOR_STOPS,
  })

const createBoundaryRenderer = () =>
  new SimpleRenderer({
    symbol: new SimpleFillSymbol({
      color: BOUNDARY_FILL_COLOR,
      outline: {
        color: BOUNDARY_OUTLINE_COLOR,
        width: BOUNDARY_OUTLINE_WIDTH,
      },
    }),
  })

const createClusterReduction = () =>
  new FeatureReductionCluster({
    clusterRadius: CLUSTER_RADIUS,
    clusterMinSize: CLUSTER_MIN_SIZE,
    clusterMaxSize: CLUSTER_MAX_SIZE,
    symbol: new SimpleMarkerSymbol({
      color: SCATTER_COLOR,
      outline: {
        color: CLUSTER_OUTLINE_COLOR,
        width: CLUSTER_OUTLINE_WIDTH,
      },
    }),
    popupTemplate: {
      title: '聚合点',
      content: '共 {cluster_count} 条记录',
    },
    labelingInfo: [
      new LabelClass({
        labelExpressionInfo: { expression: '$feature.cluster_count' },
        symbol: new TextSymbol({
          color: CLUSTER_TEXT_COLOR,
          haloColor: CLUSTER_TEXT_HALO,
          haloSize: 1,
          font: {
            size: 12,
            weight: 'bold',
          },
        }),
      }),
    ],
  })

const safeGoTo = async (extent: __esri.Extent) => {
  if (!mapView || mapView.destroyed) {
    return
  }
  try {
    await mapView.goTo(extent, { animate: false })
  } catch (error) {
    console.warn('视图定位失败', error)
  }
}

const zoomToActiveLayer = async () => {
  if (!activePointLayer) {
    return
  }

  try {
    await activePointLayer.when()
    applySurnameFilter()
    const extent = activePointLayer.fullExtent
    if (extent) {
      await safeGoTo(extent.expand(1.15))
    }
  } catch (error) {
    console.error('图层加载失败', error)
    statusMessage.value = '图层加载失败，请检查访问权限。'
  }
}

const resolvePointLayerId = (layerId: number) => {
  const definitions = pointLayerDefinitions.value
  const exists = definitions.some((definition) => definition.id === layerId)
  return exists ? layerId : layerGroup.value.defaultPointLayerId
}

const createPointLayer = (layerId: number, title: string, isVisible: boolean) => {
  const url = buildLayerUrl(activeServiceUrl.value, layerId)
  if (url) {
    return new FeatureLayer({
      url,
      title,
      outFields: ['*'],
      renderer: createScatterRenderer(),
      popupEnabled: true,
      visible: isVisible,
    })
  }

  const fields = [
    new Field({ name: 'ObjectId', type: 'oid' }),
    new Field({ name: 'surname', type: 'string' }),
    new Field({ name: 'name', type: 'string' }),
    new Field({ name: 'location', type: 'string' }),
    new Field({ name: 'dynasty', type: 'string' }),
    new Field({ name: 'year', type: 'integer' }),
    new Field({ name: 'geoNote', type: 'string' }),
  ]

  // 优先使用 CBDB 真实人物籍贯点；无数据（接口失败或该朝代无人物）时回退示例点
  if (realPoints.length > 0) {
    const source = realPoints.map((p) => {
      const geoNote = buildPersonGeoNote(p)
      return new Graphic({
        geometry: new Point({ longitude: p.lng, latitude: p.lat }),
        attributes: {
          ObjectId: p.id,
          surname: p.surname,
          name: p.personName,
          location: p.jiguanName ?? '',
          dynasty: p.dynastyName ?? '',
          year: p.year,
          ...(geoNote ? { geoNote } : {}),
        },
      })
    })

    const layer = new FeatureLayer({
      source,
      fields,
      objectIdField: 'ObjectId',
      title: `${title}（历史人物籍贯）`,
      outFields: ['*'],
      renderer: createScatterRenderer(),
      popupTemplate: createPersonPopupTemplate(),
      popupEnabled: true,
      visible: isVisible,
    })
    realDataLayers.add(layer)
    return layer
  }

  const mockPoints = generateMockPoints(400, `layer-${layerId}`)
  const source = mockPoints.map((p) =>
    new Graphic({
      geometry: new Point({ longitude: p.longitude, latitude: p.latitude }),
      attributes: {
        ObjectId: p.objectId,
        surname: p.surname,
        name: p.name,
        location: p.location,
      },
    }),
  )

  return new FeatureLayer({
    source,
    fields,
    objectIdField: 'ObjectId',
    title: `${title}（示例）`,
    outFields: ['*'],
    renderer: createScatterRenderer(),
    popupEnabled: true,
    visible: isVisible,
  })
}

const createBoundaryLayer = (layerId: number, title: string, isVisible: boolean) => {
  const url = buildLayerUrl(activeServiceUrl.value, layerId)
  if (url) {
    return new FeatureLayer({
      url,
      title,
      renderer: createBoundaryRenderer(),
      popupEnabled: false,
      visible: isVisible,
      opacity: 0.9,
    })
  }

  // 未配置 ArcGIS 服务地址时，使用本地 GeoJSON 边界数据
  if (activeGeoJsonPath.value) {
    return new GeoJSONLayer({
      url: activeGeoJsonPath.value,
      title: `${title}（GeoJSON）`,
      renderer: createBoundaryRenderer(),
      popupEnabled: false,
      visible: isVisible,
      opacity: 0.9,
    })
  }

  return null
}

const getActivePointOidField = () => activePointLayer?.objectIdField ?? 'FID'

const resetBoundaryVisibility = () => {
  Object.keys(boundaryVisibility).forEach((key) => {
    delete boundaryVisibility[Number(key)]
  })
  const visibleIds = layerGroup.value.defaultVisibleBoundaryIds
  boundaryLayerDefinitions.value.forEach((layer) => {
    boundaryVisibility[layer.id] = visibleIds.includes(layer.id)
  })
}

const applySurnameFilter = () => {
  if (!activePointLayer) {
    return
  }

  if (activeMode.value !== 'heatmap') {
    activePointLayer.definitionExpression = ''
    return
  }

  const option = SURNAME_OPTIONS.find((item) => item.key === activeSurnameKey.value)
  if (!option || option.key === 'all') {
    activePointLayer.definitionExpression = ''
    return
  }

  // 真实人物点带真实姓氏字段，直接按姓氏筛选；示例数据才用 ObjectId 取模
  if (realDataLayers.has(activePointLayer)) {
    activePointLayer.definitionExpression = `surname = '${option.label}'`
    return
  }

  if (option.modValue === undefined) {
    activePointLayer.definitionExpression = ''
    return
  }

  const oidField = getActivePointOidField()
  activePointLayer.definitionExpression = `MOD(${oidField}, ${SURNAME_MOD_BASE}) = ${option.modValue}`
}

const applyRenderMode = (mode: RenderMode) => {
  if (!activePointLayer) {
    return
  }

  try {
    if (mode === 'heatmap') {
      activePointLayer.featureReduction = null
      activePointLayer.renderer = createHeatmapRenderer()
      return
    }

    activePointLayer.renderer = createScatterRenderer()

    if (mode === 'cluster') {
      activePointLayer.featureReduction = createClusterReduction()
    } else {
      activePointLayer.featureReduction = null
    }
  } catch (error) {
    console.error('渲染切换失败', error)
    statusMessage.value = '渲染切换失败，请稍后再试。'
  }
}

const switchMode = (mode: RenderMode) => {
  activeMode.value = mode
  applyRenderMode(mode)
  applySurnameFilter()
}

const applyActivePointLayer = (layerId: number) => {
  const resolvedId = resolvePointLayerId(layerId)

  pointLayerMap.forEach((layer, id) => {
    const isActive = id === resolvedId
    layer.visible = isActive
    if (!isActive) {
      layer.featureReduction = null
      layer.definitionExpression = ''
    }
  })

  activePointLayer = pointLayerMap.get(resolvedId) ?? null
  applyRenderMode(activeMode.value)
  applySurnameFilter()
}

const setBoundaryVisibility = (layerId: number, isVisible: boolean) => {
  boundaryVisibility[layerId] = isVisible
  const layer = boundaryLayerMap.get(layerId)
  if (layer) {
    layer.visible = isVisible
  }
}

const handleBoundaryToggle = (layerId: number, event: Event) => {
  const target = event.target as HTMLInputElement
  setBoundaryVisibility(layerId, target.checked)
}

const initializeMap = async () => {
  if (!mapContainer.value) {
    return
  }

  try {
    mapInstance = new ArcGISMap({ basemap: null })

    // 优先使用天地图瓦片底图（国内可访问，无需 ArcGIS API Key）
    const vecUrl = buildTiandituTileUrl('vec')
    const cvaUrl = buildTiandituTileUrl('cva')
    if (vecUrl) {
      mapInstance.add(
        new WebTileLayer({
          urlTemplate: vecUrl,
          subDomains: TIANDITU_SUBDOMAIN_LIST,
          copyright: '天地图',
        }),
      )
    }
    if (cvaUrl) {
      mapInstance.add(
        new WebTileLayer({
          urlTemplate: cvaUrl,
          subDomains: TIANDITU_SUBDOMAIN_LIST,
        }),
      )
    }

    mapView = new MapView({
      container: mapContainer.value,
      map: mapInstance,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      constraints: {
        maxZoom: MAP_MAX_ZOOM,
      },
      // 显式注入 Popup：默认 popup 依赖懒注入在部分构建环境下不会触发（view.popup 为空对象）
      popup: new Popup(),
    })

    // 注意：不要设置 ui.components = []——清空 UI 会把 popup 的挂载容器一并移除，
    // 导致弹窗状态可见但 DOM 不渲染；默认控件改由 CSS 隐藏（见样式区 .esri-ui 规则）。

    await mapView.when()

    registerSurnameCardAction(mapView)

    mapView.on('layerview-create-error', () => {
      statusMessage.value = '图层加载失败，请检查访问权限或图层地址。'
    })

    resetBoundaryVisibility()
    const resolvedPointId = resolvePointLayerId(activePointLayerId.value)
    activePointLayerId.value = resolvedPointId

    realPoints = await fetchRealPersonPoints(activeSourceKey.value)

    boundaryLayerDefinitions.value.forEach((definition) => {
      const isVisible = boundaryVisibility[definition.id] ?? false
      const layer = createBoundaryLayer(definition.id, definition.label, isVisible)
      if (layer) {
        mapInstance?.add(layer)
        boundaryLayerMap.set(definition.id, layer)
      }
    })

    pointLayerDefinitions.value.forEach((definition) => {
      const layer = createPointLayer(definition.id, definition.label, definition.id === resolvedPointId)
      if (layer) {
        mapInstance?.add(layer)
        pointLayerMap.set(definition.id, layer)
      }
    })

    activePointLayer = pointLayerMap.get(resolvedPointId) ?? null
    applyActivePointLayer(resolvedPointId)

    await zoomToActiveLayer()

    isReady.value = true
    applyRenderMode(activeMode.value)
  } catch (error) {
    console.error('地图初始化失败', error)
    statusMessage.value = '地图初始化失败，请检查配置。'
  }
}

const reloadLayers = async () => {
  if (!mapInstance || !mapView) {
    return
  }

  statusMessage.value = null
  pointLayerMap.forEach((layer) => {
    mapInstance?.remove(layer)
  })
  boundaryLayerMap.forEach((layer) => {
    mapInstance?.remove(layer)
  })
  pointLayerMap.clear()
  boundaryLayerMap.clear()
  activePointLayer = null

  resetBoundaryVisibility()
  const resolvedPointId = resolvePointLayerId(activePointLayerId.value)
  activePointLayerId.value = resolvedPointId

  realPoints = await fetchRealPersonPoints(activeSourceKey.value)

  boundaryLayerDefinitions.value.forEach((definition) => {
    const isVisible = boundaryVisibility[definition.id] ?? false
    const layer = createBoundaryLayer(definition.id, definition.label, isVisible)
    if (layer) {
      mapInstance?.add(layer)
      boundaryLayerMap.set(definition.id, layer)
    }
  })

  pointLayerDefinitions.value.forEach((definition) => {
    const layer = createPointLayer(definition.id, definition.label, definition.id === resolvedPointId)
    if (layer) {
      mapInstance?.add(layer)
      pointLayerMap.set(definition.id, layer)
    }
  })

  activePointLayer = pointLayerMap.get(resolvedPointId) ?? null
  applyActivePointLayer(resolvedPointId)

  await zoomToActiveLayer()
  applyRenderMode(activeMode.value)
}

onMounted(() => {
  void initializeMap()
})

watch(activePointLayerId, (layerId) => {
  if (pointLayerMap.size === 0) {
    return
  }
  applyActivePointLayer(layerId)
})

watch(activeSourceKey, () => {
  activePointLayerId.value = layerGroup.value.defaultPointLayerId
  void reloadLayers()
})

watch(activeSurnameKey, () => {
  if (pointLayerMap.size === 0) {
    return
  }
  applySurnameFilter()
})

onBeforeUnmount(() => {
  mapView?.destroy()
  mapView = null
  activePointLayer = null
  mapInstance = null
  pointLayerMap.clear()
  boundaryLayerMap.clear()
})
</script>

<template>
  <div class="map-shell">
    <div class="map-toolbar">
      <div class="toolbar-title">空间分布模式</div>
      <div class="toolbar-actions">
        <button
          v-for="option in renderOptions"
          :key="option.id"
          class="mode-button"
          :class="{ active: activeMode === option.id }"
          type="button"
          @click="switchMode(option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="layer-panel">
      <div class="panel-title">图层</div>
      <div class="layer-group">
        <div class="group-title">点图层</div>
        <label v-for="layer in pointLayerDefinitions" :key="layer.id" class="layer-option">
          <input
            v-model.number="activePointLayerId"
            type="radio"
            name="point-layer"
            :value="layer.id"
          />
          <span>{{ layer.label }}</span>
        </label>
      </div>
      <div class="layer-group">
        <div class="group-title">姓氏热力图</div>
        <select v-model="activeSurnameKey" class="surname-select">
          <option v-for="option in SURNAME_OPTIONS" :key="option.key" :value="option.key">
            {{ option.label }}
          </option>
        </select>
        <div class="select-hint">仅在热力图模式生效</div>
      </div>
      <div class="layer-group">
        <div class="group-title">边界图层</div>
        <label v-for="layer in boundaryLayerDefinitions" :key="layer.id" class="layer-option">
          <input
            type="checkbox"
            :checked="boundaryVisibility[layer.id]"
            @change="handleBoundaryToggle(layer.id, $event)"
          />
          <span>{{ layer.label }}</span>
        </label>
      </div>
    </div>

    <div class="map-container" ref="mapContainer"></div>

    <div v-if="!hasTiandituKey" class="map-hint">
      未检测到 <strong>VITE_TIANDITU_KEY</strong>，底图无法加载，请在环境变量中配置天地图 Key。
    </div>

    <div v-if="statusMessage" class="map-status">{{ statusMessage }}</div>

    <div v-if="!isReady" class="map-loading">地图加载中...</div>
  </div>
</template>

<style scoped>
.map-shell {
  position: relative;
  height: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--panel-border);
  box-shadow: var(--shadow-soft);
}

.map-toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  gap: 8px;
  box-shadow: var(--shadow-soft);
}

.layer-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 12px;
  min-width: 200px;
  box-shadow: var(--shadow-soft);
}

.panel-title {
  font-size: 12px;
  color: var(--text-muted);
}

.layer-group {
  display: grid;
  gap: 6px;
}

.group-title {
  font-size: 12px;
  color: var(--text-muted);
}

.layer-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
}

.layer-option input {
  accent-color: var(--accent);
}

.surname-select {
  width: 100%;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(31, 136, 167, 0.25);
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  font-size: 12px;
}

.select-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.toolbar-title {
  font-size: 12px;
  color: var(--text-muted);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.mode-button {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--surface-3);
  font-size: 12px;
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.mode-button:hover {
  border-color: rgba(31, 136, 167, 0.35);
  color: var(--text-primary);
}

.mode-button.active {
  background: rgba(31, 136, 167, 0.18);
  border-color: rgba(31, 136, 167, 0.4);
  color: var(--text-primary);
}

.map-container {
  height: 100%;
  width: 100%;
}

/* 保留 popup（overlay 层），仅隐藏 ArcGIS 默认缩放/指南针等 UI 控件 */
.map-shell :deep(.esri-ui-top-left),
.map-shell :deep(.esri-ui-top-right),
.map-shell :deep(.esri-ui-bottom-left) {
  display: none;
}

.map-hint {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  background: rgba(255, 246, 230, 0.9);
  color: #704a1e;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(227, 139, 44, 0.35);
  font-size: 12px;
}

.map-status {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
  background: rgba(255, 232, 232, 0.92);
  color: #9b2c2c;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(198, 72, 59, 0.3);
  font-size: 12px;
}

.map-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  color: var(--text-primary);
  backdrop-filter: blur(2px);
}
</style>

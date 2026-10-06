<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import ArcGISMap from '@arcgis/core/Map'
import MapView from '@arcgis/core/views/MapView'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import WebTileLayer from '@arcgis/core/layers/WebTileLayer'
import Graphic from '@arcgis/core/Graphic'
import Point from '@arcgis/core/geometry/Point'
import Field from '@arcgis/core/layers/support/Field'
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol'
import TextSymbol from '@arcgis/core/symbols/TextSymbol'
import LabelClass from '@arcgis/core/layers/support/LabelClass'
import Sketch from '@arcgis/core/widgets/Sketch'
// 显式注入 Popup：默认 popup 依赖懒注入在部分构建环境下不会触发（view.popup 为空对象）
import Popup from '@arcgis/core/widgets/Popup'

import {
  MAP_CENTER,
  MAP_MAX_ZOOM,
  MAP_ZOOM,
  SCATTER_OUTLINE_COLOR,
  SCATTER_OUTLINE_WIDTH,
  SCATTER_SIZE,
  buildLayerUrl,
  buildTiandituTileUrl,
  TIANDITU_SUBDOMAIN_LIST,
} from '@/modules/map/constants'
import { generateMockPoints } from '@/modules/map/mockPoints'
import { createPersonPopupTemplate, fetchRealPersonPoints, registerSurnameCardAction, type RealPersonPoint } from '@/modules/map/realPoints'
import { getLayerGroup } from '@/modules/map/layerDefinitions'
import { useMapSourceStore } from '@/stores/mapSource'
import { DEFAULT_THEMATIC_COLOR_KEY, LEGEND_TITLE, THEMATIC_COLORS } from '@/modules/thematic/constants'

const mapSourceStore = useMapSourceStore()
const mapContainer = ref<HTMLDivElement | null>(null)
const statusMessage = ref<string | null>(null)
const isReady = ref(false)

const activeSourceKey = computed(() => mapSourceStore.activeSourceKey)
const activeServiceUrl = computed(() => mapSourceStore.activeServiceUrl)
const layerGroup = computed(() => getLayerGroup(activeSourceKey.value))
const activePointLayerId = ref(layerGroup.value.defaultPointLayerId)

const selectedColorKey = ref(DEFAULT_THEMATIC_COLOR_KEY)
const showLabels = ref(true)
const showLegend = ref(true)

let mapView: MapView | null = null
let mapInstance: ArcGISMap | null = null
let thematicLayer: FeatureLayer | null = null
let sketchLayer: GraphicsLayer | null = null
let sketchWidget: Sketch | null = null

// 当前朝代的 CBDB 真实人物点；为空时回退到客户端示例点
let realPoints: RealPersonPoint[] = []

const getSelectedColor = () =>
  THEMATIC_COLORS.find((item) => item.key === selectedColorKey.value)?.color ?? '#1f88a7'

const createBasemapLayers = () => {
  const vectorLayer = new WebTileLayer({
    urlTemplate: buildTiandituTileUrl('vec'),
    subDomains: TIANDITU_SUBDOMAIN_LIST,
    title: '天地图矢量',
  })
  const annotationLayer = new WebTileLayer({
    urlTemplate: buildTiandituTileUrl('cva'),
    subDomains: TIANDITU_SUBDOMAIN_LIST,
    title: '天地图注记',
  })
  return [vectorLayer, annotationLayer]
}

const createRenderer = () =>
  new SimpleRenderer({
    symbol: new SimpleMarkerSymbol({
      color: getSelectedColor(),
      size: SCATTER_SIZE + 2,
      outline: { color: SCATTER_OUTLINE_COLOR, width: SCATTER_OUTLINE_WIDTH },
    }),
  })

const createThematicLayer = (): FeatureLayer | null => {
  const layerUrl = buildLayerUrl(activeServiceUrl.value, activePointLayerId.value)
  if (layerUrl) {
    return new FeatureLayer({
      url: layerUrl,
      outFields: ['*'],
      renderer: createRenderer(),
    })
  }

  // 优先使用 CBDB 真实人物籍贯点；无数据时回退示例点
  const points = realPoints.length > 0 ? realPoints : generateMockPoints(400, activeSourceKey.value)
  const graphics = points.map((item) => {
    const isReal = realPoints.length > 0
    const geometry = new Point({
      x: isReal ? (item as RealPersonPoint).lng : (item as { longitude: number }).longitude,
      y: isReal ? (item as RealPersonPoint).lat : (item as { latitude: number }).latitude,
    })
    return new Graphic({
      geometry,
      attributes: {
        objectId: isReal ? (item as RealPersonPoint).id : (item as { objectId: number }).objectId,
        NAME_CH: item.surname,
        surname: item.surname,
        name: isReal ? (item as RealPersonPoint).personName : '',
        location: isReal ? (item as RealPersonPoint).jiguanName ?? '' : '',
        dynasty: isReal ? (item as RealPersonPoint).dynastyName ?? '' : '',
        year: isReal ? (item as RealPersonPoint).year : 0,
      },
    })
  })
  return new FeatureLayer({
    source: graphics,
    title: realPoints.length > 0 ? '历史人物籍贯（CBDB）' : '人物分布（示例）',
    fields: [
      new Field({ name: 'objectId', type: 'oid' }),
      new Field({ name: 'NAME_CH', type: 'string' }),
      new Field({ name: 'surname', type: 'string' }),
      new Field({ name: 'name', type: 'string' }),
      new Field({ name: 'location', type: 'string' }),
      new Field({ name: 'dynasty', type: 'string' }),
      new Field({ name: 'year', type: 'integer' }),
    ],
    objectIdField: 'objectId',
    geometryType: 'point',
    spatialReference: { wkid: 4326 },
    renderer: createRenderer(),
    ...(realPoints.length > 0 ? { popupTemplate: createPersonPopupTemplate() } : {}),
  })
}

const updateRenderer = () => {
  if (!thematicLayer) {
    return
  }
  thematicLayer.renderer = createRenderer()
}

const resolveLabelField = () => {
  if (!thematicLayer) {
    return null
  }
  const fieldNames = thematicLayer.fields?.map((field) => field.name) ?? []
  const candidates = ['NAME_CH', 'Name', 'name', 'NAME_FT']
  return candidates.find((field) => fieldNames.includes(field)) ?? null
}

const updateLabels = () => {
  if (!thematicLayer) {
    return
  }

  if (!showLabels.value) {
    thematicLayer.labelsVisible = false
    return
  }

  const labelField = resolveLabelField()
  if (!labelField) {
    thematicLayer.labelsVisible = false
    return
  }

  const labelClass = new LabelClass({
    labelExpressionInfo: { expression: `$feature.${labelField}` },
    symbol: new TextSymbol({
      color: '#1d2c3b',
      haloColor: '#ffffff',
      haloSize: 1,
      font: { size: 10, weight: 'bold' },
    }),
  })

  thematicLayer.labelingInfo = [labelClass]
  thematicLayer.labelsVisible = true
}

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

const exportMap = async () => {
  if (!mapView) {
    return
  }

  try {
    const screenshot = await mapView.takeScreenshot({ format: 'png', quality: 100 })
    const link = document.createElement('a')
    link.href = screenshot.dataUrl
    link.download = `thematic-map-${Date.now()}.png`
    link.click()
  } catch (error) {
    console.error('导出失败', error)
    statusMessage.value = '地图导出失败，请稍后重试。'
  }
}

const initializeMap = async () => {
  if (!mapContainer.value) {
    return
  }

  try {
    mapInstance = new ArcGISMap({ layers: createBasemapLayers() })
    mapView = new MapView({
      container: mapContainer.value,
      map: mapInstance,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      constraints: { maxZoom: MAP_MAX_ZOOM },
      popup: new Popup(),
    })

    // 不清空 ui.components——会连带移除 popup 挂载容器导致弹窗空白；默认控件由 CSS 隐藏

    await mapView.when()
    registerSurnameCardAction(mapView)

    realPoints = await fetchRealPersonPoints(activeSourceKey.value)
    thematicLayer = createThematicLayer()
    if (!thematicLayer) {
      statusMessage.value = '未配置图层服务地址。'
      return
    }
    mapInstance.add(thematicLayer)

    sketchLayer = new GraphicsLayer({ title: '标注草图' })
    mapInstance.add(sketchLayer)
    sketchWidget = new Sketch({
      layer: sketchLayer,
      view: mapView,
      creationMode: 'update',
      visibleElements: {
        createTools: { point: true, polyline: true, polygon: true, rectangle: false, circle: false },
        selectionTools: { 'lasso-selection': false, 'rectangle-selection': true },
        settingsMenu: false,
        undoRedoMenu: true,
      },
    })
    mapView.ui.add(sketchWidget, 'top-right')

    await thematicLayer.when()
    updateLabels()

    await mapView.when()
    if (thematicLayer.fullExtent) {
      await safeGoTo(thematicLayer.fullExtent.expand(1.1))
    }

    isReady.value = true
  } catch (error) {
    console.error('专题地图初始化失败', error)
    statusMessage.value = `专题地图初始化失败：${error instanceof Error ? error.message : String(error)}`
  }
}

const resetLayer = async () => {
  if (!mapInstance || !mapView) {
    return
  }

  statusMessage.value = null
  activePointLayerId.value = layerGroup.value.defaultPointLayerId

  if (thematicLayer) {
    mapInstance.remove(thematicLayer)
  }

  realPoints = await fetchRealPersonPoints(activeSourceKey.value)
  thematicLayer = createThematicLayer()
  if (!thematicLayer) {
    statusMessage.value = '未配置图层服务地址。'
    return
  }
  mapInstance.add(thematicLayer)
  await thematicLayer.when()
  updateLabels()
  if (thematicLayer.fullExtent) {
    await safeGoTo(thematicLayer.fullExtent.expand(1.1))
  }
}

watch(selectedColorKey, () => {
  updateRenderer()
})

watch(showLabels, () => {
  updateLabels()
})

watch(activeSourceKey, () => {
  void resetLayer()
})

onMounted(() => {
  void initializeMap()
})

onBeforeUnmount(() => {
  mapView?.destroy()
  mapView = null
  mapInstance = null
  thematicLayer = null
  sketchLayer = null
  sketchWidget = null
})
</script>

<template>
  <div class="thematic-map">
    <div class="thematic-panel">
      <div class="panel-title">专题样式</div>
      <div class="color-grid">
        <button
          v-for="color in THEMATIC_COLORS"
          :key="color.key"
          type="button"
          class="color-swatch"
          :class="{ active: selectedColorKey === color.key }"
          :style="{ background: color.color }"
          @click="selectedColorKey = color.key"
        ></button>
      </div>
      <label class="panel-option">
        <input v-model="showLabels" type="checkbox" />
        <span>显示标注</span>
      </label>
      <label class="panel-option">
        <input v-model="showLegend" type="checkbox" />
        <span>显示图例</span>
      </label>
      <button class="export-btn" type="button" @click="exportMap">导出图片</button>
    </div>

    <div v-if="showLegend" class="legend">
      <div class="legend-title">{{ LEGEND_TITLE }}</div>
      <div class="legend-item">
        <span class="legend-dot" :style="{ background: getSelectedColor() }"></span>
        <span>人物活动点</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: rgba(31, 136, 167, 0.2)"></span>
        <span>手绘标注</span>
      </div>
    </div>

    <div class="map-container" ref="mapContainer"></div>
    <div v-if="statusMessage" class="map-status">{{ statusMessage }}</div>
    <div v-if="!isReady" class="map-loading">专题地图加载中...</div>
  </div>
</template>

<style scoped>
.thematic-map {
  /* 保留 popup（overlay 层），仅隐藏 ArcGIS 默认缩放/指南针等 UI 控件 */
  :deep(.esri-ui-top-left),
  :deep(.esri-ui-top-right),
  :deep(.esri-ui-bottom-left) {
    display: none;
  }

  position: relative;
  height: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--panel-border);
  background: var(--surface-2);
}

.thematic-panel {
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
  min-width: 160px;
}

.panel-title {
  font-size: 12px;
  color: var(--text-muted);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 8px;
  border: 2px solid transparent;
}

.color-swatch.active {
  border-color: rgba(31, 136, 167, 0.6);
}

.panel-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
}

.panel-option input {
  accent-color: var(--accent);
}

.export-btn {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(31, 136, 167, 0.3);
  background: rgba(31, 136, 167, 0.15);
  font-size: 12px;
  color: var(--text-primary);
}

.legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.legend-title {
  font-size: 12px;
  color: var(--text-strong);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.map-container {
  height: 100%;
  width: 100%;
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

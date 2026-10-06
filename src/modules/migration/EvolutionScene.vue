<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import ArcGISMap from '@arcgis/core/Map'
import Graphic from '@arcgis/core/Graphic'
import PopupTemplate from '@arcgis/core/PopupTemplate'
import Point from '@arcgis/core/geometry/Point'
import Polyline from '@arcgis/core/geometry/Polyline'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import WebTileLayer from '@arcgis/core/layers/WebTileLayer'
import LineSymbol3D from '@arcgis/core/symbols/LineSymbol3D'
import LineSymbol3DLayer from '@arcgis/core/symbols/LineSymbol3DLayer'
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol'
import SceneView from '@arcgis/core/views/SceneView'

import {
  MAP_CENTER,
  MAP_ZOOM,
  buildTiandituTileUrl,
  TIANDITU_SUBDOMAIN_LIST,
} from '@/modules/map/constants'
import {
  EVOLUTION_ARROW_ELEVATION_RATIO,
  EVOLUTION_ARROW_MARKER_STYLE,
  EVOLUTION_ARROW_OUTLINE_COLOR,
  EVOLUTION_ARROW_OUTLINE_WIDTH,
  EVOLUTION_ARC_HEIGHT_BASE,
  EVOLUTION_ARC_HEIGHT_RANGE,
  EVOLUTION_AUTO_PLAY_INTERVAL,
  EVOLUTION_ELEVATION_MODE,
  EVOLUTION_SCENE_TILT,
  EVOLUTION_SPATIAL_REFERENCE,
} from '@/modules/evolution/constants'
import { fetchAllMigrationRoutes, fetchMigrationEvents } from '@/modules/migration/api'
import type { MigrationEvent, RouteGroup, RoutePoint } from '@/modules/migration/api'
import {
  DEFAULT_CAUSE_COLOR,
  DEST_POINT_COLOR,
  MACRO_PERIODS,
  MID_POINT_COLOR,
  MIGRATION_CAUSE_COLORS,
  ORIGIN_POINT_COLOR,
  ROUTE_PALETTE,
} from '@/modules/migration/constants'

const mapContainer = ref<HTMLDivElement | null>(null)
const statusMessage = ref<string | null>(null)
const isReady = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const isAutoPlaying = ref(false)

const events = ref<MigrationEvent[]>([])
const routes = ref<RouteGroup[]>([])

const viewMode = ref<'macro' | 'surname'>('macro')
const activePeriodKey = ref('all')
const activeSurname = ref('全部')
const focusKey = ref<string | null>(null)

let sceneView: SceneView | null = null
let mapInstance: ArcGISMap | null = null
let flowLayer: GraphicsLayer | null = null
let playTimer: number | null = null
let graphicIndex = new Map<string, Graphic[]>()

// 宏观事件强度在 CSV 中取值 5-10，归一化到 0-1
const INTENSITY_MIN = 5
const INTENSITY_MAX = 10

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

const periodOptions = computed(() => {
  const options = [{ key: 'all', label: '全部', count: events.value.length }]
  MACRO_PERIODS.forEach((period) => {
    const count = events.value.filter(
      (event) => event.startYear >= period.startYear && event.startYear < period.endYear,
    ).length
    if (count > 0) {
      options.push({ key: period.key, label: period.label, count })
    }
  })
  return options
})

const visibleEvents = computed(() => {
  if (activePeriodKey.value === 'all') {
    return events.value
  }
  const period = MACRO_PERIODS.find((item) => item.key === activePeriodKey.value)
  if (!period) {
    return events.value
  }
  return events.value.filter(
    (event) => event.startYear >= period.startYear && event.startYear < period.endYear,
  )
})

const surnameOptions = computed(() => {
  const set = new Set(routes.value.map((route) => route.surname))
  return ['全部', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))]
})

const visibleRoutes = computed(() =>
  activeSurname.value === '全部'
    ? routes.value
    : routes.value.filter((route) => route.surname === activeSurname.value),
)

const causeLegend = computed(() => {
  const causes = new Set(visibleEvents.value.map((event) => event.cause))
  return Array.from(causes).map((cause) => ({
    label: cause,
    color: MIGRATION_CAUSE_COLORS[cause] ?? DEFAULT_CAUSE_COLOR,
  }))
})

const totalIntensity = computed(() =>
  visibleEvents.value.reduce((sum, event) => sum + event.intensity, 0),
)

const activePeriodLabel = computed(
  () => periodOptions.value.find((item) => item.key === activePeriodKey.value)?.label ?? '全部',
)

const getCauseColor = (cause: string) => MIGRATION_CAUSE_COLORS[cause] ?? DEFAULT_CAUSE_COLOR

// 负数年份 = 公元前，展示时转成中文纪年
const formatYear = (year: number) => (year < 0 ? `公元前${-year}年` : `${year}年`)
const formatYearRange = (start: number, end: number) => `${formatYear(start)}—${formatYear(end)}`

const getHeading = (from: { lng: number; lat: number }, to: { lng: number; lat: number }) => {
  const deltaX = to.lng - from.lng
  const deltaY = to.lat - from.lat
  const radians = Math.atan2(deltaX, deltaY)
  return (radians * 180) / Math.PI
}

const eventPopupTemplate = new PopupTemplate({
  title: '{name}',
  content: [
    {
      type: 'fields',
      fieldInfos: [
        { fieldName: 'fromTo', label: '迁徙路线' },
        { fieldName: 'years', label: '年代' },
        { fieldName: 'cause', label: '原因' },
        { fieldName: 'scale', label: '规模' },
        { fieldName: 'surnames', label: '涉及姓氏' },
        { fieldName: 'desc', label: '说明' },
        { fieldName: 'sourceRef', label: '史料出处' },
      ],
    },
  ],
})

const routePopupTemplate = new PopupTemplate({
  title: '{title}',
  content: [
    {
      type: 'fields',
      fieldInfos: [
        { fieldName: 'event', label: '迁徙事件' },
        { fieldName: 'path', label: '路线' },
        { fieldName: 'desc', label: '说明' },
        { fieldName: 'sourceRef', label: '史料出处' },
      ],
    },
  ],
})

const buildEventGraphics = (event: MigrationEvent): Graphic[] => {
  const ratio = Math.min(
    1,
    Math.max(0, (event.intensity - INTENSITY_MIN) / (INTENSITY_MAX - INTENSITY_MIN)),
  )
  const arcHeight = EVOLUTION_ARC_HEIGHT_BASE + EVOLUTION_ARC_HEIGHT_RANGE * ratio
  const midLng = (event.fromLng + event.toLng) / 2
  const midLat = (event.fromLat + event.toLat) / 2
  const color = getCauseColor(event.cause)
  const key = `e${event.id}`
  const attributes = {
    key,
    name: event.name,
    fromTo: `${event.fromRegion} → ${event.toRegion}`,
    years: `${formatYearRange(event.startYear, event.endYear)}（${event.era}）`,
    cause: event.cause,
    scale: event.scale ?? '',
    surnames: event.surnames ?? '',
    desc: event.description ?? '',
    sourceRef: event.sourceRef ?? '',
  }

  const line = new Graphic({
    geometry: new Polyline({
      paths: [
        [
          [event.fromLng, event.fromLat, 0],
          [midLng, midLat, arcHeight],
          [event.toLng, event.toLat, 0],
        ],
      ],
      spatialReference: EVOLUTION_SPATIAL_REFERENCE,
      hasZ: true,
    }),
    symbol: new LineSymbol3D({
      symbolLayers: [
        new LineSymbol3DLayer({
          material: { color },
          size: 2 + ratio * 3,
          cap: 'round',
          join: 'round',
        }),
      ],
    }),
    attributes,
    popupTemplate: eventPopupTemplate,
  })

  const arrow = new Graphic({
    geometry: new Point({
      longitude: event.toLng,
      latitude: event.toLat,
      z: arcHeight * EVOLUTION_ARROW_ELEVATION_RATIO,
      spatialReference: EVOLUTION_SPATIAL_REFERENCE,
    }),
    symbol: new SimpleMarkerSymbol({
      style: EVOLUTION_ARROW_MARKER_STYLE,
      color,
      size: 12 + ratio * 8,
      angle: getHeading({ lng: event.fromLng, lat: event.fromLat }, { lng: event.toLng, lat: event.toLat }),
      outline: new SimpleLineSymbol({
        color: EVOLUTION_ARROW_OUTLINE_COLOR,
        width: EVOLUTION_ARROW_OUTLINE_WIDTH,
      }),
    }),
    attributes,
    popupTemplate: eventPopupTemplate,
  })

  const origin = new Graphic({
    geometry: new Point({
      longitude: event.fromLng,
      latitude: event.fromLat,
      spatialReference: EVOLUTION_SPATIAL_REFERENCE,
    }),
    symbol: new SimpleMarkerSymbol({
      style: 'circle',
      color: ORIGIN_POINT_COLOR,
      size: 8,
      outline: { color: '#ffffff', width: 0.8 },
    }),
    attributes,
    popupTemplate: eventPopupTemplate,
  })

  return [line, arrow, origin]
}

const routePathLabel = (points: RoutePoint[]) =>
  points.map((point) => point.placeOld || point.placeNew).filter(Boolean).join(' → ')

const buildRouteGraphics = (route: RouteGroup, colorIndex: number): Graphic[] => {
  const color = ROUTE_PALETTE[colorIndex % ROUTE_PALETTE.length]
  const key = `r${route.routeId}`
  const attributes = {
    key,
    title: `${route.surname}氏 · ${route.dynasty}`,
    event: route.event,
    path: routePathLabel(route.points),
    desc: route.description ?? '',
    sourceRef: route.sourceRef ?? '',
  }

  const graphics: Graphic[] = []
  if (route.points.length >= 2) {
    graphics.push(
      new Graphic({
        geometry: new Polyline({
          paths: [route.points.map((point) => [point.lng, point.lat, 0])],
          spatialReference: EVOLUTION_SPATIAL_REFERENCE,
          hasZ: true,
        }),
        symbol: new LineSymbol3D({
          symbolLayers: [
            new LineSymbol3DLayer({
              material: { color },
              size: 3,
              cap: 'round',
              join: 'round',
            }),
          ],
        }),
        attributes,
        popupTemplate: routePopupTemplate,
      }),
    )
  }

  route.points.forEach((point, index) => {
    const isOrigin = index === 0
    const isDest = index === route.points.length - 1
    const pointColor = isOrigin ? ORIGIN_POINT_COLOR : isDest ? DEST_POINT_COLOR : MID_POINT_COLOR
    graphics.push(
      new Graphic({
        geometry: new Point({
          longitude: point.lng,
          latitude: point.lat,
          spatialReference: EVOLUTION_SPATIAL_REFERENCE,
        }),
        symbol: new SimpleMarkerSymbol({
          style: isDest && !isOrigin ? 'triangle' : 'circle',
          color: pointColor,
          size: isOrigin || isDest ? 10 : 6,
          angle: isDest && !isOrigin ? 0 : undefined,
          outline: { color: '#ffffff', width: 0.8 },
        }),
        attributes: {
          ...attributes,
          path: point.placeOld || point.placeNew,
        },
        popupTemplate: routePopupTemplate,
      }),
    )
  })

  return graphics
}

const renderFlows = () => {
  if (!flowLayer) {
    return
  }
  try {
    flowLayer.removeAll()
    graphicIndex = new Map<string, Graphic[]>()
    const allGraphics: Graphic[] = []

    if (viewMode.value === 'macro') {
      visibleEvents.value.forEach((event) => {
        const graphics = buildEventGraphics(event)
        graphicIndex.set(`e${event.id}`, graphics)
        allGraphics.push(...graphics)
      })
    } else {
      visibleRoutes.value.forEach((route, index) => {
        const graphics = buildRouteGraphics(route, index)
        graphicIndex.set(`r${route.routeId}`, graphics)
        allGraphics.push(...graphics)
      })
    }

    flowLayer.addMany(allGraphics)
    statusMessage.value = allGraphics.length === 0 ? '当前筛选下暂无可绘制的迁徙路径。' : null
  } catch (error) {
    console.error('迁徙路径绘制失败', error)
    statusMessage.value = '迁徙路径绘制失败，请稍后重试。'
  }
}

const focusGraphic = (key: string) => {
  focusKey.value = key
  const graphics = graphicIndex.get(key)
  const line = graphics?.[0]
  if (!sceneView || !line?.geometry) {
    return
  }
  void sceneView.goTo({ target: line.geometry, zoom: 4, tilt: 45 }).catch(() => undefined)
  sceneView.popup?.open({ features: [line] })
}

const stepOption = (direction: number) => {
  if (viewMode.value === 'macro') {
    const keys = periodOptions.value.filter((item) => item.key !== 'all').map((item) => item.key)
    const current = keys.indexOf(activePeriodKey.value)
    const index = current < 0 ? 0 : (current + direction + keys.length) % keys.length
    activePeriodKey.value = keys[index] ?? 'all'
  } else {
    const names = surnameOptions.value.filter((name) => name !== '全部')
    const current = names.indexOf(activeSurname.value)
    const index = current < 0 ? 0 : (current + direction + names.length) % names.length
    activeSurname.value = names[index] ?? '全部'
  }
}

const toggleAutoPlay = () => {
  isAutoPlaying.value = !isAutoPlaying.value
}

const updateAutoPlay = () => {
  if (playTimer !== null) {
    window.clearInterval(playTimer)
    playTimer = null
  }
  if (isAutoPlaying.value) {
    playTimer = window.setInterval(() => stepOption(1), EVOLUTION_AUTO_PLAY_INTERVAL)
  }
}

const initializeScene = async () => {
  if (!mapContainer.value) {
    return
  }
  try {
    mapInstance = new ArcGISMap({ layers: createBasemapLayers() })
    flowLayer = new GraphicsLayer({
      title: '迁徙路径',
      elevationInfo: { mode: EVOLUTION_ELEVATION_MODE },
    })
    mapInstance.add(flowLayer)

    sceneView = new SceneView({
      container: mapContainer.value,
      map: mapInstance,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
    })
    sceneView.ui.components = []

    await sceneView.when()
    await sceneView.goTo({ center: MAP_CENTER, zoom: MAP_ZOOM, tilt: EVOLUTION_SCENE_TILT })
    isReady.value = true
  } catch (error) {
    console.error('迁徙场景初始化失败', error)
    statusMessage.value = '三维场景初始化失败，请检查配置。'
  }
}

const loadData = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    const [eventList, routeList] = await Promise.all([
      fetchMigrationEvents(),
      fetchAllMigrationRoutes(),
    ])
    events.value = eventList
    routes.value = routeList
    renderFlows()
  } catch (error) {
    console.error('迁徙数据加载失败', error)
    errorMessage.value = '迁徙数据加载失败'
  } finally {
    isLoading.value = false
  }
}

watch(viewMode, () => {
  focusKey.value = null
  renderFlows()
})
watch(activePeriodKey, () => renderFlows())
watch(activeSurname, () => renderFlows())
watch(isAutoPlaying, () => updateAutoPlay())

onMounted(() => {
  void initializeScene().then(() => {
    void loadData()
  })
})

onBeforeUnmount(() => {
  if (playTimer !== null) {
    window.clearInterval(playTimer)
    playTimer = null
  }
  sceneView?.destroy()
  sceneView = null
  mapInstance = null
  flowLayer = null
})
</script>

<template>
  <div class="evolution-scene">
    <div class="scene-toolbar">
      <div class="mode-switch">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: viewMode === 'macro' }"
          @click="viewMode = 'macro'"
        >
          宏观迁徙事件
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: viewMode === 'surname' }"
          @click="viewMode = 'surname'"
        >
          姓氏迁徙路线
        </button>
      </div>

      <div class="toolbar-title">
        {{ viewMode === 'macro' ? `历史时期（${events.length} 起事件）` : `姓氏（${routes.length} 条路线）` }}
      </div>
      <div class="chip-list">
        <template v-if="viewMode === 'macro'">
          <button
            v-for="option in periodOptions"
            :key="option.key"
            type="button"
            class="chip"
            :class="{ active: activePeriodKey === option.key }"
            @click="activePeriodKey = option.key"
          >
            {{ option.label }}<em>{{ option.count }}</em>
          </button>
        </template>
        <template v-else>
          <button
            v-for="name in surnameOptions"
            :key="name"
            type="button"
            class="chip"
            :class="{ active: activeSurname === name }"
            @click="activeSurname = name"
          >
            {{ name }}
          </button>
        </template>
      </div>

      <div class="toolbar-controls">
        <button class="control-btn" type="button" @click="stepOption(-1)">上一阶段</button>
        <button class="control-btn primary" type="button" @click="toggleAutoPlay">
          {{ isAutoPlaying ? '暂停播放' : '自动播放' }}
        </button>
        <button class="control-btn" type="button" @click="stepOption(1)">下一阶段</button>
      </div>
    </div>

    <div class="scene-legend">
      <div class="legend-title">{{ viewMode === 'macro' ? '迁徙原因' : '图例' }}</div>
      <div class="legend-list">
        <template v-if="viewMode === 'macro'">
          <div v-for="item in causeLegend" :key="item.label" class="legend-item">
            <span class="legend-line" :style="{ background: item.color }"></span>
            <span>{{ item.label }}</span>
          </div>
        </template>
        <template v-else>
          <div class="legend-item">
            <span class="legend-dot" :style="{ background: ORIGIN_POINT_COLOR }"></span>
            <span>迁出地</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot tri" :style="{ background: DEST_POINT_COLOR }"></span>
            <span>迁入地</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" :style="{ background: MID_POINT_COLOR }"></span>
            <span>途经点</span>
          </div>
        </template>
      </div>
    </div>

    <div class="scene-summary">
      <div class="summary-header">
        <div>
          <h4>{{ viewMode === 'macro' ? activePeriodLabel : activeSurname === '全部' ? '全部姓氏' : `${activeSurname}氏` }}</h4>
          <p>{{ viewMode === 'macro' ? '宏观人口迁徙事件' : '家族郡望迁徙路线' }}</p>
        </div>
      </div>
      <div class="summary-metrics">
        <div class="metric">
          <span>{{ viewMode === 'macro' ? '迁徙事件' : '迁徙路线' }}</span>
          <strong>{{ viewMode === 'macro' ? visibleEvents.length : visibleRoutes.length }}</strong>
        </div>
        <div v-if="viewMode === 'macro'" class="metric">
          <span>强度总计</span>
          <strong>{{ totalIntensity }}</strong>
        </div>
        <div v-else class="metric">
          <span>涉及姓氏</span>
          <strong>{{ new Set(visibleRoutes.map((r) => r.surname)).size }}</strong>
        </div>
      </div>

      <div v-if="viewMode === 'macro'" class="flow-list">
        <div
          v-for="event in visibleEvents"
          :key="event.id"
          class="flow-item"
          :class="{ active: focusKey === `e${event.id}` }"
          @click="focusGraphic(`e${event.id}`)"
        >
          <div class="flow-top">
            <span class="flow-surname">{{ event.name }}</span>
            <span class="flow-intensity" :style="{ color: getCauseColor(event.cause) }">{{ event.cause }}</span>
          </div>
          <div class="flow-route">{{ event.fromRegion }} → {{ event.toRegion }}</div>
          <div class="flow-note">{{ event.era }} · {{ formatYearRange(event.startYear, event.endYear) }} · 强度{{ event.intensity }}</div>
        </div>
      </div>
      <div v-else class="flow-list">
        <div
          v-for="route in visibleRoutes"
          :key="route.routeId"
          class="flow-item"
          :class="{ active: focusKey === `r${route.routeId}` }"
          @click="focusGraphic(`r${route.routeId}`)"
        >
          <div class="flow-top">
            <span class="flow-surname">{{ route.surname }}氏 · {{ route.dynasty }}</span>
          </div>
          <div class="flow-route">{{ routePathLabel(route.points) }}</div>
          <div class="flow-note">{{ route.event }}</div>
        </div>
      </div>
    </div>

    <div class="scene-container" ref="mapContainer"></div>
    <div v-if="statusMessage" class="scene-status">{{ statusMessage }}</div>
    <div v-if="errorMessage" class="scene-status is-error">{{ errorMessage }}</div>
    <div v-if="isLoading" class="scene-status is-info">迁徙数据加载中...</div>
    <div v-if="!isReady" class="scene-loading">三维场景加载中...</div>
  </div>
</template>

<style scoped>
.evolution-scene {
  position: relative;
  height: 100%;
  min-height: 620px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--panel-border);
  background: var(--surface-2);
}

.scene-container {
  height: 100%;
  width: 100%;
}

.scene-toolbar,
.scene-legend,
.scene-summary {
  position: absolute;
  z-index: 10;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 12px;
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 10px;
}

.scene-toolbar {
  top: 16px;
  left: 16px;
  width: 250px;
}

.scene-legend {
  top: 16px;
  right: 16px;
  width: 150px;
}

.scene-summary {
  right: 16px;
  bottom: 16px;
  width: 270px;
  max-height: 70%;
  overflow: auto;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.mode-btn {
  padding: 7px 6px;
  border-radius: 10px;
  border: 1px solid rgba(95, 111, 130, 0.25);
  background: var(--surface-3);
  font-size: 12px;
  color: var(--text-muted);
}

.mode-btn.active {
  border-color: rgba(31, 136, 167, 0.4);
  background: rgba(31, 136, 167, 0.18);
  color: var(--text-primary);
  font-weight: 600;
}

.toolbar-title,
.legend-title {
  font-size: 12px;
  color: var(--text-muted);
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 170px;
  overflow: auto;
  padding-right: 2px;
}

.chip {
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid rgba(95, 111, 130, 0.25);
  background: var(--surface-2);
  font-size: 12px;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chip em {
  font-style: normal;
  font-size: 10px;
  opacity: 0.75;
}

.chip.active {
  border-color: rgba(31, 136, 167, 0.4);
  background: rgba(31, 136, 167, 0.18);
  color: var(--text-primary);
}

.toolbar-controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
}

.control-btn {
  padding: 6px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid rgba(95, 111, 130, 0.25);
  font-size: 12px;
  color: var(--text-muted);
}

.control-btn.primary {
  border-color: rgba(31, 136, 167, 0.35);
  background: rgba(31, 136, 167, 0.18);
  color: var(--text-primary);
}

.legend-list {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.legend-dot.tri {
  border-radius: 2px;
  transform: rotate(45deg);
}

.legend-line {
  width: 16px;
  height: 3px;
  border-radius: 2px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.summary-header h4 {
  margin: 0 0 6px;
  font-size: 14px;
}

.summary-header p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.summary-metrics {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.metric {
  display: flex;
  justify-content: space-between;
}

.metric strong {
  color: var(--text-strong);
}

.flow-list {
  display: grid;
  gap: 8px;
}

.flow-item {
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(31, 136, 167, 0.12);
  background: rgba(255, 255, 255, 0.7);
  display: grid;
  gap: 4px;
  cursor: pointer;
}

.flow-item:hover,
.flow-item.active {
  border-color: rgba(31, 136, 167, 0.45);
  background: rgba(31, 136, 167, 0.1);
}

.flow-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.flow-surname {
  color: var(--text-strong);
  font-weight: 600;
}

.flow-intensity {
  font-weight: 600;
  white-space: nowrap;
}

.flow-route {
  font-size: 12px;
  color: var(--text-primary);
}

.flow-note {
  font-size: 11px;
  color: var(--text-muted);
}

.scene-status {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  background: rgba(255, 232, 232, 0.92);
  color: #9b2c2c;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(198, 72, 59, 0.3);
  font-size: 12px;
  max-width: 45%;
}

.scene-status.is-error {
  background: rgba(255, 224, 224, 0.95);
}

.scene-status.is-info {
  background: rgba(31, 136, 167, 0.14);
  color: #1f6f93;
  border-color: rgba(31, 136, 167, 0.2);
}

.scene-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  color: var(--text-primary);
  backdrop-filter: blur(2px);
}

@media (max-width: 960px) {
  .evolution-scene {
    display: grid;
    gap: 12px;
    padding: 12px;
  }

  .scene-toolbar,
  .scene-legend,
  .scene-summary {
    position: static;
    width: auto;
    max-height: none;
  }

  .scene-container {
    min-height: 420px;
  }
}
</style>

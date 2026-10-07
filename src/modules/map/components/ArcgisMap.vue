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
import OpacityVariable from '@arcgis/core/renderers/visualVariables/OpacityVariable'
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
import {
  BOUNDARY_YEAR_THROTTLE_MS,
  buildBoundaryYearExpression,
  CHGIS_BOUNDARY_URL,
} from '@/modules/map/chgisTimeBoundary'
import { getEffectiveLayerGroup } from '@/modules/map/layerDefinitions'
import { getMapSourceByKey } from '@/modules/map/dataSources'
import { generateMockPoints } from '@/modules/map/mockPoints'
import { buildPersonGeoNote, createPersonPopupTemplate, fetchRealPersonPoints, registerSurnameCardAction, type RealPersonPoint } from '@/modules/map/realPoints'
import { SURNAME_MOD_BASE, SURNAME_OPTIONS } from '@/modules/map/surnameOptions'
import TimeAxis from '@/modules/timeline/components/TimeAxis.vue'
import {
  PLAY_HIGHLIGHT_WINDOW,
  YEAR_FILTER_THROTTLE_MS,
  YEAR_OPACITY_THROTTLE_MS,
} from '@/modules/timeline/eras'
import { useMapSourceStore } from '@/stores/mapSource'
import { useTimeTravelStore } from '@/stores/timeTravel'

const renderOptions = [
  { id: 'scatter', label: '散点图' },
  { id: 'heatmap', label: '热力图' },
  { id: 'cluster', label: '聚合图' },
] as const

type RenderMode = (typeof renderOptions)[number]['id']

const mapSourceStore = useMapSourceStore()
const timeTravelStore = useTimeTravelStore()
const activeMode = ref<RenderMode>('scatter')
const activeSourceKey = computed(() => mapSourceStore.activeSourceKey)
// 时间轴连续渐变只在纯本地 GeoJSON 模式启用；一旦配置了 ArcGIS 在线服务，
// 图层目录随朝代变化，降级为旧的整体 reload（无渐变）
const timelineEnabled = mapSourceStore.sources.every((source) => !source.serviceUrl)
const activeServiceUrl = computed(() => mapSourceStore.activeServiceUrl)
const activeGeoJsonPath = computed(() => mapSourceStore.activeGeoJsonPath)
// 无 ArcGIS 在线服务时自动收敛为本地单点/单边，保证图层选择器名实相符
const layerGroup = computed(() =>
  getEffectiveLayerGroup(
    activeSourceKey.value,
    Boolean(activeServiceUrl.value),
    mapSourceStore.activeSource?.label,
  ),
)
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

// ---- 时空轴：边界 crossfade（静态朝代边界的降级路径）----
const BOUNDARY_TARGET_OPACITY = 0.9
const BOUNDARY_CROSSFADE_MS = 320
// 边界切换代际：快速拖过多个朝代时，旧动画自动作废，只有最后一次切换收尾
let boundaryGeneration = 0

// ---- 时空轴：CHGIS V6 时间切片边界（单层常驻，按年过滤）----
let timeBoundaryLayer: GeoJSONLayer | null = null
let boundaryYearTimer = 0

// ---- 时空轴：人物点渐变的节流定时器 ----
let yearFilterTimer = 0
let yearOpacityTimer = 0
let lastOpacityUpdateAt = 0


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
      title: title.includes('历史人物籍贯') ? title : `${title}（历史人物籍贯）`,
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

const createBoundaryLayer = (
  layerId: number,
  title: string,
  isVisible: boolean,
  geoJsonUrlOverride?: string | null,
) => {
  const url = buildLayerUrl(activeServiceUrl.value, layerId)
  if (url) {
    return new FeatureLayer({
      url,
      title,
      renderer: createBoundaryRenderer(),
      popupEnabled: false,
      visible: isVisible,
      opacity: BOUNDARY_TARGET_OPACITY,
    })
  }

  // 时间轴 crossfade 时由调用方显式指定目标朝代的 GeoJSON；
  // 否则沿用当前激活数据源（初始化 / 在线模式 reload）
  const geoJsonUrl =
    geoJsonUrlOverride === undefined ? activeGeoJsonPath.value : geoJsonUrlOverride

  // 未配置 ArcGIS 服务地址时，使用本地 GeoJSON 边界数据
  if (geoJsonUrl) {
    return new GeoJSONLayer({
      url: geoJsonUrl,
      title: `${title}（GeoJSON）`,
      renderer: createBoundaryRenderer(),
      popupEnabled: false,
      visible: isVisible,
      opacity: BOUNDARY_TARGET_OPACITY,
    })
  }

  return null
}

/**
 * CHGIS V6 时间切片边界：全部 3830 个政区一次装载，
 * 用 BEG_YR / END_YR 存续区间按当前年份过滤，逐年连续演化。
 */
const createTimeSliceBoundaryLayer = (title: string, isVisible: boolean) =>
  new GeoJSONLayer({
    url: CHGIS_BOUNDARY_URL,
    title: `${title}（CHGIS V6）`,
    renderer: createBoundaryRenderer(),
    popupEnabled: false,
    visible: isVisible,
    opacity: BOUNDARY_TARGET_OPACITY,
    definitionExpression: buildBoundaryYearExpression(timeTravelStore.currentYear),
  })

const applyBoundaryYearExpression = () => {
  if (!timeBoundaryLayer) {
    return
  }
  timeBoundaryLayer.definitionExpression = buildBoundaryYearExpression(
    timeTravelStore.currentYear,
  )
}

/** 播放/拖动时节流更新边界年份过滤（约 8 次/秒，与 3830 要素客户端重查匹配） */
const scheduleBoundaryYear = () => {
  if (!timeBoundaryLayer) {
    return
  }
  window.clearTimeout(boundaryYearTimer)
  boundaryYearTimer = window.setTimeout(
    applyBoundaryYearExpression,
    BOUNDARY_YEAR_THROTTLE_MS,
  )
}

/**
 * 时间切片资产加载失败（404/解析失败）时降级：
 * 摘除时间层，回到按朝代 crossfade 的静态 GeoJSON 路径
 */
const handleTimeBoundaryFailure = () => {
  if (!timeBoundaryLayer || !mapInstance) {
    return
  }
  console.warn('[边界图层] CHGIS 时间切片资产加载失败，降级为静态朝代边界')
  mapInstance.remove(timeBoundaryLayer)
  boundaryLayerMap.clear()
  timeBoundaryLayer = null
  // layerview-create-error 会写错误提示条，降级成功后清掉
  statusMessage.value = null
  void swapBoundaryLayers(false)
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

/**
 * 统一写入点图层 definitionExpression：
 * - 时空轴模式的真实人物层始终叠加 year <= 当前年（只呈现"已出生"的人物）
 * - 热力图模式再叠加姓氏条件（真实点用字段，示例点用 ObjectId 取模）
 */
const applySurnameFilter = () => {
  if (!activePointLayer) {
    return
  }

  const parts: string[] = []
  const layer = activePointLayer
  const isRealData = realDataLayers.has(layer)

  if (isRealData && timelineEnabled) {
    parts.push(`year <= ${Math.round(timeTravelStore.currentYear)}`)
  }

  if (activeMode.value === 'heatmap') {
    const option = SURNAME_OPTIONS.find((item) => item.key === activeSurnameKey.value)
    if (option && option.key !== 'all') {
      // 真实人物点带真实姓氏字段，直接按姓氏筛选；示例数据才用 ObjectId 取模
      if (isRealData) {
        parts.push(`surname = '${option.label}'`)
      } else if (option.modValue !== undefined) {
        const oidField = getActivePointOidField()
        parts.push(`MOD(${oidField}, ${SURNAME_MOD_BASE}) = ${option.modValue}`)
      }
    }
  }

  layer.definitionExpression = parts.join(' AND ')
}

/**
 * 播放中：给散点层加 opacity 视觉变量——靠近当前年的人物最亮，
 * 越早（超出高光窗口）的人物越暗淡，形成"新人物浮现、历史沉淀"的渐变。
 * 暂停/停止后移除视觉变量，已出生人物恢复全亮。
 */
const applyTimeOpacity = () => {
  const layer = activePointLayer
  if (!layer || !realDataLayers.has(layer) || !timelineEnabled) {
    return
  }
  if (activeMode.value !== 'scatter') {
    return
  }

  const renderer = layer.renderer as SimpleRenderer
  if (timeTravelStore.isPlaying) {
    const currentYear = Math.round(timeTravelStore.currentYear)
    renderer.visualVariables = [
      new OpacityVariable({
        field: 'year',
        stops: [
          { value: currentYear - PLAY_HIGHLIGHT_WINDOW, opacity: 0.15 },
          { value: currentYear, opacity: 1 },
        ],
      }),
    ]
  } else if (renderer.visualVariables?.length) {
    renderer.visualVariables = []
  }
}

/** 年份推进（拖动 / 播放帧）时的节流调度：opacity 高频、过滤低频 */
const scheduleYearVisuals = () => {
  if (!timelineEnabled || !isReady.value) {
    return
  }

  const now = performance.now()
  if (now - lastOpacityUpdateAt >= YEAR_OPACITY_THROTTLE_MS) {
    applyTimeOpacity()
    lastOpacityUpdateAt = now
  } else {
    window.clearTimeout(yearOpacityTimer)
    yearOpacityTimer = window.setTimeout(() => {
      applyTimeOpacity()
      lastOpacityUpdateAt = performance.now()
    }, YEAR_OPACITY_THROTTLE_MS)
  }

  window.clearTimeout(yearFilterTimer)
  yearFilterTimer = window.setTimeout(applySurnameFilter, YEAR_FILTER_THROTTLE_MS)
}

const applyYearVisualsImmediately = () => {
  if (!timelineEnabled) {
    return
  }
  window.clearTimeout(yearOpacityTimer)
  window.clearTimeout(yearFilterTimer)
  lastOpacityUpdateAt = performance.now()
  applyTimeOpacity()
  applySurnameFilter()
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
  // 重建 renderer 会丢失 opacity 视觉变量，播放中切回散点要立即恢复
  applyTimeOpacity()
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

    mapView.on('layerview-create-error', (event) => {
      const layerTitle = (event.layer?.title as string | undefined) ?? '未知图层'
      const reason =
        (event.error && 'message' in event.error ? String(event.error.message) : '') ||
        '请检查访问权限或图层地址'
      console.error('[图层加载失败]', layerTitle, event.error)
      statusMessage.value = `图层加载失败（${layerTitle}）：${reason}`
    })

    resetBoundaryVisibility()
    const resolvedPointId = resolvePointLayerId(activePointLayerId.value)
    activePointLayerId.value = resolvedPointId

    // 时空轴模式：一次性装载跨朝代全量人物点（约 3000 条），
    // 之后按生年在客户端做时间过滤，朝代切换不再重建点层
    realPoints = timelineEnabled
      ? await fetchRealPersonPoints()
      : await fetchRealPersonPoints(activeSourceKey.value)

    if (timelineEnabled && boundaryLayerDefinitions.value.length > 0) {
      // 时间轴模式：CHGIS V6 时间切片单层常驻（挂到首个边界定义 id 下，
      // 复用图层面板的显隐勾选）；加载失败再降级为静态朝代边界
      const primaryDefinition = boundaryLayerDefinitions.value[0]
      const timeLayer = createTimeSliceBoundaryLayer(
        primaryDefinition.label,
        boundaryVisibility[primaryDefinition.id] ?? false,
      )
      mapInstance?.add(timeLayer)
      boundaryLayerMap.set(primaryDefinition.id, timeLayer)
      timeBoundaryLayer = timeLayer
      timeLayer.when().catch(handleTimeBoundaryFailure)
    } else {
      boundaryLayerDefinitions.value.forEach((definition) => {
        const isVisible = boundaryVisibility[definition.id] ?? false
        const layer = createBoundaryLayer(definition.id, definition.label, isVisible)
        if (layer) {
          mapInstance?.add(layer)
          boundaryLayerMap.set(definition.id, layer)
        }
      })
    }

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
    // 按时间轴初始年份（当前朝代代表年）过滤人物点
    applyYearVisualsImmediately()
  } catch (error) {
    console.error('地图初始化失败', error)
    statusMessage.value = '地图初始化失败，请检查配置。'
  }
}

/**
 * 时空轴朝代切换：边界层 crossfade（旧层淡出、新层淡入），点层不动。
 * eraKey 为 null（秦~隋、五代等暂无边界数据的时代）时只淡出旧层。
 * @param animate false 用于首装（直接就位，无动画）
 */
const swapBoundaryLayers = async (animate: boolean) => {
  if (!mapInstance) {
    return
  }

  const eraKey = timelineEnabled ? timeTravelStore.currentEra.sourceKey : null
  const geoJsonUrl = eraKey ? (getMapSourceByKey(eraKey)?.geoJsonPath ?? null) : null

  const outgoingLayers = [...boundaryLayerMap.values()]

  // 先创建并加入新层（淡入起点 opacity=0），再移除旧层引用
  const incomingLayers: Array<FeatureLayer | GeoJSONLayer> = []
  boundaryLayerDefinitions.value.forEach((definition) => {
    const isVisible = boundaryVisibility[definition.id] ?? false
    const layer = timelineEnabled
      ? geoJsonUrl
        ? createBoundaryLayer(definition.id, definition.label, isVisible, geoJsonUrl)
        : null
      : createBoundaryLayer(definition.id, definition.label, isVisible)

    if (layer) {
      layer.opacity = animate ? 0 : BOUNDARY_TARGET_OPACITY
      mapInstance?.add(layer)
      boundaryLayerMap.set(definition.id, layer)
      if (isVisible) {
        incomingLayers.push(layer)
      }
    }
  })

  if (!animate) {
    outgoingLayers.forEach((layer) => mapInstance?.remove(layer))
    return
  }

  const generation = ++boundaryGeneration
  // 等新边界数据就绪再开始动画，避免"空窗闪烁"
  if (incomingLayers.length > 0) {
    try {
      await Promise.all(incomingLayers.map((layer) => layer.when()))
    } catch (error) {
      console.warn('[边界图层] 新朝代边界加载失败', error)
    }
  }
  // 快速拖过多个朝代时，本次切换已被更新的一代取代：
  // 自己的旧层仍需摘走（新一代只接管它创建时在册的层），动画由新一代完成
  if (generation !== boundaryGeneration) {
    outgoingLayers.forEach((layer) => mapInstance?.remove(layer))
    return
  }

  await new Promise<void>((resolve) => {
    const startAt = performance.now()
    const frame = (now: number) => {
      if (generation !== boundaryGeneration) {
        outgoingLayers.forEach((layer) => mapInstance?.remove(layer))
        resolve()
        return
      }
      const progress = Math.min(1, (now - startAt) / BOUNDARY_CROSSFADE_MS)
      const eased = 1 - (1 - progress) * (1 - progress)
      outgoingLayers.forEach((layer) => {
        layer.opacity = BOUNDARY_TARGET_OPACITY * (1 - eased)
      })
      incomingLayers.forEach((layer) => {
        layer.opacity = BOUNDARY_TARGET_OPACITY * eased
      })

      if (progress < 1) {
        requestAnimationFrame(frame)
      } else {
        outgoingLayers.forEach((layer) => mapInstance?.remove(layer))
        resolve()
      }
    }
    requestAnimationFrame(frame)
  })
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

if (timelineEnabled) {
  // 本地时空轴模式：CHGIS 时间切片层按年连续过滤，朝代变化无需换层；
  // 仅在时间切片资产不可用（降级）时才按朝代 crossfade 静态边界
  watch(
    () => timeTravelStore.currentEra.sourceKey,
    (key, previousKey) => {
      if (timeBoundaryLayer || key === previousKey || !mapInstance || pointLayerMap.size === 0) {
        return
      }
      void swapBoundaryLayers(true)
    },
  )

  // 年份推进：政区边界按年过滤 + 人物点按生年渐变浮现（均节流）
  watch(
    () => timeTravelStore.currentYear,
    () => {
      scheduleBoundaryYear()
      scheduleYearVisuals()
    },
  )

  // 播放开始/停止：停止瞬间立即同步最终年份（补齐节流尾部），人物点恢复全亮
  watch(
    () => timeTravelStore.isPlaying,
    () => {
      applyBoundaryYearExpression()
      applyYearVisualsImmediately()
    },
  )
} else {
  // 在线服务模式降级路径：图层目录随朝代变化，整体重建（无时间渐变）
  watch(activeSourceKey, () => {
    activePointLayerId.value = layerGroup.value.defaultPointLayerId
    void reloadLayers()
  })
}

watch(activeSurnameKey, () => {
  if (pointLayerMap.size === 0) {
    return
  }
  applySurnameFilter()
})

onBeforeUnmount(() => {
  window.clearTimeout(yearFilterTimer)
  window.clearTimeout(yearOpacityTimer)
  window.clearTimeout(boundaryYearTimer)
  // 使进行中的边界动画帧立即作废
  boundaryGeneration += 1
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
          <span>{{ timelineEnabled ? '历代政区边界（CHGIS V6）' : layer.label }}</span>
        </label>
      </div>
    </div>

    <div class="map-container" ref="mapContainer"></div>

    <TimeAxis v-if="timelineEnabled" />

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

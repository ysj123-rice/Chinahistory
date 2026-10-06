<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import ArcGISMap from '@arcgis/core/Map'
import MapView from '@arcgis/core/views/MapView'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import WebTileLayer from '@arcgis/core/layers/WebTileLayer'
import Field from '@arcgis/core/layers/support/Field'
import HeatmapRenderer from '@arcgis/core/renderers/HeatmapRenderer'
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol'
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol'
import Graphic from '@arcgis/core/Graphic'
import Point from '@arcgis/core/geometry/Point'
import Polygon from '@arcgis/core/geometry/Polygon'
// 显式注入 Popup：默认 popup 依赖懒注入在部分构建环境下不会触发（view.popup 为空对象）
import Popup from '@arcgis/core/widgets/Popup'

import {
  ANALYSIS_MODES,
  DENSITY_COLOR_STOPS,
  DENSITY_FORCE_MOCK_VALUES,
  DENSITY_MAX_DENSITY,
  DENSITY_RADIUS,
  ELLIPSE_SCALE,
  ELLIPSE_SEGMENTS,
  HOTSPOT_BOUNDARY_NAME_FIELD_CANDIDATES,
  HOTSPOT_COUNT_QUERY_CONCURRENCY,
  HOTSPOT_FORCE_MOCK_VALUES,
  HOTSPOT_LEVEL_STYLE_MAP,
  HOTSPOT_LOW_VARIANCE_UNIQUE_THRESHOLD,
  HOTSPOT_NEIGHBOR_RADIUS_METERS,
  HOTSPOT_OUTLINE_COLOR,
  HOTSPOT_OUTLINE_WIDTH,
  HOTSPOT_PREFERRED_BOUNDARY_MAX_FEATURES,
  HOTSPOT_PREFERRED_BOUNDARY_MIN_FEATURES,
  HOTSPOT_QUERY_BATCH_SIZE,
  type AnalysisModeKey,
  type HotspotLevel,
} from '@/modules/analysis/constants'
import { buildHotspotScores } from '@/modules/analysis/utils/hotspot'
import { buildMockDensityPoints } from '@/modules/analysis/utils/densityMock'
import { buildMockHotspotOutput } from '@/modules/analysis/utils/hotspotMock'
import {
  BOUNDARY_FILL_COLOR,
  BOUNDARY_OUTLINE_COLOR,
  BOUNDARY_OUTLINE_WIDTH,
  MAP_CENTER,
  MAP_MAX_ZOOM,
  MAP_ZOOM,
  SCATTER_COLOR,
  SCATTER_OUTLINE_COLOR,
  SCATTER_OUTLINE_WIDTH,
  SCATTER_SIZE,
  buildLayerUrl,
  buildTiandituTileUrl,
  TIANDITU_SUBDOMAIN_LIST,
} from '@/modules/map/constants'
import { generateMockPoints } from '@/modules/map/mockPoints'
import { buildPersonGeoNote, createPersonPopupTemplate, fetchRealPersonPoints, registerSurnameCardAction, type RealPersonPoint } from '@/modules/map/realPoints'
import { getEffectiveLayerGroup } from '@/modules/map/layerDefinitions'
import { useMapSourceStore } from '@/stores/mapSource'

const mapSourceStore = useMapSourceStore()
const mapContainer = ref<HTMLDivElement | null>(null)
const statusMessage = ref<string | null>(null)
const isReady = ref(false)

const activeMode = ref<AnalysisModeKey>('hotspot')
const activeSourceKey = computed(() => mapSourceStore.activeSourceKey)
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

let mapView: MapView | null = null
let mapInstance: ArcGISMap | null = null
let pointLayer: FeatureLayer | null = null

// 当前朝代的 CBDB 真实人物点；为空时回退到客户端示例点
let realPoints: RealPersonPoint[] = []
let boundaryLayer: FeatureLayer | null = null
let resultLayer: GraphicsLayer | null = null
let hotspotBoundaryLayer: FeatureLayer | null = null
let hotspotBoundaryLayerId: number | null = null
let mockDensityLayer: FeatureLayer | null = null
let analysisRequestId = 0
const LAYER_READY_TIMEOUT_MS = 8000
const QUERY_TIMEOUT_MS = 12000

const hotspotBoundaryIdCache = new Map<string, number>()

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

const createPointRenderer = () =>
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

const createDensityRenderer = (field?: string) =>
  new HeatmapRenderer({
    field,
    minDensity: 0,
    maxDensity: DENSITY_MAX_DENSITY,
    radius: DENSITY_RADIUS,
    colorStops: DENSITY_COLOR_STOPS,
  })

const createHotspotSymbol = (level: HotspotLevel) =>
  new SimpleFillSymbol({
    color: HOTSPOT_LEVEL_STYLE_MAP[level].color,
    outline: {
      color: HOTSPOT_OUTLINE_COLOR,
      width: HOTSPOT_OUTLINE_WIDTH,
    },
  })

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

const createPointLayer = (layerId: number): FeatureLayer | null => {
  const url = buildLayerUrl(activeServiceUrl.value, layerId)
  if (url) {
    return new FeatureLayer({
      url,
      title: 'Activity points',
      outFields: ['*'],
      renderer: createPointRenderer(),
      visible: activeMode.value !== 'hotspot',
    })
  }

  // 优先使用 CBDB 真实人物籍贯点；无数据时回退示例点
  const points = realPoints.length > 0 ? realPoints : generateMockPoints(400, activeSourceKey.value)
  const graphics = points.map((item) => {
    const isReal = realPoints.length > 0
    const geoNote = isReal ? buildPersonGeoNote(item as RealPersonPoint) : ''
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
        ...(geoNote ? { geoNote } : {}),
      },
    })
  })
  return new FeatureLayer({
    source: graphics,
    title: realPoints.length > 0 ? '历史人物籍贯（CBDB）' : 'Activity points（示例）',
    fields: [
      new Field({ name: 'objectId', type: 'oid' }),
      new Field({ name: 'NAME_CH', type: 'string' }),
      new Field({ name: 'surname', type: 'string' }),
      new Field({ name: 'name', type: 'string' }),
      new Field({ name: 'location', type: 'string' }),
      new Field({ name: 'dynasty', type: 'string' }),
      new Field({ name: 'year', type: 'integer' }),
      new Field({ name: 'geoNote', type: 'string' }),
    ],
    objectIdField: 'objectId',
    geometryType: 'point',
    spatialReference: { wkid: 4326 },
    renderer: createPointRenderer(),
    ...(realPoints.length > 0 ? { popupTemplate: createPersonPopupTemplate() } : {}),
    visible: activeMode.value !== 'hotspot',
  })
}

const createBoundaryLayer = (definition: { id: number; label: string }): FeatureLayer | null => {
  const url = buildLayerUrl(activeServiceUrl.value, definition.id)
  if (url) {
    return new FeatureLayer({
      url,
      title: definition.label,
      renderer: createBoundaryRenderer(),
      popupEnabled: false,
    })
  }

  if (activeGeoJsonPath.value) {
    return new GeoJSONLayer({
      url: activeGeoJsonPath.value,
      title: definition.label,
      renderer: createBoundaryRenderer(),
      popupEnabled: false,
    }) as unknown as FeatureLayer
  }

  return null
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

const getDefaultBoundaryLayerId = () => {
  const visibleIds = layerGroup.value.defaultVisibleBoundaryIds
  if (visibleIds.length > 0) {
    return visibleIds[0]
  }
  return boundaryLayerDefinitions.value[0]?.id
}

const buildEllipseGeometry = (points: Array<{ x: number; y: number }>) => {
  if (points.length < 2) {
    return null
  }

  const count = points.length
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / count
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / count

  let sumXX = 0
  let sumYY = 0
  let sumXY = 0

  points.forEach((point) => {
    const dx = point.x - meanX
    const dy = point.y - meanY
    sumXX += dx * dx
    sumYY += dy * dy
    sumXY += dx * dy
  })

  const covXX = sumXX / count
  const covYY = sumYY / count
  const covXY = sumXY / count

  const trace = covXX + covYY
  const determinant = covXX * covYY - covXY * covXY
  const root = Math.sqrt(Math.max(0, trace * trace * 0.25 - determinant))
  const lambda1 = trace * 0.5 + root
  const lambda2 = trace * 0.5 - root

  const angle = covXY === 0 ? 0 : Math.atan2(lambda1 - covXX, covXY)
  const majorAxis = Math.sqrt(Math.max(lambda1, 0)) * ELLIPSE_SCALE
  const minorAxis = Math.sqrt(Math.max(lambda2, 0)) * ELLIPSE_SCALE

  if (majorAxis === 0 || minorAxis === 0) {
    return null
  }

  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)
  const ring: number[][] = []

  for (let i = 0; i <= ELLIPSE_SEGMENTS; i += 1) {
    const theta = (Math.PI * 2 * i) / ELLIPSE_SEGMENTS
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)
    const x = meanX + majorAxis * cosTheta * cosAngle - minorAxis * sinTheta * sinAngle
    const y = meanY + majorAxis * cosTheta * sinAngle + minorAxis * sinTheta * cosAngle
    ring.push([x, y])
  }

  return new Polygon({ rings: [ring], spatialReference: mapView?.spatialReference })
}

const buildBoundaryLayerCacheKey = () => `${activeSourceKey.value}:${activeServiceUrl.value}`

const ensureResultLayerOnTop = () => {
  if (!mapInstance || !resultLayer) {
    return
  }

  const topIndex = mapInstance.layers.length - 1
  if (topIndex >= 0) {
    mapInstance.reorder(resultLayer, topIndex)
  }
}

const clearMockDensityLayer = () => {
  if (!mapInstance || !mockDensityLayer) {
    mockDensityLayer = null
    return
  }

  mapInstance.remove(mockDensityLayer)
  mockDensityLayer.destroy()
  mockDensityLayer = null
}

const waitLayerReadyWithTimeout = async (layer: FeatureLayer, layerLabel: string) => {
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${layerLabel} 加载超时(${LAYER_READY_TIMEOUT_MS}ms)`))
    }, LAYER_READY_TIMEOUT_MS)
  })

  try {
    await Promise.race([layer.load().then(() => undefined), timeoutPromise])
    console.log(`[冷热分析] ${layerLabel} 加载完成`)
  } catch (error) {
    console.warn(`[冷热分析] ${layerLabel} 未完成加载，继续尝试查询`, error)
  }
}

const withTimeout = async <T>(task: Promise<T>, label: string, timeoutMs = QUERY_TIMEOUT_MS) => {
  const timeoutTask = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${label} 超时(${timeoutMs}ms)`))
    }, timeoutMs)
  })

  return Promise.race([task, timeoutTask])
}

const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  if (items.length === 0) {
    return []
  }

  const limit = Math.max(1, concurrency)
  const results = Array.from<R>({ length: items.length }) as R[]
  let currentIndex = 0

  const worker = async () => {
    while (currentIndex < items.length) {
      const itemIndex = currentIndex
      currentIndex += 1
      const item = items[itemIndex]
      if (item === undefined) {
        continue
      }
      results[itemIndex] = await mapper(item, itemIndex)
    }
  }

  const workerCount = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  return results
}

const queryAllFeatures = async (
  layer: FeatureLayer,
  outSpatialReference?: __esri.SpatialReference | null,
): Promise<__esri.Graphic[]> => {
  console.log('[查询要素] 开始查询图层', layer.title)
  const oidQuery = layer.createQuery()
  oidQuery.where = layer.definitionExpression || '1=1'

  let objectIds: number[] | null = null

  try {
    console.log('[查询要素] 查询对象ID...')
    const rawObjectIds = await withTimeout(layer.queryObjectIds(oidQuery), `${layer.title} 对象ID查询`)
    objectIds = (rawObjectIds ?? [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
    console.log('[查询要素] 找到对象ID数量:', objectIds?.length ?? 0)
  } catch (error) {
    console.warn('[查询要素] 对象ID查询失败，回退为直接按条件查询', error)
  }

  if (!objectIds || objectIds.length === 0) {
    const fallbackQuery = layer.createQuery()
    fallbackQuery.where = layer.definitionExpression || '1=1'
    fallbackQuery.returnGeometry = true
    fallbackQuery.outFields = ['*']
    fallbackQuery.outSpatialReference =
      outSpatialReference ?? mapView?.spatialReference ?? layer.spatialReference

    const fallbackFeatureSet = await withTimeout(
      layer.queryFeatures(fallbackQuery),
      `${layer.title} 条件查询`,
    )
    console.log('[查询要素] 回退查询返回要素数量:', fallbackFeatureSet.features.length)
    return fallbackFeatureSet.features
  }

  const allFeatures: __esri.Graphic[] = []

  for (let offset = 0; offset < objectIds.length; offset += HOTSPOT_QUERY_BATCH_SIZE) {
    const batchIds = objectIds.slice(offset, offset + HOTSPOT_QUERY_BATCH_SIZE)
    console.log(`[查询要素] 查询批次 ${Math.floor(offset / HOTSPOT_QUERY_BATCH_SIZE) + 1}，ID数量: ${batchIds.length}`)
    
    const query = layer.createQuery()
    query.objectIds = batchIds
    query.returnGeometry = true
    query.outFields = ['*']
    query.outSpatialReference = outSpatialReference ?? mapView?.spatialReference ?? layer.spatialReference

    const featureSet = await withTimeout(
      layer.queryFeatures(query),
      `${layer.title} 批次查询`,
    )
    console.log(`[查询要素] 批次返回要素数量: ${featureSet.features.length}`)
    allFeatures.push(...featureSet.features)
  }

  console.log('[查询要素] 查询完成，总要素数量', allFeatures.length)
  return allFeatures
}

const resolveBoundaryName = (attributes: Record<string, unknown>, fallbackIndex: number) => {
  for (const fieldName of HOTSPOT_BOUNDARY_NAME_FIELD_CANDIDATES) {
    const value = attributes[fieldName]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }

  return `区域 ${fallbackIndex + 1}`
}

const resolvePolygonAreaSquareMeter = (
  geometry: __esri.Polygon,
  attributes: Record<string, unknown>,
) => {
  const areaFieldCandidates = ['Shape__Area', 'Shape_Area', 'Shape__Are']
  for (const fieldName of areaFieldCandidates) {
    const value = attributes[fieldName]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value
    }
  }

  const extent = geometry.extent
  if (!extent) {
    return 1
  }

  const areaByExtent = Math.abs(extent.width * extent.height)
  return areaByExtent > 0 ? areaByExtent : 1
}

const resolveHotspotBoundaryLayerId = async (): Promise<number | null> => {
  if (boundaryLayerDefinitions.value.length === 0) {
    return null
  }

  const cacheKey = buildBoundaryLayerCacheKey()
  const cachedLayerId = hotspotBoundaryIdCache.get(cacheKey)

  if (
    cachedLayerId !== undefined &&
    boundaryLayerDefinitions.value.some((definition) => definition.id === cachedLayerId)
  ) {
    return cachedLayerId
  }

  const hasAnyServiceUrl = boundaryLayerDefinitions.value.some(
    (definition) => buildLayerUrl(activeServiceUrl.value, definition.id),
  )

  if (!hasAnyServiceUrl && activeGeoJsonPath.value) {
    const fallbackLayerId = boundaryLayerDefinitions.value[0]?.id ?? null
    if (fallbackLayerId !== null) {
      hotspotBoundaryIdCache.set(cacheKey, fallbackLayerId)
    }
    return fallbackLayerId
  }

  const countResults = await Promise.all(
    boundaryLayerDefinitions.value.map(async (definition) => {
      const url = buildLayerUrl(activeServiceUrl.value, definition.id)
      if (!url) {
        return { layerId: definition.id, count: -1 }
      }

      const layer = new FeatureLayer({
        url,
        outFields: ['*'],
        popupEnabled: false,
      })

      try {
        const countQuery = layer.createQuery()
        countQuery.where = '1=1'
        const count = await layer.queryFeatureCount(countQuery)
        return { layerId: definition.id, count }
      } catch (error) {
        console.warn(`边界图层数量查询失败: ${definition.id}`, error)
        return { layerId: definition.id, count: -1 }
      }
    }),
  )

  const validCounts = countResults.filter((item) => item.count >= 0)
  const meaningfulCounts = validCounts.filter((item) => item.count > 1)
  const preferredCounts = meaningfulCounts
    .filter(
      (item) =>
        item.count >= HOTSPOT_PREFERRED_BOUNDARY_MIN_FEATURES &&
        item.count <= HOTSPOT_PREFERRED_BOUNDARY_MAX_FEATURES,
    )
    .sort((left, right) => right.count - left.count)

  const fallbackLayerId = boundaryLayerDefinitions.value[0]?.id
  const bestMatch =
    preferredCounts[0] ??
    meaningfulCounts.sort((left, right) => right.count - left.count)[0] ??
    validCounts.sort((left, right) => right.count - left.count)[0]
  const resolvedLayerId = bestMatch?.layerId ?? fallbackLayerId ?? null

  if (resolvedLayerId !== null) {
    hotspotBoundaryIdCache.set(cacheKey, resolvedLayerId)
  }

  return resolvedLayerId
}

const ensureHotspotBoundaryLayer = async (): Promise<FeatureLayer | null> => {
  const layerId = await resolveHotspotBoundaryLayerId()
  if (layerId === null) {
    return null
  }

  if (hotspotBoundaryLayer && hotspotBoundaryLayerId === layerId) {
    return hotspotBoundaryLayer
  }

  const url = buildLayerUrl(activeServiceUrl.value, layerId)
  const boundaryDefinition = boundaryLayerDefinitions.value.find((definition) => definition.id === layerId)

  if (url) {
    hotspotBoundaryLayer = new FeatureLayer({
      url,
      title: boundaryDefinition?.label ?? 'Administrative boundary',
      outFields: ['*'],
      popupEnabled: false,
    })
  } else if (activeGeoJsonPath.value) {
    hotspotBoundaryLayer = new GeoJSONLayer({
      url: activeGeoJsonPath.value,
      title: boundaryDefinition?.label ?? 'Administrative boundary',
      outFields: ['*'],
      popupEnabled: false,
    }) as unknown as FeatureLayer
  } else {
    return null
  }

  hotspotBoundaryLayerId = layerId

  return hotspotBoundaryLayer
}

const buildHotspotGraphics = async (activePointLayer: FeatureLayer) => {
  console.log('[Hotspot] Start building hotspot graphics')
  const analysisBoundaryLayer = await ensureHotspotBoundaryLayer()
  if (!analysisBoundaryLayer) {
    console.warn('[冷热分析] 未找到合适的边界图层')
    return {
      graphics: [] as __esri.Graphic[],
      boundaryLabel: 'Administrative boundary',
    }
  }

  console.log('[冷热分析] 边界图层:', analysisBoundaryLayer.title, '图层ID:', hotspotBoundaryLayerId)
  
  console.log('[冷热分析] 等待图层加载完成...')
  await Promise.all([
    waitLayerReadyWithTimeout(activePointLayer, 'point layer'),
    waitLayerReadyWithTimeout(analysisBoundaryLayer, '边界图层'),
  ])
  console.log('[Hotspot] Layer ready, start querying boundary features')

  let boundaryFeatures: __esri.Graphic[] = []
  try {
    boundaryFeatures = await queryAllFeatures(
      analysisBoundaryLayer,
      mapView?.spatialReference ?? null,
    )
    console.log('[冷热分析] 查询到边界要素数量', boundaryFeatures.length)
  } catch (error) {
    console.error('[冷热分析] 查询边界要素失败:', error)
    throw error
  }

  const boundaryPolygons = boundaryFeatures
    .filter((feature) => feature.geometry?.type === 'polygon')
    .map((feature, index) => {
      const geometry = feature.geometry as __esri.Polygon
      const attributes = (feature.attributes ?? {}) as Record<string, unknown>
      return {
        geometry,
        extent: geometry.extent,
        attributes,
        index,
      }
    })

  console.log('[冷热分析] 有效边界多边形数量', boundaryPolygons.length)

  if (boundaryPolygons.length === 0) {
    console.warn('[Hotspot] No valid boundary polygons available for analysis')
    return {
      graphics: [] as __esri.Graphic[],
      boundaryLabel: analysisBoundaryLayer.title,
    }
  }

  const buildMockMetrics = () => {
    const mockBoundaries = boundaryPolygons.map((boundary, index) => {
      const center = boundary.geometry.extent?.center
      const areaSquareKilometer =
        resolvePolygonAreaSquareMeter(boundary.geometry, boundary.attributes) / 1_000_000

      return {
        index,
        name: resolveBoundaryName(boundary.attributes, index),
        centerX: center?.x ?? 0,
        centerY: center?.y ?? 0,
        areaSquareKilometer,
      }
    })

    return buildMockHotspotOutput({
      sourceKey: activeSourceKey.value,
      pointLayerId: activePointLayerId.value,
      boundaryLayerId: hotspotBoundaryLayerId,
      boundaries: mockBoundaries,
    })
  }

  let counts: number[] = []
  let analysisValues: number[] = []
  let analysisMetricName = 'Area-normalized intensity'

  if (HOTSPOT_FORCE_MOCK_VALUES) {
    console.log('[冷热分析] 使用模拟数据模式')
    const mockMetrics = buildMockMetrics()
    counts = mockMetrics.pointCounts
    analysisValues = mockMetrics.metricValues
    analysisMetricName = '模拟热点强度'
    console.log('[冷热分析] 模拟数据生成完成，分析值数量', analysisValues.length)
  } else {
    try {
      counts = await mapWithConcurrency(
        boundaryPolygons,
        HOTSPOT_COUNT_QUERY_CONCURRENCY,
        async (boundary) => {
          const countQuery = activePointLayer.createQuery()
          countQuery.where = activePointLayer.definitionExpression || '1=1'
          countQuery.geometry = boundary.geometry
          countQuery.spatialRelationship = 'intersects'
          return activePointLayer.queryFeatureCount(countQuery)
        },
      )

      analysisValues = boundaryPolygons.map((boundary, index) => {
        const areaSquareKilometer =
          resolvePolygonAreaSquareMeter(boundary.geometry, boundary.attributes) / 1_000_000
        const safeArea = areaSquareKilometer > 0 ? areaSquareKilometer : 1
        return (counts[index] ?? 0) / safeArea
      })

      const uniqueValueCount = new Set(analysisValues.map((value) => Number(value.toFixed(8)))).size
      if (uniqueValueCount <= HOTSPOT_LOW_VARIANCE_UNIQUE_THRESHOLD) {
        analysisValues = await mapWithConcurrency(
          boundaryPolygons,
          HOTSPOT_COUNT_QUERY_CONCURRENCY,
          async (boundary) => {
            const center = boundary.geometry.extent?.center
            if (!center) {
              return 0
            }

            const neighborQuery = activePointLayer.createQuery()
            neighborQuery.where = activePointLayer.definitionExpression || '1=1'
            neighborQuery.geometry = center
            neighborQuery.distance = HOTSPOT_NEIGHBOR_RADIUS_METERS
            neighborQuery.units = 'meters'
            neighborQuery.spatialRelationship = 'intersects'
            return activePointLayer.queryFeatureCount(neighborQuery)
          },
        )
        analysisMetricName = '邻域聚集强度'
      }
    } catch (error) {
      console.warn('冷热分析真实数据统计失败，自动回退模拟数据', error)
      const mockMetrics = buildMockMetrics()
      counts = mockMetrics.pointCounts
      analysisValues = mockMetrics.metricValues
      analysisMetricName = '模拟热点强度'
    }
  }

  const scoreResults = buildHotspotScores(analysisValues)

  const graphics = boundaryPolygons.map((boundary, index) => {
    const score = scoreResults[index] ?? {
      value: 0,
      zScore: 0,
      level: 0 as HotspotLevel,
    }
    const style = HOTSPOT_LEVEL_STYLE_MAP[score.level]
    const hotspotName = resolveBoundaryName(boundary.attributes, index)

    return new Graphic({
      geometry: boundary.geometry.clone(),
      attributes: {
        ...boundary.attributes,
        hotspot_name: hotspotName,
        hotspot_point_count: counts[index] ?? 0,
        hotspot_count: score.value,
        hotspot_zscore: Number(score.zScore.toFixed(3)),
        hotspot_metric_value: Number((analysisValues[index] ?? 0).toFixed(6)),
        hotspot_metric_name: analysisMetricName,
        hotspot_label: style.label,
        hotspot_level: score.level,
      },
      symbol: createHotspotSymbol(score.level),
      popupTemplate: {
        title: '{hotspot_name}',
        content: [
          {
            type: 'fields',
            fieldInfos: [
              { fieldName: 'hotspot_label', label: '冷热等级' },
              { fieldName: 'hotspot_point_count', label: '点位数量' },
              { fieldName: 'hotspot_metric_value', label: 'Metric value' },
              { fieldName: 'hotspot_metric_name', label: '指标类型' },
              { fieldName: 'hotspot_zscore', label: 'Z-Score' },
            ],
          },
        ],
      },
    })
  })

  console.log('[冷热分析] 图形创建完成，图形数量', graphics.length)
  console.log('[冷热分析] 图形样例:', graphics[0] ? {
    level: graphics[0].attributes.hotspot_level,
    label: graphics[0].attributes.hotspot_label,
    name: graphics[0].attributes.hotspot_name,
    hasGeometry: !!graphics[0].geometry,
    hasSymbol: !!graphics[0].symbol
  } : 'N/A')

  return {
    graphics,
    boundaryLabel: analysisBoundaryLayer.title,
  }
}

const buildMockDensityLayer = async (): Promise<FeatureLayer | null> => {
  const analysisBoundaryLayer = await ensureHotspotBoundaryLayer()
  if (!analysisBoundaryLayer) {
    return null
  }

  await waitLayerReadyWithTimeout(analysisBoundaryLayer, 'boundary layer')

  const boundaryFeatures = await queryAllFeatures(
    analysisBoundaryLayer,
    mapView?.spatialReference ?? null,
  )

  const boundaryPolygons = boundaryFeatures
    .filter((feature) => feature.geometry?.type === 'polygon')
    .map((feature, index) => {
      const geometry = feature.geometry as __esri.Polygon
      const attributes = (feature.attributes ?? {}) as Record<string, unknown>
      const extent = geometry.extent
      const center = extent?.center
      return {
        index,
        name: resolveBoundaryName(attributes, index),
        centerX: center?.x ?? 0,
        centerY: center?.y ?? 0,
        extentWidth: Math.abs(extent?.width ?? 0),
        extentHeight: Math.abs(extent?.height ?? 0),
      }
    })

  if (boundaryPolygons.length === 0) {
    return null
  }

  const points = buildMockDensityPoints({
    sourceKey: activeSourceKey.value,
    pointLayerId: activePointLayerId.value,
    boundaryLayerId: hotspotBoundaryLayerId,
    boundaries: boundaryPolygons,
  })

  if (points.length === 0) {
    return null
  }

  const spatialReference = mapView?.spatialReference ?? analysisBoundaryLayer.spatialReference
  if (!spatialReference) {
    return null
  }

  const graphics = points.map(
    (point, index) =>
      new Graphic({
        geometry: new Point({
          x: point.x,
          y: point.y,
          spatialReference,
        }),
        attributes: {
          OBJECTID: index + 1,
          weight: point.weight,
        },
      }),
  )

  return new FeatureLayer({
    title: 'Mock density points',
    source: graphics,
    geometryType: 'point',
    objectIdField: 'OBJECTID',
    fields: [
      { name: 'OBJECTID', alias: 'OBJECTID', type: 'oid' },
      { name: 'weight', alias: 'weight', type: 'double' },
    ],
    popupEnabled: false,
    spatialReference,
    renderer: createDensityRenderer('weight'),
  })
}

const updateResultLayer = async () => {
  const requestId = ++analysisRequestId

  if (!pointLayer || !resultLayer) {
    return
  }

  const activePointLayer = pointLayer
  const analysisResultLayer = resultLayer

  ensureResultLayerOnTop()
  analysisResultLayer.removeAll()
  clearMockDensityLayer()
  await waitLayerReadyWithTimeout(activePointLayer, 'point layer')

  if (requestId !== analysisRequestId) {
    return
  }

  if (activeMode.value === 'ellipse') {
    activePointLayer.visible = true
    activePointLayer.renderer = createPointRenderer()

    try {
      const features = await queryAllFeatures(activePointLayer)
      if (requestId !== analysisRequestId) {
        return
      }

      const points = features
        .map((feature) => feature.geometry)
        .filter((geometry) => geometry?.type === 'point')
        .map((geometry) => ({
          x: (geometry as __esri.Point).x,
          y: (geometry as __esri.Point).y,
        }))

      const ellipse = buildEllipseGeometry(points)
      if (!ellipse) {
        statusMessage.value = 'Insufficient data to build standard deviation ellipse.'
        return
      }

      const symbol = new SimpleFillSymbol({
        color: 'rgba(31, 136, 167, 0.18)',
        outline: new SimpleLineSymbol({ color: '#1f88a7', width: 2 }),
      })

      analysisResultLayer.add(new Graphic({ geometry: ellipse, symbol }))
      statusMessage.value = null
    } catch (error) {
      console.error('Standard deviation ellipse calculation failed', error)
      statusMessage.value = 'Standard deviation ellipse calculation failed.'
    }

    return
  }

  if (activeMode.value === 'hotspot') {
    console.log('[Hotspot] Enter hotspot analysis mode')
    activePointLayer.visible = false

    try {
      const hotspotResult = await buildHotspotGraphics(activePointLayer)
      if (requestId !== analysisRequestId) {
        console.log('[冷热分析] 请求已过期，放弃本次结果')
        return
      }

      console.log('[冷热分析] 热点分析结果:', {
        graphicsCount: hotspotResult.graphics.length,
        boundaryLabel: hotspotResult.boundaryLabel
      })

      if (hotspotResult.graphics.length === 0) {
        statusMessage.value = 'No administrative boundary data available for hotspot analysis.'
        console.warn('[冷热分析] 没有生成任何图形')
        return
      }

      console.log('[冷热分析] 准备将图形添加到结果图层')
      analysisResultLayer.addMany(hotspotResult.graphics)
      console.log('[冷热分析] 图形已添加到结果图层，当前图层图形数量', analysisResultLayer.graphics.length)
      
      statusMessage.value = HOTSPOT_FORCE_MOCK_VALUES
        ? `冷热分析已加载${hotspotResult.graphics.length} 个行政区（模拟数据）`
        : null
    } catch (error) {
      console.error('冷热分析计算失败', error)
      statusMessage.value = 'Hotspot analysis failed. Please retry.'
    }

    return
  }

  if (DENSITY_FORCE_MOCK_VALUES) {
    activePointLayer.visible = false

    try {
      const nextMockDensityLayer = await buildMockDensityLayer()
      if (requestId !== analysisRequestId) {
        return
      }

      if (!nextMockDensityLayer) {
        statusMessage.value = 'No data available for density analysis.'
        return
      }

      mockDensityLayer = nextMockDensityLayer
      mapInstance?.add(mockDensityLayer)
      ensureResultLayerOnTop()
      statusMessage.value = `Density mock loaded ${mockDensityLayer.source.length} points`
    } catch (error) {
      console.error('Density mock build failed', error)
      statusMessage.value = 'Density analysis failed. Please retry.'
    }

    return
  }

  statusMessage.value = null
  activePointLayer.visible = true
  activePointLayer.renderer = createDensityRenderer()
}

const setPointLayer = async (layerId: number) => {
  if (!mapInstance) {
    return
  }

  clearMockDensityLayer()

  realPoints = await fetchRealPersonPoints(activeSourceKey.value)

  if (pointLayer) {
    mapInstance.remove(pointLayer)
  }

  pointLayer = createPointLayer(layerId)
  if (!pointLayer) {
    statusMessage.value = 'Layer service URL is not configured.'
    return
  }

  mapInstance.add(pointLayer)

  updateResultLayer().catch((error) => {
    console.error('更新分析图层失败', error)
  })
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
      // 显式注入 Popup：默认 popup 依赖懒注入在部分构建环境下不会触发（view.popup 为空对象）
      popup: new Popup(),
    })

    // 不清空 ui.components——会连带移除 popup 挂载容器导致弹窗空白；默认控件由 CSS 隐藏

    await mapView.when()
    registerSurnameCardAction(mapView)

    resultLayer = new GraphicsLayer({ title: '分析结果' })
    mapInstance.add(resultLayer)

    const defaultBoundaryId = getDefaultBoundaryLayerId()
    const boundaryDefinition = boundaryLayerDefinitions.value.find(
      (definition) => definition.id === defaultBoundaryId,
    )

    if (boundaryDefinition) {
      boundaryLayer = createBoundaryLayer(boundaryDefinition)
      if (boundaryLayer) {
        mapInstance.add(boundaryLayer)
      }
    }

    await setPointLayer(activePointLayerId.value)

    await mapView.when()
    if (pointLayer?.fullExtent) {
      await safeGoTo(pointLayer.fullExtent.expand(1.1))
    }

    isReady.value = true
  } catch (error) {
    console.error('Analysis map initialization failed', error)
    statusMessage.value = 'Analysis map initialization failed. Please check configuration.'
  }
}

const resetLayers = async () => {
  if (!mapInstance || !mapView) {
    return
  }

  statusMessage.value = null
  clearMockDensityLayer()
  if (pointLayer) {
    mapInstance.remove(pointLayer)
  }
  if (boundaryLayer) {
    mapInstance.remove(boundaryLayer)
  }
  resultLayer?.removeAll()

  hotspotBoundaryLayer = null
  hotspotBoundaryLayerId = null

  const defaultBoundaryId = getDefaultBoundaryLayerId()
  const boundaryDefinition = boundaryLayerDefinitions.value.find(
    (definition) => definition.id === defaultBoundaryId,
  )

  if (boundaryDefinition) {
    boundaryLayer = createBoundaryLayer(boundaryDefinition)
    if (boundaryLayer) {
      mapInstance.add(boundaryLayer)
    }
  }

  activePointLayerId.value = layerGroup.value.defaultPointLayerId
  await setPointLayer(activePointLayerId.value)

  if (pointLayer?.fullExtent) {
    await safeGoTo(pointLayer.fullExtent.expand(1.1))
  }
}

watch(activeMode, () => {
  updateResultLayer().catch((error) => {
    console.error('切换分析模式失败', error)
  })
})

watch(activePointLayerId, (layerId) => {
  void setPointLayer(layerId)
})

watch(activeSourceKey, () => {
  void resetLayers()
})

onMounted(() => {
  void initializeMap()
})

onBeforeUnmount(() => {
  clearMockDensityLayer()
  mapView?.destroy()
  mapView = null
  mapInstance = null
  pointLayer = null
  boundaryLayer = null
  resultLayer = null
  hotspotBoundaryLayer = null
  hotspotBoundaryLayerId = null
})
</script>

<template>
  <div class="analysis-map">
    <div class="analysis-toolbar">
      <div class="toolbar-title">分析模式</div>
      <div class="toolbar-options">
        <button
          v-for="mode in ANALYSIS_MODES"
          :key="mode.key"
          type="button"
          class="mode-button"
          :class="{ active: activeMode === mode.key }"
          @click="activeMode = mode.key"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <div class="analysis-panel">
      <div class="panel-title">活动点图层</div>
      <label v-for="layer in pointLayerDefinitions" :key="layer.id" class="panel-option">
        <input v-model.number="activePointLayerId" type="radio" name="analysis-layer" :value="layer.id" />
        <span>{{ layer.label }}</span>
      </label>
      <div class="panel-hint">
        冷热分析会自动选择最适合粒度的行政区图层进行分级
        <span v-if="HOTSPOT_FORCE_MOCK_VALUES">，当前使用模拟数据演示</span>
      </div>
    </div>

    <div class="map-container" ref="mapContainer"></div>

    <div v-if="statusMessage" class="map-status">{{ statusMessage }}</div>
    <div v-if="!isReady" class="map-loading">分析地图加载中...</div>
  </div>
</template>

<style scoped>
.analysis-map {
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

.analysis-toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 8px;
  box-shadow: var(--shadow-soft);
}

.toolbar-title {
  font-size: 12px;
  color: var(--text-muted);
}

.toolbar-options {
  display: grid;
  gap: 8px;
}

.mode-button {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--surface-3);
  font-size: 12px;
  color: var(--text-muted);
}

.mode-button.active {
  border-color: rgba(31, 136, 167, 0.4);
  color: var(--text-primary);
  background: rgba(31, 136, 167, 0.18);
}

.analysis-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 8px;
  min-width: 220px;
  box-shadow: var(--shadow-soft);
}

.panel-title {
  font-size: 12px;
  color: var(--text-muted);
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

.panel-hint {
  font-size: 11px;
  color: var(--text-muted);
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





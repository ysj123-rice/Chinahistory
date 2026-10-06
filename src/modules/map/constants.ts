export const ARCGIS_SERVICE_URL = import.meta.env.VITE_ARCGIS_SERVICE_URL as string | undefined

const normalizeServiceUrl = (url: string) => url.replace(/\/+$/, '')

export const buildLayerUrl = (serviceUrl: string | undefined, layerId: number) =>
  serviceUrl ? `${normalizeServiceUrl(serviceUrl)}/${layerId}` : undefined

export const ARCGIS_API_KEY = import.meta.env.VITE_ARCGIS_API_KEY as string | undefined

export const ARCGIS_ASSETS_URL = import.meta.env.VITE_ARCGIS_ASSETS_URL as string | undefined

export const TIANDITU_KEY = import.meta.env.VITE_TIANDITU_KEY as string | undefined

const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7']

export const buildTiandituTileUrl = (layerType: 'vec' | 'cva') => {
  if (!TIANDITU_KEY) {
    return undefined
  }
  return `https://t{subDomain}.tianditu.gov.cn/DataServer?T=${layerType}_w&x={x}&y={y}&l={z}&tk=${TIANDITU_KEY}`
}

export const TIANDITU_SUBDOMAIN_LIST = TIANDITU_SUBDOMAINS

export const MAP_BASEMAP_ID =
  (import.meta.env.VITE_ARCGIS_BASEMAP_ID as string | undefined) ?? 'topo-vector'

export const MAP_BASEMAP = MAP_BASEMAP_ID === 'none' ? null : MAP_BASEMAP_ID

export const MAP_CENTER: [number, number] = [105.6, 34.8]

export const MAP_ZOOM = 4

export const MAP_MAX_ZOOM = 10

export const CLUSTER_RADIUS = '90px'

export const CLUSTER_MIN_SIZE = '24px'

export const CLUSTER_MAX_SIZE = '64px'

export const HEATMAP_MIN_DENSITY = 0

export const HEATMAP_MAX_DENSITY = 0.2

export const HEATMAP_RADIUS = 30

export const HEATMAP_WEIGHT_MULTIPLIER = 2

export const HEATMAP_COLOR_STOPS = [
  { ratio: 0, color: 'rgba(0, 0, 0, 0)' },
  { ratio: 0.2, color: '#3fa9f5' },
  { ratio: 0.4, color: '#39d2e8' },
  { ratio: 0.6, color: '#ffe066' },
  { ratio: 0.8, color: '#ff8c42' },
  { ratio: 1, color: '#e63946' },
]

export const SCATTER_COLOR = '#1f88a7'

export const SCATTER_OUTLINE_COLOR = '#ffffff'

export const SCATTER_SIZE = 6

export const SCATTER_OUTLINE_WIDTH = 0.8

export const BOUNDARY_FILL_COLOR = 'rgba(31, 136, 167, 0.06)'

export const BOUNDARY_OUTLINE_COLOR = '#1f4d6b'

export const BOUNDARY_OUTLINE_WIDTH = 1

export const CLUSTER_OUTLINE_COLOR = '#ffffff'

export const CLUSTER_OUTLINE_WIDTH = 1

export const CLUSTER_TEXT_COLOR = '#0d2330'

export const CLUSTER_TEXT_HALO = '#ffffff'

export type MapSourceKey = 'yuan' | 'tang' | 'ming' | 'southernSong' | 'northernSong' | 'qing'

export type MapSource = {
  key: MapSourceKey
  label: string
  serviceUrl: string
  geoJsonPath?: string
}

const DEFAULT_SOURCE_KEY: MapSourceKey = 'yuan'

// GeoJSON 边界数据路径（放在 public/geojson 下，作为静态资源访问）
const GEOJSON_PATHS: Record<MapSourceKey, string> = {
  yuan: '/geojson/yuan.geojson',
  tang: '/geojson/tang.geojson',
  ming: '/geojson/ming.geojson',
  southernSong: '/geojson/southernSong.geojson',
  northernSong: '/geojson/northernSong.geojson',
  qing: '/geojson/qing.geojson',
}

const SERVICE_URL_YUAN =
  (import.meta.env.VITE_ARCGIS_SERVICE_URL_YUAN as string | undefined) ??
  (import.meta.env.VITE_ARCGIS_SERVICE_URL as string | undefined)
const SERVICE_URL_TANG = import.meta.env.VITE_ARCGIS_SERVICE_URL_TANG as string | undefined
const SERVICE_URL_MING = import.meta.env.VITE_ARCGIS_SERVICE_URL_MING as string | undefined
const SERVICE_URL_SOUTHERN_SONG =
  import.meta.env.VITE_ARCGIS_SERVICE_URL_SOUTHERN_SONG as string | undefined
const SERVICE_URL_NORTHERN_SONG =
  import.meta.env.VITE_ARCGIS_SERVICE_URL_NORTHERN_SONG as string | undefined

// 只要有 ArcGIS 服务地址或 GeoJSON 文件，就纳入可选数据源
const RAW_MAP_SOURCES: Array<MapSource | null> = [
  SERVICE_URL_YUAN
    ? { key: 'yuan', label: '元代', serviceUrl: SERVICE_URL_YUAN, geoJsonPath: GEOJSON_PATHS.yuan }
    : { key: 'yuan', label: '元代', serviceUrl: '', geoJsonPath: GEOJSON_PATHS.yuan },
  SERVICE_URL_TANG
    ? { key: 'tang', label: '唐代', serviceUrl: SERVICE_URL_TANG, geoJsonPath: GEOJSON_PATHS.tang }
    : { key: 'tang', label: '唐代', serviceUrl: '', geoJsonPath: GEOJSON_PATHS.tang },
  SERVICE_URL_MING
    ? { key: 'ming', label: '明代', serviceUrl: SERVICE_URL_MING, geoJsonPath: GEOJSON_PATHS.ming }
    : { key: 'ming', label: '明代', serviceUrl: '', geoJsonPath: GEOJSON_PATHS.ming },
  SERVICE_URL_SOUTHERN_SONG
    ? {
        key: 'southernSong',
        label: '南宋',
        serviceUrl: SERVICE_URL_SOUTHERN_SONG,
        geoJsonPath: GEOJSON_PATHS.southernSong,
      }
    : { key: 'southernSong', label: '南宋', serviceUrl: '', geoJsonPath: GEOJSON_PATHS.southernSong },
  SERVICE_URL_NORTHERN_SONG
    ? {
        key: 'northernSong',
        label: '北宋',
        serviceUrl: SERVICE_URL_NORTHERN_SONG,
        geoJsonPath: GEOJSON_PATHS.northernSong,
      }
    : { key: 'northernSong', label: '北宋', serviceUrl: '', geoJsonPath: GEOJSON_PATHS.northernSong },
  {
    key: 'qing',
    label: '清代',
    serviceUrl: '',
    geoJsonPath: GEOJSON_PATHS.qing,
  },
]

export const MAP_SOURCES: MapSource[] = RAW_MAP_SOURCES.filter(
  (source): source is MapSource => Boolean(source?.serviceUrl || source?.geoJsonPath),
)

export const DEFAULT_MAP_SOURCE_KEY: MapSourceKey = MAP_SOURCES[0]?.key ?? DEFAULT_SOURCE_KEY

export const MAP_SOURCE_STORAGE_KEY = 'map_source_key'

export const getMapSourceByKey = (key: MapSourceKey) =>
  MAP_SOURCES.find((source) => source.key === key)

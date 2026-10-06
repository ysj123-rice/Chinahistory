import type { MapSourceKey } from '@/modules/map/dataSources'

export const EVOLUTION_AUTO_PLAY_INTERVAL = 2600
export const EVOLUTION_SCENE_TILT = 52
export const EVOLUTION_INTENSITY_MAX = 100
export const EVOLUTION_ARC_HEIGHT_BASE = 70000
export const EVOLUTION_ARC_HEIGHT_RANGE = 220000
export const EVOLUTION_ARROW_ELEVATION_RATIO = 0.35
export const EVOLUTION_ARROW_MARKER_STYLE = 'triangle' as const
export const EVOLUTION_ARROW_OUTLINE_COLOR = '#ffffff'
export const EVOLUTION_ARROW_OUTLINE_WIDTH = 0.6
export const EVOLUTION_SPATIAL_REFERENCE = { wkid: 4326 }
export const EVOLUTION_ELEVATION_MODE = 'relative-to-ground' as const

export const EVOLUTION_FLOW_COUNT_PER_PERIOD = 20
export const EVOLUTION_SEED_SALT = 'evolution'
export const EVOLUTION_FLOW_INTENSITY_MIN = 42
export const EVOLUTION_FLOW_INTENSITY_MAX = 98

export type EvolutionNode = {
  name: string
  longitude: number
  latitude: number
}

export type EvolutionNodeKey =
  | 'capital'
  | 'kaifeng'
  | 'taiyuan'
  | 'jinan'
  | 'fengyuan'
  | 'nanjing'
  | 'hangzhou'
  | 'suzhou'
  | 'wuhan'
  | 'fuzhou'
  | 'guangzhou'
  | 'chengdu'
  | 'changsha'

export type EvolutionPeriod = {
  key: string
  label: string
  range: string
  summary: string
}

export type EvolutionPeriodKey = EvolutionPeriod['key']

export type EvolutionFlow = {
  id: string
  periodKey: EvolutionPeriodKey
  surname: string
  from: EvolutionNode
  to: EvolutionNode
  intensity: number
  note: string
}

export const EVOLUTION_INTENSITY_LEVELS = [
  { min: 0, max: 45, label: '低', color: '#7ab4cf', lineSize: 1.4, arrowSize: 9 },
  { min: 46, max: 75, label: '中', color: '#3b91b4', lineSize: 2.2, arrowSize: 11 },
  { min: 76, max: 100, label: '高', color: '#1f6f93', lineSize: 3.1, arrowSize: 13 },
] as const

export const EVOLUTION_NODES: Record<EvolutionNodeKey, EvolutionNode> = {
  capital: { name: '大都', longitude: 116.4074, latitude: 39.9042 },
  kaifeng: { name: '汴梁', longitude: 114.3076, latitude: 34.7973 },
  taiyuan: { name: '太原', longitude: 112.5492, latitude: 37.857 },
  jinan: { name: '济南', longitude: 117.1201, latitude: 36.6512 },
  fengyuan: { name: '奉元', longitude: 108.9398, latitude: 34.3416 },
  nanjing: { name: '南京', longitude: 118.7969, latitude: 32.0603 },
  hangzhou: { name: '杭州', longitude: 120.1551, latitude: 30.2741 },
  suzhou: { name: '苏州', longitude: 120.5853, latitude: 31.2989 },
  wuhan: { name: '武昌', longitude: 114.3055, latitude: 30.5928 },
  fuzhou: { name: '福州', longitude: 119.2965, latitude: 26.0745 },
  guangzhou: { name: '广州', longitude: 113.2644, latitude: 23.1291 },
  chengdu: { name: '成都', longitude: 104.0665, latitude: 30.5723 },
  changsha: { name: '长沙', longitude: 112.9388, latitude: 28.2282 },
}

const EVOLUTION_PERIOD_TEMPLATES = [
  { label: '奠基期', summary: '家族向核心区域集中，行政迁调明显。' },
  { label: '扩展期', summary: '区域联通增强，沿江与沿海迁徙上升。' },
  { label: '整合期', summary: '跨区域交流加深，人口分布趋于带状。' },
  { label: '动荡期', summary: '战乱与调度叠加，人口向安全腹地转移。' },
]

const EVOLUTION_TIME_RANGE_PRESETS: Record<MapSourceKey, Array<{ key: string; label: string }>> = {
  yuan: [
    { key: '1260-1290', label: '1260-1290' },
    { key: '1291-1320', label: '1291-1320' },
    { key: '1321-1350', label: '1321-1350' },
    { key: '1351-1368', label: '1351-1368' },
  ],
  tang: [
    { key: '618-655', label: '618-655' },
    { key: '656-705', label: '656-705' },
    { key: '706-770', label: '706-770' },
    { key: '771-907', label: '771-907' },
  ],
  ming: [
    { key: '1368-1420', label: '1368-1420' },
    { key: '1421-1505', label: '1421-1505' },
    { key: '1506-1566', label: '1506-1566' },
    { key: '1567-1644', label: '1567-1644' },
  ],
  southernSong: [
    { key: '1127-1160', label: '1127-1160' },
    { key: '1161-1200', label: '1161-1200' },
    { key: '1201-1240', label: '1201-1240' },
    { key: '1241-1279', label: '1241-1279' },
  ],
  northernSong: [
    { key: '960-1000', label: '960-1000' },
    { key: '1001-1040', label: '1001-1040' },
    { key: '1041-1085', label: '1041-1085' },
    { key: '1086-1127', label: '1086-1127' },
  ],
  qing: [
    { key: '1644-1735', label: '1644-1735' },
    { key: '1736-1850', label: '1736-1850' },
    { key: '1851-1911', label: '1851-1911' },
  ],
}

export const EVOLUTION_PERIOD_PRESETS: Record<MapSourceKey, EvolutionPeriod[]> = Object.fromEntries(
  Object.entries(EVOLUTION_TIME_RANGE_PRESETS).map(([key, ranges]) => {
    const periods = EVOLUTION_PERIOD_TEMPLATES.map((template, index) => ({
      key: ranges[index]?.key ?? template.label,
      label: template.label,
      range: ranges[index]?.label ?? template.label,
      summary: template.summary,
    }))
    return [key, periods]
  }),
) as Record<MapSourceKey, EvolutionPeriod[]>

export const EVOLUTION_NOTE_TEMPLATES = [
  '{from}至{to}的{reason}迁徙显著增强。',
  '{reason}推动{from}家族向{to}集中。',
  '{from}—{to}通道活跃，{reason}成为主因。',
  '{to}成为新热点，{from}族群因{reason}迁入。',
]

export const EVOLUTION_REASON_POOL = ['军务调度', '商贸通道', '水利整饬', '行政迁转', '科举流动']

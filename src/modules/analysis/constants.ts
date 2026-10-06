export const ANALYSIS_MODES = [
  { key: 'hotspot', label: '冷热分析' },
  { key: 'density', label: '核密度分析' },
  { key: 'ellipse', label: '标准差椭圆' },
] as const

export type AnalysisModeKey = (typeof ANALYSIS_MODES)[number]['key']

export type HotspotLevel = -3 | -2 | -1 | 0 | 1 | 2 | 3

export type HotspotLevelStyle = {
  level: HotspotLevel
  label: string
  color: string
}

export const HOTSPOT_LEVEL_STYLES: HotspotLevelStyle[] = [
  { level: -3, label: '显著冷点', color: 'rgba(43, 131, 186, 0.82)' },
  { level: -2, label: '中度冷点', color: 'rgba(116, 173, 209, 0.78)' },
  { level: -1, label: '轻度冷点', color: 'rgba(171, 217, 233, 0.7)' },
  { level: 0, label: '平稳区', color: 'rgba(217, 217, 217, 0.65)' },
  { level: 1, label: '轻度热点', color: 'rgba(254, 224, 144, 0.72)' },
  { level: 2, label: '中度热点', color: 'rgba(253, 174, 97, 0.78)' },
  { level: 3, label: '显著热点', color: 'rgba(215, 25, 28, 0.84)' },
]

export const HOTSPOT_LEVEL_STYLE_MAP: Record<HotspotLevel, HotspotLevelStyle> = {
  [-3]: { level: -3, label: '显著冷点', color: 'rgba(43, 131, 186, 0.82)' },
  [-2]: { level: -2, label: '中度冷点', color: 'rgba(116, 173, 209, 0.78)' },
  [-1]: { level: -1, label: '轻度冷点', color: 'rgba(171, 217, 233, 0.7)' },
  [0]: { level: 0, label: '平稳区', color: 'rgba(217, 217, 217, 0.65)' },
  [1]: { level: 1, label: '轻度热点', color: 'rgba(254, 224, 144, 0.72)' },
  [2]: { level: 2, label: '中度热点', color: 'rgba(253, 174, 97, 0.78)' },
  [3]: { level: 3, label: '显著热点', color: 'rgba(215, 25, 28, 0.84)' },
}

export const HOTSPOT_ZSCORE_BREAKPOINTS = {
  weak: 0.25,
  medium: 0.75,
  strong: 1.5,
} as const

export const HOTSPOT_QUERY_BATCH_SIZE = 400
export const HOTSPOT_COUNT_QUERY_CONCURRENCY = 8
export const HOTSPOT_LOW_VARIANCE_UNIQUE_THRESHOLD = 2
export const HOTSPOT_NEIGHBOR_RADIUS_METERS = 220000
export const HOTSPOT_PREFERRED_BOUNDARY_MIN_FEATURES = 10
export const HOTSPOT_PREFERRED_BOUNDARY_MAX_FEATURES = 120
export const HOTSPOT_FORCE_MOCK_VALUES = true
export const HOTSPOT_MOCK_BASELINE = 100
export const HOTSPOT_MOCK_SPATIAL_AMPLITUDE = 46
export const HOTSPOT_MOCK_NOISE_AMPLITUDE = 18
export const HOTSPOT_MOCK_AREA_PENALTY = 5
export const HOTSPOT_MOCK_POINT_SCALE = 2.6
export const HOTSPOT_MOCK_FREQUENCY_X = 0.00000205
export const HOTSPOT_MOCK_FREQUENCY_Y = 0.00000255
export const HOTSPOT_OUTLINE_COLOR = '#0f2f48'
export const HOTSPOT_OUTLINE_WIDTH = 0.8

export const HOTSPOT_BOUNDARY_NAME_FIELD_CANDIDATES = [
  'NAME_CH',
  'name',
  'Name',
  'NAME_FT',
  'NAME_PY',
  '道府',
] as const

export const DENSITY_COLOR_STOPS = [
  { ratio: 0, color: 'rgba(0, 0, 0, 0)' },
  { ratio: 0.25, color: '#44b7d1' },
  { ratio: 0.5, color: '#f7d35b' },
  { ratio: 0.75, color: '#f2994a' },
  { ratio: 1, color: '#eb5757' },
]

export const DENSITY_RADIUS = 44
export const DENSITY_MAX_DENSITY = 0.16
export const DENSITY_FORCE_MOCK_VALUES = true
export const DENSITY_MOCK_MIN_POINTS_PER_BOUNDARY = 28
export const DENSITY_MOCK_MAX_POINTS_PER_BOUNDARY = 96
export const DENSITY_MOCK_MIN_SPREAD_METERS = 18000
export const DENSITY_MOCK_MAX_SPREAD_METERS = 160000
export const DENSITY_MOCK_SPREAD_RATIO = 0.32
export const DENSITY_MOCK_POINT_FREQUENCY_X = 0.00000195
export const DENSITY_MOCK_POINT_FREQUENCY_Y = 0.00000235

export const ELLIPSE_SCALE = 2
export const ELLIPSE_SEGMENTS = 64

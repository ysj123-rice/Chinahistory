import type { MapSourceKey } from '@/modules/map/dataSources'

export type EventTypeKey = 'politics' | 'military' | 'culture' | 'economy'

export type QueryTimeRange = {
  key: string
  label: string
  startYear: number
  endYear: number
}

export type QueryRecord = {
  id: number
  personName: string
  surname: string
  eventName: string
  eventType: EventTypeKey
  location: string
  year: number
  summary: string
  keywords: string[]
  source: string
}

export type QueryData = {
  records: QueryRecord[]
  timeRanges: QueryTimeRange[]
}

export const QUERY_EVENT_TYPES: Array<{ key: EventTypeKey; label: string; color: string }> = [
  { key: 'politics', label: '政治', color: '#1f88a7' },
  { key: 'military', label: '军事', color: '#d95d39' },
  { key: 'culture', label: '文化', color: '#5b7aa8' },
  { key: 'economy', label: '经济', color: '#2c9b6a' },
]

export const QUERY_RECORD_COUNT = 300
export const QUERY_SEED_SALT = 'query'
export const QUERY_KEYWORD_MIN_COUNT = 2
export const QUERY_KEYWORD_MAX_COUNT = 4

export const QUERY_TIME_RANGE_PRESETS: Record<MapSourceKey, QueryTimeRange[]> = {
  yuan: [
    { key: '1260-1290', label: '1260-1290', startYear: 1260, endYear: 1290 },
    { key: '1291-1320', label: '1291-1320', startYear: 1291, endYear: 1320 },
    { key: '1321-1350', label: '1321-1350', startYear: 1321, endYear: 1350 },
    { key: '1351-1368', label: '1351-1368', startYear: 1351, endYear: 1368 },
  ],
  tang: [
    { key: '618-655', label: '618-655', startYear: 618, endYear: 655 },
    { key: '656-705', label: '656-705', startYear: 656, endYear: 705 },
    { key: '706-770', label: '706-770', startYear: 706, endYear: 770 },
    { key: '771-907', label: '771-907', startYear: 771, endYear: 907 },
  ],
  ming: [
    { key: '1368-1420', label: '1368-1420', startYear: 1368, endYear: 1420 },
    { key: '1421-1505', label: '1421-1505', startYear: 1421, endYear: 1505 },
    { key: '1506-1566', label: '1506-1566', startYear: 1506, endYear: 1566 },
    { key: '1567-1644', label: '1567-1644', startYear: 1567, endYear: 1644 },
  ],
  southernSong: [
    { key: '1127-1160', label: '1127-1160', startYear: 1127, endYear: 1160 },
    { key: '1161-1200', label: '1161-1200', startYear: 1161, endYear: 1200 },
    { key: '1201-1240', label: '1201-1240', startYear: 1201, endYear: 1240 },
    { key: '1241-1279', label: '1241-1279', startYear: 1241, endYear: 1279 },
  ],
  northernSong: [
    { key: '960-1000', label: '960-1000', startYear: 960, endYear: 1000 },
    { key: '1001-1040', label: '1001-1040', startYear: 1001, endYear: 1040 },
    { key: '1041-1085', label: '1041-1085', startYear: 1041, endYear: 1085 },
    { key: '1086-1127', label: '1086-1127', startYear: 1086, endYear: 1127 },
  ],
  qing: [
    { key: '1644-1735', label: '1644-1735', startYear: 1644, endYear: 1735 },
    { key: '1736-1850', label: '1736-1850', startYear: 1736, endYear: 1850 },
    { key: '1851-1911', label: '1851-1911', startYear: 1851, endYear: 1911 },
  ],
}

export const QUERY_EVENT_NAME_POOLS: Record<EventTypeKey, string[]> = {
  politics: ['行省调度', '官署整饬', '州县巡察', '吏治考核', '礼制修订'],
  military: ['边防整备', '关隘协防', '水陆调度', '战备演练', '驿站巡检'],
  culture: ['书院讲学', '文献整理', '书画交流', '学规修订', '讲席巡回'],
  economy: ['漕运统筹', '盐税核验', '田赋清查', '仓储整备', '商路维护'],
}

export const QUERY_KEYWORD_POOL = [
  '制度',
  '迁徙',
  '户籍',
  '交通',
  '粮运',
  '赋役',
  '文书',
  '文化',
  '关隘',
  '驿站',
  '水利',
  '治安',
  '商贸',
  '学政',
  '财政',
]

export const QUERY_SUMMARY_TEMPLATES = [
  '{year}年{person}在{location}主持{event}，推动{keyword}体系完善。',
  '{location}{event}期间，{person}整合{keyword}资源，形成协作机制。',
  '{person}于{year}年参与{event}，加强{location}的{keyword}治理。',
  '{year}年{location}启动{event}，{person}主导{keyword}部署。',
]

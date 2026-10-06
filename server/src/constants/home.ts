import type { SourceKey } from './sourceKeys'

export const HOME_TREND_LABELS: Record<SourceKey, string> = {
  yuan: '至元',
  tang: '开元',
  ming: '洪武',
  southernSong: '建炎',
  northernSong: '乾德',
  qing: '顺治',
}

export const HOME_ACTIVITY_LEVEL_LABELS = ['州府', '县域', '驿站']

export const HOME_ACTIVITY_LEVEL_MIN = 10
export const HOME_ACTIVITY_LEVEL_FIRST_BASE = 45
export const HOME_ACTIVITY_LEVEL_SECOND_BASE = 30
export const HOME_ACTIVITY_LEVEL_VARIANCE = 12
export const HOME_PERCENT_TOTAL = 100

export const HOME_PERSON_MULTIPLIER = 20
export const HOME_SURNAME_MULTIPLIER = 240
export const HOME_LOCATION_MULTIPLIER = 30
export const HOME_RANKING_SCALE = 10
export const HOME_REGION_SCALE = 12

export const HOME_HIGHLIGHT_BANDS = ['中原-江淮', '江南-岭南', '关中-河西', '江淮-江南', '京畿-齐鲁']

export const HOME_HIGHLIGHT_FALLBACK_EVENT = '军务调动'

export const HOME_TREND_POINTS = 9
export const HOME_TREND_MIN = 18
export const HOME_TREND_MAX = 78

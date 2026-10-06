import type { MapSourceKey } from '@/modules/map/dataSources'

export const HOME_SEED_SALT = 'home'
export const HOME_TREND_POINT_COUNT = 9
export const HOME_TREND_MIN = 18
export const HOME_TREND_MAX = 72
export const HOME_TREND_STEP_MIN = -8
export const HOME_TREND_STEP_MAX = 12
export const HOME_TREND_START_OFFSET = 8
export const HOME_PERCENT_TOTAL = 100

export const HOME_PERSON_SCALE_MIN = 18
export const HOME_PERSON_SCALE_MAX = 24
export const HOME_SURNAME_SCALE_MIN = 210
export const HOME_SURNAME_SCALE_MAX = 280
export const HOME_LOCATION_SCALE_MIN = 24
export const HOME_LOCATION_SCALE_MAX = 36

export const HOME_ACTIVITY_FIRST_MIN = 32
export const HOME_ACTIVITY_FIRST_MAX = 52
export const HOME_ACTIVITY_SECOND_MIN = 18
export const HOME_ACTIVITY_SECOND_MAX = 38
export const HOME_ACTIVITY_THIRD_MIN = 10

export const HOME_SEED_SALT_SURNAME = 'home-surname'
export const HOME_SEED_SALT_REGION = 'home-region'
export const HOME_SEED_SALT_TREND = 'home-trend'
export const HOME_SEED_SALT_LEVEL = 'home-level'

export const HOME_ACTIVITY_LEVEL_LABELS = ['州府', '县域', '驿站']

export const HOME_ACTIVITY_BANDS = ['中原-江淮', '江南-岭南', '关中-河西', '江淮-江南', '京畿-齐鲁']

export const HOME_HOT_EVENTS = ['军务调动', '行省巡察', '漕运统筹', '书院讲学', '盐税整饬']

export const HOME_TREND_LABELS: Record<MapSourceKey, string> = {
  yuan: '至元',
  tang: '开元',
  ming: '洪武',
  southernSong: '建炎',
  northernSong: '乾德',
  qing: '顺治',
}

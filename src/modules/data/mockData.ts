import type { MapSourceKey } from '@/modules/map/dataSources'
import {
  MOCK_SOURCE_NAMES,
  MOCK_SURNAMES,
  MOCK_TEAM_NAMES,
} from '@/modules/mock/constants'
import { getSourceSeed } from '@/modules/mock/sourceSeeds'
import { createSeededRandom, deriveSeed } from '@/utils/seededRandom'

import {
  DATA_COVERAGE_POOL,
  DATA_DESCRIPTION_TEMPLATES,
  DATA_NAME_TEMPLATES,
  DATA_QUALITY_MAX,
  DATA_QUALITY_MIN,
  DATA_RECORD_COUNT,
  DATA_RECORD_MAX,
  DATA_RECORD_MIN,
  DATA_SEED_SALT,
  DATA_SIZE_GB_THRESHOLD,
  DATA_SIZE_MB_DIVISOR,
  DATA_SIZE_MB_MIN,
  DATA_STATUS_OPTIONS,
  DATA_TAG_MAX_COUNT,
  DATA_TAG_MIN_COUNT,
  DATA_TAG_POOL,
  DATA_TYPE_OPTIONS,
  DATA_UPDATE_DAY_MAX,
  DATA_UPDATE_DAY_MIN,
  DATA_UPDATE_HOUR_END,
  DATA_UPDATE_HOUR_START,
  DATA_UPDATE_MINUTE_MIN,
  DATA_UPDATE_MINUTE_MAX,
  DATA_UPDATE_MONTH_MIN,
  DATA_UPDATE_MONTH_MAX,
  DATA_UPDATE_YEAR_END,
  DATA_UPDATE_YEAR_START,
  DATA_VERSION_POOL,
  type DataRecord,
  type DataStatusKey,
  type DataTypeKey,
} from './constants'

const padNumber = (value: number) => String(value).padStart(2, '0')

const formatUpdateTime = (year: number, month: number, day: number, hour: number, minute: number) =>
  `${year}-${padNumber(month)}-${padNumber(day)} ${padNumber(hour)}:${padNumber(minute)}`

const buildSizeLabel = (records: number) => {
  const sizeMb = Math.max(DATA_SIZE_MB_MIN, Math.round(records / DATA_SIZE_MB_DIVISOR))
  if (sizeMb >= DATA_SIZE_GB_THRESHOLD) {
    return `${(sizeMb / DATA_SIZE_GB_THRESHOLD).toFixed(1)}GB`
  }
  return `${sizeMb}MB`
}

const buildDescription = (template: string, surname: string, coverage: string) =>
  template.replace('{surname}', surname).replace('{coverage}', coverage)

const getTypeKey = (index: number) => DATA_TYPE_OPTIONS[index % DATA_TYPE_OPTIONS.length]?.key

export const buildDataRecords = (sourceKey: MapSourceKey): DataRecord[] => {
  const baseSeed = getSourceSeed(sourceKey)
  const random = createSeededRandom(deriveSeed(baseSeed, DATA_SEED_SALT))

  return Array.from({ length: DATA_RECORD_COUNT }, (_, index) => {
    const surname = random.pick(MOCK_SURNAMES)
    const typeKey = (getTypeKey(index) ?? 'archive') as DataTypeKey
    const statusKey = random.pick(DATA_STATUS_OPTIONS).key as DataStatusKey
    const coverage = random.pick(DATA_COVERAGE_POOL)
    const nameTemplate = random.pick(DATA_NAME_TEMPLATES)
    const descriptionTemplate = random.pick(DATA_DESCRIPTION_TEMPLATES)
    const recordCount = random.int(DATA_RECORD_MIN, DATA_RECORD_MAX)
    const updateTime = formatUpdateTime(
      random.int(DATA_UPDATE_YEAR_START, DATA_UPDATE_YEAR_END),
      random.int(DATA_UPDATE_MONTH_MIN, DATA_UPDATE_MONTH_MAX),
      random.int(DATA_UPDATE_DAY_MIN, DATA_UPDATE_DAY_MAX),
      random.int(DATA_UPDATE_HOUR_START, DATA_UPDATE_HOUR_END),
      random.int(DATA_UPDATE_MINUTE_MIN, DATA_UPDATE_MINUTE_MAX),
    )

    return {
      id: index + 1,
      name: nameTemplate.replace('{surname}', surname),
      type: typeKey,
      source: random.pick(MOCK_SOURCE_NAMES),
      status: statusKey,
      updateTime,
      description: buildDescription(descriptionTemplate, surname, coverage),
      owner: random.pick(MOCK_TEAM_NAMES),
      coverage,
      records: recordCount,
      size: buildSizeLabel(recordCount),
      tags: random.pickMany(DATA_TAG_POOL, random.int(DATA_TAG_MIN_COUNT, DATA_TAG_MAX_COUNT)),
      qualityScore: random.int(DATA_QUALITY_MIN, DATA_QUALITY_MAX),
      version: random.pick(DATA_VERSION_POOL),
    }
  })
}

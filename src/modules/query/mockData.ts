import type { MapSourceKey } from '@/modules/map/dataSources'
import { MOCK_GIVEN_NAME_CHARS, MOCK_LOCATION_NAMES, MOCK_SOURCE_NAMES, MOCK_SURNAMES } from '@/modules/mock/constants'
import { getSourceSeed } from '@/modules/mock/sourceSeeds'
import { buildPersonName } from '@/utils/nameGenerator'
import { createSeededRandom, deriveSeed } from '@/utils/seededRandom'

import {
  QUERY_EVENT_NAME_POOLS,
  QUERY_EVENT_TYPES,
  QUERY_KEYWORD_MAX_COUNT,
  QUERY_KEYWORD_MIN_COUNT,
  QUERY_KEYWORD_POOL,
  QUERY_RECORD_COUNT,
  QUERY_SEED_SALT,
  QUERY_SUMMARY_TEMPLATES,
  QUERY_TIME_RANGE_PRESETS,
  type EventTypeKey,
  type QueryData,
  type QueryRecord,
} from './constants'

const buildSummary = (template: string, payload: Record<string, string | number>) =>
  template
    .replace('{year}', String(payload.year))
    .replace('{person}', String(payload.person))
    .replace('{location}', String(payload.location))
    .replace('{event}', String(payload.event))
    .replace('{keyword}', String(payload.keyword))

const getTimeRanges = (sourceKey: MapSourceKey) =>
  QUERY_TIME_RANGE_PRESETS[sourceKey] ?? QUERY_TIME_RANGE_PRESETS.yuan

export const buildQueryData = (sourceKey: MapSourceKey): QueryData => {
  const baseSeed = getSourceSeed(sourceKey)
  const random = createSeededRandom(deriveSeed(baseSeed, QUERY_SEED_SALT))
  const timeRanges = getTimeRanges(sourceKey)
  const safeRanges = timeRanges.length > 0 ? timeRanges : QUERY_TIME_RANGE_PRESETS.yuan
  const records: QueryRecord[] = []

  for (let i = 0; i < QUERY_RECORD_COUNT; i += 1) {
    const range = safeRanges[i % safeRanges.length] as (typeof safeRanges)[number]
    const surname = random.pick(MOCK_SURNAMES)
    const personName = buildPersonName(random, surname, { givenNameChars: MOCK_GIVEN_NAME_CHARS })
    const eventType = random.pick(QUERY_EVENT_TYPES).key as EventTypeKey
    const eventName = random.pick(QUERY_EVENT_NAME_POOLS[eventType])
    const location = random.pick(MOCK_LOCATION_NAMES)
    const year = random.int(range.startYear, range.endYear)
    const keywords = random.pickMany(
      QUERY_KEYWORD_POOL,
      random.int(QUERY_KEYWORD_MIN_COUNT, QUERY_KEYWORD_MAX_COUNT),
    )
    const summaryTemplate = random.pick(QUERY_SUMMARY_TEMPLATES)
    const summary = buildSummary(summaryTemplate, {
      year,
      person: personName,
      location,
      event: eventName,
      keyword: keywords[0] ?? eventName,
    })

    records.push({
      id: i + 1,
      personName,
      surname,
      eventName,
      eventType,
      location,
      year,
      summary,
      keywords,
      source: random.pick(MOCK_SOURCE_NAMES),
    })
  }

  return { records, timeRanges: safeRanges }
}

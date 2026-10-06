import type { QueryRecord, QueryTimeRange } from '@prisma/client'

import { parseJsonArray } from '../../utils/validators'

export const toQueryRecordDto = (record: QueryRecord) => ({
  id: record.id,
  source_key: record.sourceKey,
  person_name: record.personName,
  surname: record.surname,
  event_name: record.eventName,
  event_type: record.eventType,
  location: record.location,
  year: record.year,
  summary: record.summary,
  keywords: parseJsonArray(record.keywords),
  source: record.source,
})

export const toQueryTimeRangeDto = (range: QueryTimeRange) => ({
  id: range.id,
  source_key: range.sourceKey,
  key: range.key,
  label: range.label,
  start_year: range.startYear,
  end_year: range.endYear,
})

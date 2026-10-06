import type { Request, Response } from 'express'

import { ApiError } from '../../utils/errors'
import { asyncHandler } from '../../utils/asyncHandler'
import { getPagination } from '../../utils/pagination'
import { buildSuccess } from '../../utils/response'
import { parseNumber, parseStringArray, requireFields, toJsonString } from '../../utils/validators'
import { toQueryRecordDto, toQueryTimeRangeDto } from './query.mapper'
import {
  createQueryRecord,
  createQueryTimeRange,
  deleteQueryRecord,
  deleteQueryTimeRange,
  getQueryRecord,
  getQueryTimeRange,
  listQueryRecords,
  listQueryTimeRanges,
  updateQueryRecord,
  updateQueryTimeRange,
} from './query.service'
import type { QueryRecordPayload, QueryTimeRangePayload } from './query.types'

const parseId = (value: string) => {
  const id = Number(value)
  if (Number.isNaN(id)) {
    throw new ApiError('无效的ID', 400, 'invalid_id')
  }
  return id
}

const parseQueryRecordPayload = (payload: QueryRecordPayload) => {
  requireFields(payload as unknown as Record<string, unknown>, [
    'source_key',
    'person_name',
    'surname',
    'event_name',
    'event_type',
    'location',
    'year',
    'summary',
    'keywords',
    'source',
  ])

  return {
    sourceKey: payload.source_key,
    personName: payload.person_name,
    surname: payload.surname,
    eventName: payload.event_name,
    eventType: payload.event_type,
    location: payload.location,
    year: parseNumber(payload.year, 'year'),
    summary: payload.summary,
    keywords: toJsonString(payload.keywords),
    source: payload.source,
  }
}

const parseQueryTimeRangePayload = (payload: QueryTimeRangePayload) => {
  requireFields(payload as unknown as Record<string, unknown>, [
    'source_key',
    'key',
    'label',
    'start_year',
    'end_year',
  ])

  return {
    sourceKey: payload.source_key,
    key: payload.key,
    label: payload.label,
    startYear: parseNumber(payload.start_year, 'start_year'),
    endYear: parseNumber(payload.end_year, 'end_year'),
  }
}

export const listRecords = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, skip, take } = getPagination(req)
  const sourceKey = typeof req.query.source_key === 'string' ? req.query.source_key : undefined
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : undefined
  const eventTypes = parseStringArray(req.query.event_types)
  const timeRangeKeys = parseStringArray(req.query.time_range_keys)

  const { total, records } = await listQueryRecords({
    sourceKey,
    keyword,
    eventTypes,
    timeRangeKeys,
    page,
    pageSize,
    skip,
    take,
  })

  res.json(
    buildSuccess({
      items: records.map(toQueryRecordDto),
      page,
      page_size: pageSize,
      total,
    }),
  )
})

export const getRecord = asyncHandler(async (req: Request, res: Response) => {
  const record = await getQueryRecord(parseId(req.params.id))
  if (!record) {
    throw new ApiError('记录不存在', 404, 'not_found')
  }
  res.json(buildSuccess(toQueryRecordDto(record)))
})

export const createRecord = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseQueryRecordPayload(req.body as QueryRecordPayload)
  const record = await createQueryRecord(payload)
  res.status(201).json(buildSuccess(toQueryRecordDto(record), 'created'))
})

export const updateRecord = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseQueryRecordPayload(req.body as QueryRecordPayload)
  const record = await updateQueryRecord(parseId(req.params.id), payload)
  res.json(buildSuccess(toQueryRecordDto(record), 'updated'))
})

export const deleteRecord = asyncHandler(async (req: Request, res: Response) => {
  await deleteQueryRecord(parseId(req.params.id))
  res.json(buildSuccess({ id: Number(req.params.id) }, 'deleted'))
})

export const listTimeRanges = asyncHandler(async (req: Request, res: Response) => {
  const sourceKey = typeof req.query.source_key === 'string' ? req.query.source_key : undefined
  const ranges = await listQueryTimeRanges(sourceKey)
  res.json(buildSuccess({ items: ranges.map(toQueryTimeRangeDto) }))
})

export const getTimeRange = asyncHandler(async (req: Request, res: Response) => {
  const range = await getQueryTimeRange(parseId(req.params.id))
  if (!range) {
    throw new ApiError('时间段不存在', 404, 'not_found')
  }
  res.json(buildSuccess(toQueryTimeRangeDto(range)))
})

export const createTimeRange = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseQueryTimeRangePayload(req.body as QueryTimeRangePayload)
  const range = await createQueryTimeRange(payload)
  res.status(201).json(buildSuccess(toQueryTimeRangeDto(range), 'created'))
})

export const updateTimeRange = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseQueryTimeRangePayload(req.body as QueryTimeRangePayload)
  const range = await updateQueryTimeRange(parseId(req.params.id), payload)
  res.json(buildSuccess(toQueryTimeRangeDto(range), 'updated'))
})

export const deleteTimeRange = asyncHandler(async (req: Request, res: Response) => {
  await deleteQueryTimeRange(parseId(req.params.id))
  res.json(buildSuccess({ id: Number(req.params.id) }, 'deleted'))
})

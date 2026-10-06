import type { Request, Response } from 'express'

import { ApiError } from '../../utils/errors'
import { asyncHandler } from '../../utils/asyncHandler'
import { getPagination } from '../../utils/pagination'
import { buildSuccess } from '../../utils/response'
import { parseNumber, parseStringArray, requireFields, toJsonString } from '../../utils/validators'
import { toDataRecordDto } from './data.mapper'
import {
  createDataRecord,
  deleteDataRecord,
  getDataRecord,
  listDataRecords,
  updateDataRecord,
} from './data.service'
import type { DataRecordPayload } from './data.types'

const parseId = (value: string) => {
  const id = Number(value)
  if (Number.isNaN(id)) {
    throw new ApiError('无效的ID', 400, 'invalid_id')
  }
  return id
}

const parseDataRecordPayload = (payload: DataRecordPayload) => {
  requireFields(payload as unknown as Record<string, unknown>, [
    'source_key',
    'name',
    'type',
    'source',
    'status',
    'update_time',
    'description',
    'owner',
    'coverage',
    'records',
    'size',
    'tags',
    'quality_score',
    'version',
  ])

  return {
    sourceKey: payload.source_key,
    name: payload.name,
    type: payload.type,
    source: payload.source,
    status: payload.status,
    updateTime: payload.update_time,
    description: payload.description,
    owner: payload.owner,
    coverage: payload.coverage,
    records: parseNumber(payload.records, 'records'),
    size: payload.size,
    tags: toJsonString(payload.tags),
    quality: parseNumber(payload.quality_score, 'quality_score'),
    version: payload.version,
  }
}

export const listRecords = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, skip, take } = getPagination(req)
  const sourceKey = typeof req.query.source_key === 'string' ? req.query.source_key : undefined
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : undefined
  const type = typeof req.query.type === 'string' ? req.query.type : undefined
  const status = typeof req.query.status === 'string' ? req.query.status : undefined

  const { total, records } = await listDataRecords({
    sourceKey,
    keyword,
    type,
    status,
    page,
    pageSize,
    skip,
    take,
  })

  res.json(
    buildSuccess({
      items: records.map(toDataRecordDto),
      page,
      page_size: pageSize,
      total,
    }),
  )
})

export const getRecord = asyncHandler(async (req: Request, res: Response) => {
  const record = await getDataRecord(parseId(req.params.id))
  if (!record) {
    throw new ApiError('记录不存在', 404, 'not_found')
  }
  res.json(buildSuccess(toDataRecordDto(record)))
})

export const createRecord = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseDataRecordPayload(req.body as DataRecordPayload)
  const record = await createDataRecord(payload)
  res.status(201).json(buildSuccess(toDataRecordDto(record), 'created'))
})

export const updateRecord = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseDataRecordPayload(req.body as DataRecordPayload)
  const record = await updateDataRecord(parseId(req.params.id), payload)
  res.json(buildSuccess(toDataRecordDto(record), 'updated'))
})

export const deleteRecord = asyncHandler(async (req: Request, res: Response) => {
  await deleteDataRecord(parseId(req.params.id))
  res.json(buildSuccess({ id: Number(req.params.id) }, 'deleted'))
})

export const listTags = asyncHandler(async (req: Request, res: Response) => {
  const tags = parseStringArray(req.query.tags)
  res.json(buildSuccess({ items: tags }))
})

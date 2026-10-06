import type { Request, Response } from 'express'

import { ApiError } from '../../utils/errors'
import { asyncHandler } from '../../utils/asyncHandler'
import { buildSuccess } from '../../utils/response'
import { parseNumber, requireFields } from '../../utils/validators'
import { toEvolutionFlowDto, toEvolutionPeriodDto } from './evolution.mapper'
import {
  createEvolutionFlow,
  createEvolutionPeriod,
  deleteEvolutionFlow,
  deleteEvolutionPeriod,
  getEvolutionFlow,
  getEvolutionPeriod,
  listEvolutionFlows,
  listEvolutionPeriods,
  updateEvolutionFlow,
  updateEvolutionPeriod,
} from './evolution.service'
import type { EvolutionFlowPayload, EvolutionPeriodPayload } from './evolution.types'

const parseId = (value: string) => {
  const id = Number(value)
  if (Number.isNaN(id)) {
    throw new ApiError('无效的ID', 400, 'invalid_id')
  }
  return id
}

const parsePeriodPayload = (payload: EvolutionPeriodPayload) => {
  requireFields(payload as unknown as Record<string, unknown>, [
    'source_key',
    'key',
    'label',
    'range',
    'summary',
  ])

  return {
    sourceKey: payload.source_key,
    key: payload.key,
    label: payload.label,
    range: payload.range,
    summary: payload.summary,
  }
}

const parseFlowPayload = (payload: EvolutionFlowPayload) => {
  requireFields(payload as unknown as Record<string, unknown>, [
    'source_key',
    'flow_id',
    'period_key',
    'surname',
    'from_name',
    'from_lng',
    'from_lat',
    'to_name',
    'to_lng',
    'to_lat',
    'intensity',
    'note',
  ])

  return {
    sourceKey: payload.source_key,
    flowId: payload.flow_id,
    periodKey: payload.period_key,
    surname: payload.surname,
    fromName: payload.from_name,
    fromLng: parseNumber(payload.from_lng, 'from_lng'),
    fromLat: parseNumber(payload.from_lat, 'from_lat'),
    toName: payload.to_name,
    toLng: parseNumber(payload.to_lng, 'to_lng'),
    toLat: parseNumber(payload.to_lat, 'to_lat'),
    intensity: parseNumber(payload.intensity, 'intensity'),
    note: payload.note,
  }
}

export const listPeriods = asyncHandler(async (req: Request, res: Response) => {
  const sourceKey = typeof req.query.source_key === 'string' ? req.query.source_key : undefined
  const periods = await listEvolutionPeriods(sourceKey)
  res.json(buildSuccess({ items: periods.map(toEvolutionPeriodDto) }))
})

export const listFlows = asyncHandler(async (req: Request, res: Response) => {
  const sourceKey = typeof req.query.source_key === 'string' ? req.query.source_key : undefined
  const periodKey = typeof req.query.period_key === 'string' ? req.query.period_key : undefined
  const flows = await listEvolutionFlows({ sourceKey, periodKey })
  res.json(buildSuccess({ items: flows.map(toEvolutionFlowDto) }))
})

export const getPeriod = asyncHandler(async (req: Request, res: Response) => {
  const period = await getEvolutionPeriod(parseId(req.params.id))
  if (!period) {
    throw new ApiError('时期不存在', 404, 'not_found')
  }
  res.json(buildSuccess(toEvolutionPeriodDto(period)))
})

export const getFlow = asyncHandler(async (req: Request, res: Response) => {
  const flow = await getEvolutionFlow(parseId(req.params.id))
  if (!flow) {
    throw new ApiError('迁徙记录不存在', 404, 'not_found')
  }
  res.json(buildSuccess(toEvolutionFlowDto(flow)))
})

export const createPeriod = asyncHandler(async (req: Request, res: Response) => {
  const payload = parsePeriodPayload(req.body as EvolutionPeriodPayload)
  const period = await createEvolutionPeriod(payload)
  res.status(201).json(buildSuccess(toEvolutionPeriodDto(period), 'created'))
})

export const updatePeriod = asyncHandler(async (req: Request, res: Response) => {
  const payload = parsePeriodPayload(req.body as EvolutionPeriodPayload)
  const period = await updateEvolutionPeriod(parseId(req.params.id), payload)
  res.json(buildSuccess(toEvolutionPeriodDto(period), 'updated'))
})

export const deletePeriod = asyncHandler(async (req: Request, res: Response) => {
  await deleteEvolutionPeriod(parseId(req.params.id))
  res.json(buildSuccess({ id: Number(req.params.id) }, 'deleted'))
})

export const createFlow = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseFlowPayload(req.body as EvolutionFlowPayload)
  const flow = await createEvolutionFlow(payload)
  res.status(201).json(buildSuccess(toEvolutionFlowDto(flow), 'created'))
})

export const updateFlow = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseFlowPayload(req.body as EvolutionFlowPayload)
  const flow = await updateEvolutionFlow(parseId(req.params.id), payload)
  res.json(buildSuccess(toEvolutionFlowDto(flow), 'updated'))
})

export const deleteFlow = asyncHandler(async (req: Request, res: Response) => {
  await deleteEvolutionFlow(parseId(req.params.id))
  res.json(buildSuccess({ id: Number(req.params.id) }, 'deleted'))
})

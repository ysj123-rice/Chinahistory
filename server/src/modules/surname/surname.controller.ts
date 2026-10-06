import type { Request, Response } from 'express'

import { ApiError } from '../../utils/errors'
import { asyncHandler } from '../../utils/asyncHandler'
import { buildSuccess } from '../../utils/response'
import {
  getSurnameOrigin,
  listRouteSurnames,
  listSurnameOrigins,
  listSurnameRoutes,
} from './surname.service'

export const getOrigin = asyncHandler(async (req: Request, res: Response) => {
  const surname = String(req.params.surname ?? '').trim()
  if (!surname) {
    throw new ApiError('缺少姓氏参数', 400, 'missing_surname')
  }
  const origin = await getSurnameOrigin(surname)
  if (!origin) {
    throw new ApiError('未找到该姓氏的源流数据', 404, 'not_found')
  }
  res.json(buildSuccess(origin))
})

export const listOrigins = asyncHandler(async (req: Request, res: Response) => {
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : undefined
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50
  const items = await listSurnameOrigins(keyword || undefined, Number.isFinite(limit) ? limit : 50)
  res.json(buildSuccess({ items, total: items.length }))
})

export const listRoutes = asyncHandler(async (req: Request, res: Response) => {
  const surname = typeof req.query.surname === 'string' ? req.query.surname.trim() : undefined
  const routes = await listSurnameRoutes(surname || undefined)
  res.json(buildSuccess({ items: routes, total: routes.length }))
})

export const listRouteSurnameOptions = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await listRouteSurnames()
  res.json(buildSuccess({ items: rows.map((row) => row.surname) }))
})

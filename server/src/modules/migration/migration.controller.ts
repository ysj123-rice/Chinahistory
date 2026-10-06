import type { Request, Response } from 'express'

import { asyncHandler } from '../../utils/asyncHandler'
import { buildSuccess } from '../../utils/response'
import { listMigrationCauses, listMigrationEvents } from './migration.service'

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  const cause = typeof req.query.cause === 'string' ? req.query.cause.trim() : undefined
  const dynasty = typeof req.query.dynasty === 'string' ? req.query.dynasty.trim() : undefined
  const minYear = typeof req.query.min_year === 'string' ? Number(req.query.min_year) : undefined

  const items = await listMigrationEvents({
    cause: cause || undefined,
    dynasty: dynasty || undefined,
    minYear: Number.isFinite(minYear) ? minYear : undefined,
  })
  res.json(buildSuccess({ items, total: items.length }))
})

export const listCauses = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await listMigrationCauses()
  res.json(buildSuccess({ items: rows.map((row) => row.cause) }))
})

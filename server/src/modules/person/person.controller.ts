import type { Request, Response } from 'express'

import { asyncHandler } from '../../utils/asyncHandler'
import { buildSuccess } from '../../utils/response'
import { listPersonPoints, listSourceCounts, listSurnameCounts } from './person.service'

export const getPoints = asyncHandler(async (req: Request, res: Response) => {
  const sourceKey = typeof req.query.source_key === 'string' ? req.query.source_key.trim() : undefined
  const surname = typeof req.query.surname === 'string' ? req.query.surname.trim() : undefined
  const includeHidden = req.query.all === 'true'

  const items = await listPersonPoints({
    sourceKey: sourceKey || undefined,
    surname: surname || undefined,
    includeHidden,
  })
  res.json(buildSuccess({ items, total: items.length }))
})

export const getSurnameCounts = asyncHandler(async (req: Request, res: Response) => {
  const sourceKey = typeof req.query.source_key === 'string' ? req.query.source_key.trim() : undefined
  const includeHidden = req.query.all === 'true'
  const items = await listSurnameCounts(sourceKey || undefined, includeHidden)
  res.json(buildSuccess({ items }))
})

export const getSourceCounts = asyncHandler(async (_req: Request, res: Response) => {
  const items = await listSourceCounts()
  res.json(buildSuccess({ items }))
})

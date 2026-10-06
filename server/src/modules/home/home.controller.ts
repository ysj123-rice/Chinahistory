import type { Request, Response } from 'express'

import { asyncHandler } from '../../utils/asyncHandler'
import { ApiError } from '../../utils/errors'
import { buildSuccess } from '../../utils/response'
import { SOURCE_KEYS, type SourceKey } from '../../constants/sourceKeys'
import { buildHomeSummary } from './home.service'

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const sourceKey = req.query.source_key
  if (typeof sourceKey !== 'string') {
    throw new ApiError('缺少 source_key', 400, 'missing_fields')
  }
  if (!SOURCE_KEYS.includes(sourceKey as SourceKey)) {
    throw new ApiError('无效的 source_key', 400, 'invalid_source')
  }
  const summary = await buildHomeSummary(sourceKey as SourceKey)
  res.json(buildSuccess(summary))
})

import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../utils/errors'
import { buildFailure } from '../utils/response'

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof ApiError) {
    res.status(error.status).json(buildFailure(error.message, error.code))
    return
  }

  console.error('服务器异常', error)
  res.status(500).json(buildFailure('服务器异常', 'internal_error'))
}

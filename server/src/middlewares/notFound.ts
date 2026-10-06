import type { Request, Response } from 'express'

import { buildFailure } from '../utils/response'

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json(buildFailure('资源不存在', 'not_found'))
}

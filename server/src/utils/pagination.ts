import type { Request } from 'express'

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE } from '../constants/http'

const parseNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  return fallback
}

export const getPagination = (req: Request) => {
  const page = Math.max(DEFAULT_PAGE, parseNumber(req.query.page, DEFAULT_PAGE))
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(MIN_PAGE_SIZE, parseNumber(req.query.page_size, DEFAULT_PAGE_SIZE)),
  )
  const skip = (page - 1) * pageSize

  return {
    page,
    pageSize,
    skip,
    take: pageSize,
  }
}

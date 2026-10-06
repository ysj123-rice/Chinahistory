import type { Prisma } from '@prisma/client'

import { prisma } from '../../prisma/client'

type ListQueryRecordsParams = {
  sourceKey?: string
  keyword?: string
  eventTypes?: string[]
  timeRangeKeys?: string[]
  page: number
  pageSize: number
  skip: number
  take: number
}

export const listQueryRecords = async (params: ListQueryRecordsParams) => {
  const { sourceKey, keyword, eventTypes, timeRangeKeys, skip, take } = params

  const where: Prisma.QueryRecordWhereInput = {}
  if (sourceKey) {
    where.sourceKey = sourceKey
  }
  if (eventTypes && eventTypes.length > 0) {
    where.eventType = { in: eventTypes }
  }
  if (keyword) {
    const contains = { contains: keyword }
    where.OR = [
      { personName: contains },
      { surname: contains },
      { eventName: contains },
      { location: contains },
      { summary: contains },
      { keywords: contains },
      { source: contains },
    ]
  }

  if (timeRangeKeys && timeRangeKeys.length > 0) {
    const ranges = await prisma.queryTimeRange.findMany({
      where: { key: { in: timeRangeKeys }, ...(sourceKey ? { sourceKey } : {}) },
      select: { startYear: true, endYear: true },
    })

    if (ranges.length > 0) {
      where.AND = [
        {
          OR: ranges.map((range: { startYear: number; endYear: number }) => ({
            year: {
              gte: range.startYear,
              lte: range.endYear,
            },
          })),
        },
      ]
    }
  }

  const [total, records] = await prisma.$transaction([
    prisma.queryRecord.count({ where }),
    prisma.queryRecord.findMany({ where, orderBy: { year: 'desc' }, skip, take }),
  ])

  return { total, records }
}

export const getQueryRecord = (id: number) => prisma.queryRecord.findUnique({ where: { id } })

export const createQueryRecord = (data: Prisma.QueryRecordCreateInput) =>
  prisma.queryRecord.create({ data })

export const updateQueryRecord = (id: number, data: Prisma.QueryRecordUpdateInput) =>
  prisma.queryRecord.update({ where: { id }, data })

export const deleteQueryRecord = (id: number) => prisma.queryRecord.delete({ where: { id } })

export const listQueryTimeRanges = (sourceKey?: string) =>
  prisma.queryTimeRange.findMany({
    where: sourceKey ? { sourceKey } : {},
    orderBy: { startYear: 'asc' },
  })

export const getQueryTimeRange = (id: number) => prisma.queryTimeRange.findUnique({ where: { id } })

export const createQueryTimeRange = (data: Prisma.QueryTimeRangeCreateInput) =>
  prisma.queryTimeRange.create({ data })

export const updateQueryTimeRange = (id: number, data: Prisma.QueryTimeRangeUpdateInput) =>
  prisma.queryTimeRange.update({ where: { id }, data })

export const deleteQueryTimeRange = (id: number) => prisma.queryTimeRange.delete({ where: { id } })

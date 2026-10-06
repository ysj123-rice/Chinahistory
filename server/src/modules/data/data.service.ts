import type { Prisma } from '@prisma/client'

import { prisma } from '../../prisma/client'

type ListDataRecordsParams = {
  sourceKey?: string
  keyword?: string
  type?: string
  status?: string
  page: number
  pageSize: number
  skip: number
  take: number
}

export const listDataRecords = async (params: ListDataRecordsParams) => {
  const { sourceKey, keyword, type, status, skip, take } = params
  const where: Prisma.DataRecordWhereInput = {}

  if (sourceKey) {
    where.sourceKey = sourceKey
  }
  if (type) {
    where.type = type
  }
  if (status) {
    where.status = status
  }
  if (keyword) {
    const contains = { contains: keyword }
    where.OR = [
      { name: contains },
      { description: contains },
      { owner: contains },
      { coverage: contains },
      { tags: contains },
    ]
  }

  const [total, records] = await prisma.$transaction([
    prisma.dataRecord.count({ where }),
    prisma.dataRecord.findMany({ where, orderBy: { updateTime: 'desc' }, skip, take }),
  ])

  return { total, records }
}

export const getDataRecord = (id: number) => prisma.dataRecord.findUnique({ where: { id } })

export const createDataRecord = (data: Prisma.DataRecordCreateInput) =>
  prisma.dataRecord.create({ data })

export const updateDataRecord = (id: number, data: Prisma.DataRecordUpdateInput) =>
  prisma.dataRecord.update({ where: { id }, data })

export const deleteDataRecord = (id: number) => prisma.dataRecord.delete({ where: { id } })

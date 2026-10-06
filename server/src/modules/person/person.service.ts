import { prisma } from '../../prisma/client'

export type PersonPoint = {
  id: number
  personName: string
  surname: string
  year: number
  jiguanName: string | null
  dynastyName: string | null
  sourceKey: string
  lng: number
  lat: number
}

type ListPointsParams = {
  sourceKey?: string
  surname?: string
  includeHidden?: boolean
}

/** 真实历史人物籍贯点（仅返回有坐标的 CBDB 记录） */
export const listPersonPoints = async (params: ListPointsParams): Promise<PersonPoint[]> => {
  const rows = await prisma.queryRecord.findMany({
    where: {
      isReal: true,
      lng: { not: null },
      lat: { not: null },
      ...(params.includeHidden ? {} : { visible: true }),
      ...(params.sourceKey ? { sourceKey: params.sourceKey } : {}),
      ...(params.surname ? { surname: params.surname } : {}),
    },
    select: {
      id: true,
      personName: true,
      surname: true,
      year: true,
      jiguanName: true,
      dynastyName: true,
      sourceKey: true,
      lng: true,
      lat: true,
    },
    orderBy: { year: 'asc' },
  })

  return rows
    .filter((row) => row.lng !== null && row.lat !== null)
    .map((row) => ({ ...row, lng: row.lng as number, lat: row.lat as number }))
}

/** 某朝代下各姓氏人数（供图例/筛选与点密度着色） */
export const listSurnameCounts = async (sourceKey?: string, includeHidden = false) => {
  const groups = await prisma.queryRecord.groupBy({
    by: ['surname'],
    where: {
      isReal: true,
      lng: { not: null },
      ...(includeHidden ? {} : { visible: true }),
      ...(sourceKey ? { sourceKey } : {}),
    },
    _count: { _all: true },
    orderBy: { _count: { surname: 'desc' } },
  })
  return groups.map((group) => ({ surname: group.surname, count: group._count._all }))
}

/** 各 sourceKey 真实人物数量（供前端判断是否有真实数据） */
export const listSourceCounts = async () => {
  const groups = await prisma.queryRecord.groupBy({
    by: ['sourceKey'],
    where: { isReal: true, lng: { not: null }, visible: true },
    _count: { _all: true },
  })
  return groups.map((group) => ({ sourceKey: group.sourceKey, count: group._count._all }))
}

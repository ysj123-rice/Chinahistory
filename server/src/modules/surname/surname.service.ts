import { prisma } from '../../prisma/client'

export const getSurnameOrigin = (surname: string) =>
  prisma.surnameOrigin.findUnique({ where: { surname } })

export const listSurnameOrigins = async (keyword?: string, limit = 50) => {
  const take = Math.min(Math.max(limit, 1), 500)
  return prisma.surnameOrigin.findMany({
    where: keyword
      ? {
          OR: [
            { surname: { contains: keyword } },
            { originPlace: { contains: keyword } },
            { junwang: { contains: keyword } },
            { deriveType: { contains: keyword } },
          ],
        }
      : undefined,
    orderBy: { confidence: 'desc' },
    take,
  })
}

type RouteGroup = {
  routeId: number
  surname: string
  dynasty: string
  event: string
  description: string | null
  sourceRef: string | null
  points: Array<{
    pointType: number
    placeOld: string
    placeNew: string
    lng: number
    lat: number
  }>
}

/** 分姓氏迁徙路线：把路线点按 routeId 聚合成线 */
export const listSurnameRoutes = async (surname?: string): Promise<RouteGroup[]> => {
  const points = await prisma.surnameMigrationPoint.findMany({
    where: surname ? { surname } : {},
    orderBy: [{ routeId: 'asc' }, { pointType: 'asc' }],
  })

  const groups = new Map<number, RouteGroup>()
  for (const point of points) {
    let group = groups.get(point.routeId)
    if (!group) {
      group = {
        routeId: point.routeId,
        surname: point.surname,
        dynasty: point.dynasty,
        event: point.event,
        description: point.description,
        sourceRef: point.sourceRef,
        points: [],
      }
      groups.set(point.routeId, group)
    }
    group.points.push({
      pointType: point.pointType,
      placeOld: point.placeOld,
      placeNew: point.placeNew,
      lng: point.lng,
      lat: point.lat,
    })
  }

  return [...groups.values()]
}

export const listRouteSurnames = () =>
  prisma.surnameMigrationPoint.findMany({
    distinct: ['surname'],
    select: { surname: true },
    orderBy: { surname: 'asc' },
  })

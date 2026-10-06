import { API_ENDPOINTS } from '@/constants/api'
import { apiGet } from '@/utils/http'

export type MigrationEvent = {
  id: number
  name: string
  era: string
  startYear: number
  endYear: number
  cause: string
  fromRegion: string
  fromLng: number
  fromLat: number
  toRegion: string
  toLng: number
  toLat: number
  scale: string | null
  intensity: number
  surnames: string | null
  populationEstimate: string | null
  description: string | null
  sourceRef: string | null
  confidence: number
}

export type RoutePoint = {
  pointType: number
  placeOld: string
  placeNew: string
  lng: number
  lat: number
}

export type RouteGroup = {
  routeId: number
  surname: string
  dynasty: string
  event: string
  description: string | null
  sourceRef: string | null
  points: RoutePoint[]
}

type EventsResponse = {
  items: MigrationEvent[]
  total: number
}

type RoutesResponse = {
  items: RouteGroup[]
  total: number
}

// 迁徙数据跨所有朝代，全局只拉一次
let eventsPromise: Promise<MigrationEvent[]> | null = null
let routesPromise: Promise<RouteGroup[]> | null = null

export const fetchMigrationEvents = (): Promise<MigrationEvent[]> => {
  if (!eventsPromise) {
    eventsPromise = apiGet<EventsResponse>(API_ENDPOINTS.migrationEvents)
      .then((res) => res.items)
      .catch((error) => {
        console.error('宏观迁徙事件加载失败', error)
        eventsPromise = null
        return []
      })
  }
  return eventsPromise
}

export const fetchAllMigrationRoutes = (): Promise<RouteGroup[]> => {
  if (!routesPromise) {
    routesPromise = apiGet<RoutesResponse>(API_ENDPOINTS.surnameRoutes)
      .then((res) => res.items)
      .catch((error) => {
        console.error('姓氏迁徙路线加载失败', error)
        routesPromise = null
        return []
      })
  }
  return routesPromise
}

import { API_ENDPOINTS } from '@/constants/api'
import { apiGet } from '@/utils/http'

/** 姓氏源流（surname_origins 表，全部为真实采集数据） */
export type SurnameOrigin = {
  surname: string
  originEra: string
  originPlace: string
  deriveType: string
  originStory: string
  originStoryDetail: string
  junwang: string
  firstAncestor: string
  firstAncestorTitle: string
  majorDistribution: string
  hallNames: string
  sourceRef: string
  sourceUrl: string
  confidence: string
}

/** 分姓氏迁徙路线点（用于起源地坐标匹配） */
export type SurnameRouteGroup = {
  routeId: string
  surname: string
  dynasty: string
  event: string
  points: Array<{
    lng: number
    lat: number
    placeOld: string
    placeNew: string
    pointType: number
  }>
}

export const fetchSurnameOrigin = async (surname: string): Promise<SurnameOrigin | null> => {
  try {
    // apiGet 已剥壳返回 data 并转驼峰；无记录时后端返回 data: null
    const origin = await apiGet<SurnameOrigin | null>(
      `${API_ENDPOINTS.surnameOrigin}/${encodeURIComponent(surname)}`,
    )
    return origin ?? null
  } catch {
    // 无源流记录的姓氏返回 null，由调用方展示空状态
    return null
  }
}

export const fetchSurnameRouteGroups = async (surname: string): Promise<SurnameRouteGroup[]> => {
  try {
    const result = await apiGet<{ groups: SurnameRouteGroup[] }>(API_ENDPOINTS.surnameRoutes, {
      surname,
    })
    return result.groups ?? []
  } catch {
    return []
  }
}

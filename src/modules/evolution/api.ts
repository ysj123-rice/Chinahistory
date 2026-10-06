import { API_ENDPOINTS } from '@/constants/api'
import type { ApiListResult } from '@/types/api'
import { apiDelete, apiGet, apiPost, apiPut } from '@/utils/http'

import type { EvolutionFlow, EvolutionNode, EvolutionPeriod } from './constants'

export type EvolutionPeriodApi = {
  id: number
  key: string
  label: string
  range: string
  summary: string
}

export type EvolutionFlowApi = {
  id: number
  flowId: string
  periodKey: string
  surname: string
  fromName: string
  fromLng: number
  fromLat: number
  toName: string
  toLng: number
  toLat: number
  intensity: number
  note: string
}

const mapNode = (name: string, longitude: number, latitude: number): EvolutionNode => ({
  name,
  longitude,
  latitude,
})

const mapFlow = (flow: EvolutionFlowApi): EvolutionFlow => ({
  id: flow.flowId,
  periodKey: flow.periodKey,
  surname: flow.surname,
  from: mapNode(flow.fromName, flow.fromLng, flow.fromLat),
  to: mapNode(flow.toName, flow.toLng, flow.toLat),
  intensity: flow.intensity,
  note: flow.note,
})

export const fetchEvolutionPeriods = async (sourceKey: string) => {
  const result = await apiGet<ApiListResult<EvolutionPeriodApi>>(API_ENDPOINTS.evolutionPeriods, {
    source_key: sourceKey,
  })
  return result.items as EvolutionPeriod[]
}

export const fetchEvolutionFlows = async (sourceKey: string) => {
  const result = await apiGet<ApiListResult<EvolutionFlowApi>>(API_ENDPOINTS.evolutionFlows, {
    source_key: sourceKey,
  })
  return result.items.map(mapFlow)
}

export const fetchEvolutionPeriodsAdmin = async (sourceKey: string) => {
  const result = await apiGet<ApiListResult<EvolutionPeriodApi>>(API_ENDPOINTS.evolutionPeriods, {
    source_key: sourceKey,
  })
  return result.items
}

export const fetchEvolutionFlowsAdmin = async (sourceKey: string) => {
  const result = await apiGet<ApiListResult<EvolutionFlowApi>>(API_ENDPOINTS.evolutionFlows, {
    source_key: sourceKey,
  })
  return result.items
}

export type EvolutionPeriodPayload = {
  source_key: string
  key: string
  label: string
  range: string
  summary: string
}

export type EvolutionFlowPayload = {
  source_key: string
  flow_id: string
  period_key: string
  surname: string
  from_name: string
  from_lng: number
  from_lat: number
  to_name: string
  to_lng: number
  to_lat: number
  intensity: number
  note: string
}

export const createEvolutionPeriod = (payload: EvolutionPeriodPayload) =>
  apiPost<EvolutionPeriod>(API_ENDPOINTS.evolutionPeriods, payload)

export const updateEvolutionPeriod = (id: number, payload: EvolutionPeriodPayload) =>
  apiPut<EvolutionPeriod>(`${API_ENDPOINTS.evolutionPeriods}/${id}`, payload)

export const deleteEvolutionPeriod = (id: number) =>
  apiDelete<{ id: number }>(`${API_ENDPOINTS.evolutionPeriods}/${id}`)

export const createEvolutionFlow = (payload: EvolutionFlowPayload) =>
  apiPost<EvolutionFlow>(API_ENDPOINTS.evolutionFlows, payload)

export const updateEvolutionFlow = (id: number, payload: EvolutionFlowPayload) =>
  apiPut<EvolutionFlow>(`${API_ENDPOINTS.evolutionFlows}/${id}`, payload)

export const deleteEvolutionFlow = (id: number) =>
  apiDelete<{ id: number }>(`${API_ENDPOINTS.evolutionFlows}/${id}`)

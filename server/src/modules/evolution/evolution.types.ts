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

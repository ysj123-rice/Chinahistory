import type { EvolutionFlow, EvolutionPeriod } from '@prisma/client'

export const toEvolutionPeriodDto = (period: EvolutionPeriod) => ({
  id: period.id,
  source_key: period.sourceKey,
  key: period.key,
  label: period.label,
  range: period.range,
  summary: period.summary,
})

export const toEvolutionFlowDto = (flow: EvolutionFlow) => ({
  id: flow.id,
  source_key: flow.sourceKey,
  flow_id: flow.flowId,
  period_key: flow.periodKey,
  surname: flow.surname,
  from_name: flow.fromName,
  from_lng: flow.fromLng,
  from_lat: flow.fromLat,
  to_name: flow.toName,
  to_lng: flow.toLng,
  to_lat: flow.toLat,
  intensity: flow.intensity,
  note: flow.note,
})

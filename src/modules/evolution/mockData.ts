import type { MapSourceKey } from '@/modules/map/dataSources'
import { MOCK_SURNAMES } from '@/modules/mock/constants'
import { getSourceSeed } from '@/modules/mock/sourceSeeds'
import { createSeededRandom, deriveSeed } from '@/utils/seededRandom'

import {
  EVOLUTION_FLOW_COUNT_PER_PERIOD,
  EVOLUTION_FLOW_INTENSITY_MAX,
  EVOLUTION_FLOW_INTENSITY_MIN,
  EVOLUTION_NOTE_TEMPLATES,
  EVOLUTION_PERIOD_PRESETS,
  EVOLUTION_REASON_POOL,
  EVOLUTION_SEED_SALT,
  EVOLUTION_NODES,
  type EvolutionFlow,
  type EvolutionNode,
  type EvolutionNodeKey,
  type EvolutionPeriod,
} from './constants'

export type EvolutionData = {
  periods: EvolutionPeriod[]
  flows: EvolutionFlow[]
  defaultPeriodKey: string
}

const buildNote = (template: string, payload: { from: string; to: string; reason: string }) =>
  template
    .replace('{from}', payload.from)
    .replace('{to}', payload.to)
    .replace('{reason}', payload.reason)

const pickDifferentNode = (
  nodes: Array<[EvolutionNodeKey, EvolutionNode]>,
  currentKey: string,
  random: ReturnType<typeof createSeededRandom>,
) => {
  if (nodes.length === 0) {
    throw new Error('迁徙节点为空')
  }
  if (nodes.length <= 1) {
    return nodes[0] as [EvolutionNodeKey, EvolutionNode]
  }

  let candidate = random.pick(nodes)
  while (candidate[0] === currentKey) {
    candidate = random.pick(nodes)
  }
  return candidate
}

export const buildEvolutionData = (sourceKey: MapSourceKey): EvolutionData => {
  const baseSeed = getSourceSeed(sourceKey)
  const random = createSeededRandom(deriveSeed(baseSeed, EVOLUTION_SEED_SALT))
  const periods = EVOLUTION_PERIOD_PRESETS[sourceKey] ?? EVOLUTION_PERIOD_PRESETS.yuan
  const nodes = Object.entries(EVOLUTION_NODES) as Array<[EvolutionNodeKey, EvolutionNode]>
  const flows: EvolutionFlow[] = []

  periods.forEach((period) => {
    for (let i = 0; i < EVOLUTION_FLOW_COUNT_PER_PERIOD; i += 1) {
      const fromEntry = random.pick(nodes)
      const toEntry = pickDifferentNode(nodes, fromEntry[0], random)
      const surname = random.pick(MOCK_SURNAMES)
      const intensity = random.int(EVOLUTION_FLOW_INTENSITY_MIN, EVOLUTION_FLOW_INTENSITY_MAX)
      const reason = random.pick(EVOLUTION_REASON_POOL)
      const noteTemplate = random.pick(EVOLUTION_NOTE_TEMPLATES)

      flows.push({
        id: `flow-${sourceKey}-${period.key}-${i + 1}`,
        periodKey: period.key,
        surname,
        from: fromEntry[1],
        to: toEntry[1],
        intensity,
        note: buildNote(noteTemplate, {
          from: fromEntry[1].name,
          to: toEntry[1].name,
          reason,
        }),
      })
    }
  })

  return {
    periods,
    flows,
    defaultPeriodKey: periods[0]?.key ?? 'default',
  }
}

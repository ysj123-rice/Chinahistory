import './config/env'

import { prisma } from './prisma/client'
import { SOURCE_KEYS, type SourceKey } from './constants/sourceKeys'
import {
  DATA_COVERAGE_POOL,
  DATA_DESCRIPTION_TEMPLATES,
  DATA_NAME_TEMPLATES,
  DATA_RECORD_COUNT,
  DATA_TAG_POOL,
  DATA_VERSION_POOL,
  EVOLUTION_FLOW_COUNT_PER_PERIOD,
  EVOLUTION_NODE_POOL,
  EVOLUTION_NOTE_TEMPLATES,
  EVOLUTION_PERIOD_PRESETS,
  EVOLUTION_PERIOD_TEMPLATES,
  EVOLUTION_REASON_POOL,
  KNOWLEDGE_DESCRIPTION_TEMPLATES,
  KNOWLEDGE_EDGE_COUNT,
  KNOWLEDGE_EDGE_LABEL_POOL,
  KNOWLEDGE_ERA_POOL,
  KNOWLEDGE_EVENT_POOL,
  KNOWLEDGE_INSTITUTION_POOL,
  KNOWLEDGE_LAW_POOL,
  KNOWLEDGE_NODE_COUNT,
  KNOWLEDGE_OWNER_NAME_POOL,
  KNOWLEDGE_PERIOD_LABELS,
  KNOWLEDGE_TOPIC_POOL,
  KNOWLEDGE_WAR_POOL,
  KNOWLEDGE_WORK_POOL,
  QUERY_EVENT_NAME_POOLS,
  QUERY_KEYWORD_POOL,
  QUERY_RECORD_COUNT,
  QUERY_SUMMARY_TEMPLATES,
  QUERY_TIME_RANGE_PRESETS,
  SEED_GIVEN_NAME_CHARS,
  SEED_LOCATION_NAMES,
  SEED_SOURCE_NAMES,
  SEED_SURNAMES,
  SEED_TEAM_NAMES,
} from './constants/seed'
import { buildPersonName } from './utils/nameGenerator'
import { createSeededRandom, deriveSeed } from './utils/seededRandom'

const SOURCE_SEED_MAP: Record<SourceKey, number> = {
  yuan: 1327,
  tang: 762,
  ming: 1425,
  southernSong: 1174,
  northernSong: 1032,
  qing: 1644,
}

const SEED_RESET = process.env.SEED_RESET === 'true'

const buildSummary = (template: string, payload: Record<string, string | number>) =>
  template
    .replace('{year}', String(payload.year))
    .replace('{person}', String(payload.person))
    .replace('{location}', String(payload.location))
    .replace('{event}', String(payload.event))
    .replace('{keyword}', String(payload.keyword))

const buildNote = (template: string, payload: Record<string, string>) =>
  template
    .replace('{from}', payload.from)
    .replace('{to}', payload.to)
    .replace('{reason}', payload.reason)

const buildQueryRecords = (sourceKey: SourceKey) => {
  const random = createSeededRandom(deriveSeed(SOURCE_SEED_MAP[sourceKey], 'query'))
  const ranges = QUERY_TIME_RANGE_PRESETS[sourceKey]
  const eventTypes = Object.keys(QUERY_EVENT_NAME_POOLS) as Array<keyof typeof QUERY_EVENT_NAME_POOLS>

  return Array.from({ length: QUERY_RECORD_COUNT }, (_, index) => {
    const range = ranges[index % ranges.length]
    const surname = random.pick(SEED_SURNAMES)
    const personName = buildPersonName(random, surname, { givenNameChars: SEED_GIVEN_NAME_CHARS })
    const eventType = random.pick(eventTypes)
    const eventName = random.pick(QUERY_EVENT_NAME_POOLS[eventType])
    const location = random.pick(SEED_LOCATION_NAMES)
    const year = random.int(range.start, range.end)
    const keywords = random.pickMany(QUERY_KEYWORD_POOL, random.int(2, 4))
    const summary = buildSummary(random.pick(QUERY_SUMMARY_TEMPLATES), {
      year,
      person: personName,
      location,
      event: eventName,
      keyword: keywords[0] ?? eventName,
    })

    return {
      sourceKey,
      personName,
      surname,
      eventName,
      eventType,
      location,
      year,
      summary,
      keywords: JSON.stringify(keywords),
      source: random.pick(SEED_SOURCE_NAMES),
    }
  })
}

const buildQueryTimeRanges = (sourceKey: SourceKey) =>
  QUERY_TIME_RANGE_PRESETS[sourceKey].map((range) => ({
    sourceKey,
    key: range.key,
    label: range.label,
    startYear: range.start,
    endYear: range.end,
  }))

const buildDataRecords = (sourceKey: SourceKey) => {
  const random = createSeededRandom(deriveSeed(SOURCE_SEED_MAP[sourceKey], 'data'))

  return Array.from({ length: DATA_RECORD_COUNT }, (_, index) => {
    const surname = random.pick(SEED_SURNAMES)
    const nameTemplate = random.pick(DATA_NAME_TEMPLATES)
    const descriptionTemplate = random.pick(DATA_DESCRIPTION_TEMPLATES)
    const coverage = random.pick(DATA_COVERAGE_POOL)
    const recordCount = random.int(800, 18000)
    const sizeMb = Math.max(120, Math.round(recordCount / 8))
    const size = sizeMb >= 1024 ? `${(sizeMb / 1024).toFixed(1)}GB` : `${sizeMb}MB`

    const updateTime = `${random.int(2023, 2025)}-${String(random.int(1, 12)).padStart(2, '0')}-${String(
      random.int(1, 28),
    ).padStart(2, '0')} ${String(random.int(8, 18)).padStart(2, '0')}:${String(
      random.int(0, 59),
    ).padStart(2, '0')}`

    return {
      sourceKey,
      name: nameTemplate.replace('{surname}', surname),
      type: ['genealogy', 'archive', 'gazetteer', 'map', 'chronicle', 'inscription'][
        index % 6
      ],
      source: random.pick(SEED_SOURCE_NAMES),
      status: ['published', 'review', 'draft', 'archived'][index % 4],
      updateTime,
      description: descriptionTemplate.replace('{surname}', surname).replace('{coverage}', coverage),
      owner: random.pick(SEED_TEAM_NAMES),
      coverage,
      records: recordCount,
      size,
      tags: JSON.stringify(random.pickMany(DATA_TAG_POOL, random.int(2, 4))),
      quality: random.int(55, 98),
      version: random.pick(DATA_VERSION_POOL),
    }
  })
}

const pickKnowledgeType = (random: ReturnType<typeof createSeededRandom>) => {
  const weights = [
    { type: 'person', weight: 38 },
    { type: 'event', weight: 18 },
    { type: 'place', weight: 14 },
    { type: 'war', weight: 6 },
    { type: 'institution', weight: 8 },
    { type: 'work', weight: 6 },
    { type: 'period', weight: 4 },
    { type: 'law', weight: 3 },
    { type: 'clan', weight: 3 },
  ]
  const total = weights.reduce((sum, item) => sum + item.weight, 0)
  let roll = random.int(1, total)
  for (const item of weights) {
    roll -= item.weight
    if (roll <= 0) {
      return item.type
    }
  }
  return 'person'
}

const buildKnowledgeNodes = (sourceKey: SourceKey) => {
  const random = createSeededRandom(deriveSeed(SOURCE_SEED_MAP[sourceKey], 'knowledge'))
  const eraPool = KNOWLEDGE_ERA_POOL[sourceKey]
  const periodLabels = KNOWLEDGE_PERIOD_LABELS[sourceKey]

  return Array.from({ length: KNOWLEDGE_NODE_COUNT }, (_, index) => {
    const type = pickKnowledgeType(random)
    const surname = random.pick(SEED_SURNAMES)
    const label = (() => {
      switch (type) {
        case 'person':
          return buildPersonName(random, surname, { givenNameChars: SEED_GIVEN_NAME_CHARS })
        case 'event':
          return random.pick(KNOWLEDGE_EVENT_POOL)
        case 'place':
          return random.pick(SEED_LOCATION_NAMES)
        case 'war':
          return random.pick(KNOWLEDGE_WAR_POOL)
        case 'institution':
          return random.pick(KNOWLEDGE_INSTITUTION_POOL)
        case 'work':
          return random.pick(KNOWLEDGE_WORK_POOL)
        case 'period':
          return random.pick(periodLabels)
        case 'law':
          return random.pick(KNOWLEDGE_LAW_POOL)
        case 'clan':
          return `${surname}氏家族`
        default:
          return buildPersonName(random, surname, { givenNameChars: SEED_GIVEN_NAME_CHARS })
      }
    })()

    const era = random.pick(eraPool)
    const location = type === 'place' ? label : random.pick(SEED_LOCATION_NAMES)
    const topic = random.pick(KNOWLEDGE_TOPIC_POOL)
    const relatedClan = type === 'person' ? `${surname}氏家族` : null
    const description = random
      .pick(KNOWLEDGE_DESCRIPTION_TEMPLATES[type as keyof typeof KNOWLEDGE_DESCRIPTION_TEMPLATES])
      .replace('{label}', label)
      .replace('{era}', era)
      .replace('{location}', location)
      .replace('{topic}', topic)

    return {
      sourceKey,
      nodeId: `k-${sourceKey}-${type}-${index + 1}`,
      type,
      label,
      description,
      ownerName: random.pick(KNOWLEDGE_OWNER_NAME_POOL),
      era,
      location,
      relatedClan,
      source: random.pick(SEED_SOURCE_NAMES),
    }
  })
}

const buildKnowledgeEdges = (sourceKey: SourceKey, nodeIds: string[]) => {
  const random = createSeededRandom(deriveSeed(SOURCE_SEED_MAP[sourceKey], 'knowledge-edge'))
  const edgeKeys = new Set<string>()
  const edges: Array<{ edgeId: string; source: string; target: string; label: string }> = []

  while (edges.length < KNOWLEDGE_EDGE_COUNT) {
    const source = random.pick(nodeIds)
    const target = random.pick(nodeIds)
    if (source === target) {
      continue
    }
    const label = random.pick(KNOWLEDGE_EDGE_LABEL_POOL)
    const key = `${source}-${target}-${label}`
    if (edgeKeys.has(key)) {
      continue
    }
    edgeKeys.add(key)
    edges.push({ edgeId: `e-${sourceKey}-${edgeKeys.size}`, source, target, label })
  }

  return edges.map((edge) => ({
    sourceKey,
    edgeId: edge.edgeId,
    source: edge.source,
    target: edge.target,
    label: edge.label,
  }))
}

const buildEvolutionPeriods = (sourceKey: SourceKey) => {
  const presets = EVOLUTION_PERIOD_PRESETS[sourceKey]
  return EVOLUTION_PERIOD_TEMPLATES.map((template, index) => ({
    sourceKey,
    key: presets[index]?.key ?? template.label,
    label: template.label,
    range: presets[index]?.label ?? template.label,
    summary: template.summary,
  }))
}

const buildEvolutionFlows = (sourceKey: SourceKey, periodKeys: string[]) => {
  const random = createSeededRandom(deriveSeed(SOURCE_SEED_MAP[sourceKey], 'evolution'))
  const nodes = Object.values(EVOLUTION_NODE_POOL)

  const flows: Array<{
    sourceKey: string
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
  }> = []

  periodKeys.forEach((periodKey) => {
    for (let i = 0; i < EVOLUTION_FLOW_COUNT_PER_PERIOD; i += 1) {
      const from = random.pick(nodes)
      let to = random.pick(nodes)
      while (to.name === from.name) {
        to = random.pick(nodes)
      }
      const reason = random.pick(EVOLUTION_REASON_POOL)
      const note = buildNote(random.pick(EVOLUTION_NOTE_TEMPLATES), {
        from: from.name,
        to: to.name,
        reason,
      })

      flows.push({
        sourceKey,
        flowId: `flow-${sourceKey}-${periodKey}-${i + 1}`,
        periodKey,
        surname: random.pick(SEED_SURNAMES),
        fromName: from.name,
        fromLng: from.longitude,
        fromLat: from.latitude,
        toName: to.name,
        toLng: to.longitude,
        toLat: to.latitude,
        intensity: random.int(42, 98),
        note,
      })
    }
  })

  return flows
}

const seedSource = async (sourceKey: SourceKey) => {
  const hasQueryRecords = await prisma.queryRecord.count({ where: { sourceKey } })
  const hasDataRecords = await prisma.dataRecord.count({ where: { sourceKey } })
  const hasKnowledgeNodes = await prisma.knowledgeNode.count({ where: { sourceKey } })
  const hasEvolutionFlows = await prisma.evolutionFlow.count({ where: { sourceKey } })
  const hasTimeRanges = await prisma.queryTimeRange.count({ where: { sourceKey } })
  const hasPeriods = await prisma.evolutionPeriod.count({ where: { sourceKey } })

  if (hasTimeRanges === 0) {
    await prisma.queryTimeRange.createMany({ data: buildQueryTimeRanges(sourceKey) })
  }
  if (hasQueryRecords === 0) {
    await prisma.queryRecord.createMany({ data: buildQueryRecords(sourceKey) })
  }
  if (hasDataRecords === 0) {
    await prisma.dataRecord.createMany({ data: buildDataRecords(sourceKey) })
  }
  if (hasKnowledgeNodes === 0) {
    const nodes = buildKnowledgeNodes(sourceKey)
    await prisma.knowledgeNode.createMany({ data: nodes })
    const nodeIds = nodes.map((node) => node.nodeId)
    await prisma.knowledgeEdge.createMany({ data: buildKnowledgeEdges(sourceKey, nodeIds) })
  }
  if (hasPeriods === 0) {
    const periods = buildEvolutionPeriods(sourceKey)
    await prisma.evolutionPeriod.createMany({ data: periods })
    const periodKeys = periods.map((period) => period.key)
    if (hasEvolutionFlows === 0) {
      await prisma.evolutionFlow.createMany({ data: buildEvolutionFlows(sourceKey, periodKeys) })
    }
  }
}

const resetDatabase = async () => {
  await prisma.$transaction([
    prisma.knowledgeEdge.deleteMany(),
    prisma.knowledgeNode.deleteMany(),
    prisma.queryRecord.deleteMany(),
    prisma.queryTimeRange.deleteMany(),
    prisma.dataRecord.deleteMany(),
    prisma.evolutionFlow.deleteMany(),
    prisma.evolutionPeriod.deleteMany(),
  ])
}

const main = async () => {
  if (SEED_RESET) {
    await resetDatabase()
  }

  for (const sourceKey of SOURCE_KEYS) {
    await seedSource(sourceKey)
  }
}

main()
  .catch((error) => {
    console.error('Seed failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import type { MapSourceKey } from '@/modules/map/dataSources'
import {
  MOCK_GIVEN_NAME_CHARS,
  MOCK_LOCATION_NAMES,
  MOCK_SOURCE_NAMES,
  MOCK_SURNAMES,
} from '@/modules/mock/constants'
import { getSourceSeed } from '@/modules/mock/sourceSeeds'
import { buildPersonName } from '@/utils/nameGenerator'
import { createSeededRandom, deriveSeed } from '@/utils/seededRandom'

import {
  KNOWLEDGE_DESCRIPTION_TEMPLATES,
  KNOWLEDGE_EDGE_COUNT,
  KNOWLEDGE_EDGE_LIMIT_FACTOR,
  KNOWLEDGE_EDGE_LABEL_POOL,
  KNOWLEDGE_ERA_POOL,
  KNOWLEDGE_EVENT_POOL,
  KNOWLEDGE_INSTITUTION_POOL,
  KNOWLEDGE_LAW_POOL,
  KNOWLEDGE_NODE_COUNT,
  KNOWLEDGE_OWNER_NAME_POOL,
  KNOWLEDGE_PERIOD_LABELS,
  KNOWLEDGE_SEED_SALT,
  KNOWLEDGE_TOPIC_POOL,
  KNOWLEDGE_TYPE_WEIGHTS,
  KNOWLEDGE_WAR_POOL,
  KNOWLEDGE_WORK_POOL,
  type KnowledgeEdge,
  type KnowledgeNode,
  type KnowledgeNodeType,
} from './constants'

export type KnowledgeData = {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

const pickWeightedType = (random: ReturnType<typeof createSeededRandom>) => {
  const total = KNOWLEDGE_TYPE_WEIGHTS.reduce((sum, item) => sum + item.weight, 0)
  let roll = random.int(1, total)
  for (const item of KNOWLEDGE_TYPE_WEIGHTS) {
    roll -= item.weight
    if (roll <= 0) {
      return item.type
    }
  }
  return KNOWLEDGE_TYPE_WEIGHTS[0]?.type ?? 'person'
}

const buildDescription = (
  type: KnowledgeNodeType,
  label: string,
  era: string,
  location: string,
  topic: string,
  random: ReturnType<typeof createSeededRandom>,
) => {
  const template = random.pick(KNOWLEDGE_DESCRIPTION_TEMPLATES[type])
  return template
    .replace('{label}', label)
    .replace('{era}', era)
    .replace('{location}', location)
    .replace('{topic}', topic)
}

export const buildKnowledgeData = (sourceKey: MapSourceKey): KnowledgeData => {
  const baseSeed = getSourceSeed(sourceKey)
  const random = createSeededRandom(deriveSeed(baseSeed, KNOWLEDGE_SEED_SALT))
  const eraPool = KNOWLEDGE_ERA_POOL[sourceKey] ?? KNOWLEDGE_ERA_POOL.yuan
  const periodLabels = KNOWLEDGE_PERIOD_LABELS[sourceKey] ?? KNOWLEDGE_PERIOD_LABELS.yuan

  const nodes: KnowledgeNode[] = []
  for (let i = 0; i < KNOWLEDGE_NODE_COUNT; i += 1) {
    const type = pickWeightedType(random)
    const surname = random.pick(MOCK_SURNAMES)
    const label = (() => {
      switch (type) {
        case 'person':
          return buildPersonName(random, surname, { givenNameChars: MOCK_GIVEN_NAME_CHARS })
        case 'event':
          return random.pick(KNOWLEDGE_EVENT_POOL)
        case 'place':
          return random.pick(MOCK_LOCATION_NAMES)
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
          return buildPersonName(random, surname, { givenNameChars: MOCK_GIVEN_NAME_CHARS })
      }
    })()

    const era = random.pick(eraPool)
    const location = type === 'place' ? label : random.pick(MOCK_LOCATION_NAMES)
    const topic = random.pick(KNOWLEDGE_TOPIC_POOL)
    const relatedClan = type === 'person' ? `${surname}氏家族` : undefined

    nodes.push({
      id: `k-${sourceKey}-${type}-${i + 1}`,
      type,
      label,
      description: buildDescription(type, label, era, location, topic, random),
      ownerName: random.pick(KNOWLEDGE_OWNER_NAME_POOL),
      era,
      location,
      relatedClan,
      source: random.pick(MOCK_SOURCE_NAMES),
    })
  }

  const nodesByType = nodes.reduce<Record<KnowledgeNodeType, KnowledgeNode[]>>((acc, node) => {
    acc[node.type] = acc[node.type] ? [...acc[node.type], node] : [node]
    return acc
  }, {
    person: [],
    event: [],
    place: [],
    war: [],
    institution: [],
    work: [],
    period: [],
    law: [],
    clan: [],
  })

  const edges: KnowledgeEdge[] = []
  const edgeKeys = new Set<string>()

  const addEdge = (sourceId: string, targetId: string, label: string) => {
    if (!sourceId || !targetId || sourceId === targetId) {
      return
    }
    const key = `${sourceId}-${targetId}-${label}`
    if (edgeKeys.has(key)) {
      return
    }
    edgeKeys.add(key)
    edges.push({ id: `e-${edgeKeys.size}`, source: sourceId, target: targetId, label })
  }

  nodesByType.person.forEach((person) => {
    const eventNode = nodesByType.event[0] ? random.pick(nodesByType.event) : null
    const clanNode = nodesByType.clan[0] ? random.pick(nodesByType.clan) : null
    const placeNode = nodesByType.place[0] ? random.pick(nodesByType.place) : null
    if (eventNode) {
      addEdge(person.id, eventNode.id, '参与')
    }
    if (clanNode) {
      addEdge(person.id, clanNode.id, '所属')
    }
    if (placeNode) {
      addEdge(person.id, placeNode.id, '活动于')
    }
  })

  nodesByType.event.forEach((event) => {
    const placeNode = nodesByType.place[0] ? random.pick(nodesByType.place) : null
    const institutionNode = nodesByType.institution[0] ? random.pick(nodesByType.institution) : null
    if (placeNode) {
      addEdge(event.id, placeNode.id, '发生于')
    }
    if (institutionNode) {
      addEdge(event.id, institutionNode.id, '影响')
    }
  })

  nodesByType.war.forEach((war) => {
    const placeNode = nodesByType.place[0] ? random.pick(nodesByType.place) : null
    if (placeNode) {
      addEdge(war.id, placeNode.id, '波及')
    }
  })

  nodesByType.work.forEach((work) => {
    const institutionNode = nodesByType.institution[0] ? random.pick(nodesByType.institution) : null
    if (institutionNode) {
      addEdge(work.id, institutionNode.id, '藏于')
    }
  })

  nodesByType.law.forEach((law) => {
    const institutionNode = nodesByType.institution[0] ? random.pick(nodesByType.institution) : null
    if (institutionNode) {
      addEdge(law.id, institutionNode.id, '约束')
    }
  })

  nodesByType.clan.forEach((clan) => {
    const placeNode = nodesByType.place[0] ? random.pick(nodesByType.place) : null
    if (placeNode) {
      addEdge(clan.id, placeNode.id, '聚居')
    }
  })

  while (edges.length < KNOWLEDGE_EDGE_COUNT) {
    const source = random.pick(nodes)
    const target = random.pick(nodes)
    const label = random.pick(KNOWLEDGE_EDGE_LABEL_POOL)
    addEdge(source.id, target.id, label)
    if (edges.length >= KNOWLEDGE_EDGE_COUNT || edgeKeys.size >= KNOWLEDGE_EDGE_COUNT * KNOWLEDGE_EDGE_LIMIT_FACTOR) {
      break
    }
  }

  return { nodes, edges }
}

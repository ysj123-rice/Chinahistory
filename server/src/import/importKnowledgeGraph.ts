import '../config/env'

import { prisma } from '../prisma/client'

/**
 * 知识图谱真实数据导入器
 *
 * 数据来源（全部为已入库的真实数据，不做任何虚构）：
 * - surname_origins：姓氏源流骨架（宗族—郡望—始祖），存为 base 层，各朝代共享
 * - query_records：真实人物（仅页面可选的 6 个朝代、visible=true），存为各朝代层
 *
 * 关系设计：
 * - 宗族 → 郡望（label: 郡望）
 * - 宗族 → 始祖（label: 始祖）
 * - 人物 → 宗族（label: 族属）
 */

const PAGE_SOURCE_KEYS = ['yuan', 'tang', 'ming', 'southernSong', 'northernSong', 'qing'] as const

const DESCRIPTION_MAX = 160

const truncate = (text: string, max = DESCRIPTION_MAX) =>
  text.length > max ? `${text.slice(0, max)}…` : text

/** 郡望字段可能包含多个（顿号/逗号等分隔），拆分为单独郡望 */
const splitJunwang = (raw: string): string[] =>
  raw
    .split(/[、，,;；//\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)

type NodeRow = {
  sourceKey: string
  nodeId: string
  type: string
  label: string
  description: string
  ownerName: string
  era: string | null
  location: string | null
  relatedClan: string | null
  source: string
}

type EdgeRow = {
  sourceKey: string
  edgeId: string
  source: string
  target: string
  label: string
}

export const importKnowledgeGraph = async () => {
  // 旧图谱数据（早期 mock）全部清除
  await prisma.knowledgeEdge.deleteMany()
  await prisma.knowledgeNode.deleteMany()

  const origins = await prisma.surnameOrigin.findMany()
  const originBySurname = new Map(origins.map((item) => [item.surname, item]))

  const persons = await prisma.queryRecord.findMany({
    where: { visible: true, sourceKey: { in: [...PAGE_SOURCE_KEYS] } },
    select: {
      id: true,
      personName: true,
      surname: true,
      sourceKey: true,
      dynastyName: true,
      jiguanName: true,
    },
    orderBy: { id: 'asc' },
  })

  const nodes: NodeRow[] = []
  const edges: EdgeRow[] = []
  const junwangSurnames = new Map<string, Set<string>>()

  // ---------- base 层：姓氏源流骨架（宗族 / 郡望 / 始祖） ----------
  const clanSurnames = [...new Set(persons.map((p) => p.surname))].sort()
  for (const surname of clanSurnames) {
    const origin = originBySurname.get(surname)
    const clanNodeId = `clan:${surname}`

    const storyParts: string[] = []
    if (origin?.originEra) {
      storyParts.push(`得姓于${origin.originEra}`)
    }
    if (origin?.deriveType) {
      storyParts.push(`衍派方式：${origin.deriveType}`)
    }
    if (origin?.originStory) {
      storyParts.push(truncate(origin.originStory))
    }
    const description = storyParts.length > 0 ? storyParts.join('。') : '姓氏源流（源流资料暂缺）'

    nodes.push({
      sourceKey: 'base',
      nodeId: clanNodeId,
      type: 'clan',
      label: `${surname}氏`,
      description,
      ownerName: '',
      era: origin?.originEra ?? null,
      location: origin?.originPlace ?? null,
      relatedClan: null,
      source: 'surname_origins',
    })

    // 郡望
    if (origin?.junwang) {
      for (const junwang of splitJunwang(origin.junwang)) {
        const placeNodeId = `place:jw:${junwang}`
        if (!junwangSurnames.has(placeNodeId)) {
          junwangSurnames.set(placeNodeId, new Set())
        }
        junwangSurnames.get(placeNodeId)!.add(surname)

        if (!nodes.some((n) => n.nodeId === placeNodeId)) {
          nodes.push({
            sourceKey: 'base',
            nodeId: placeNodeId,
            type: 'place',
            label: junwang,
            description: '历史郡望地名',
            ownerName: '',
            era: null,
            location: junwang,
            relatedClan: null,
            source: 'surname_origins',
          })
        }
        edges.push({
          sourceKey: 'base',
          edgeId: `clan-jw:${surname}:${junwang}`,
          source: clanNodeId,
          target: placeNodeId,
          label: '郡望',
        })
      }
    }

    // 始祖
    if (origin?.firstAncestor) {
      const titleSuffix = origin.firstAncestorTitle ? `（${origin.firstAncestorTitle}）` : ''
      nodes.push({
        sourceKey: 'base',
        nodeId: `person:fa:${surname}`,
        type: 'person',
        label: origin.firstAncestor,
        description: `${surname}氏始祖${titleSuffix}`,
        ownerName: `${surname}氏`,
        era: origin.originEra ?? null,
        location: null,
        relatedClan: null,
        source: 'surname_origins',
      })
      edges.push({
        sourceKey: 'base',
        edgeId: `clan-fa:${surname}`,
        source: clanNodeId,
        target: `person:fa:${surname}`,
        label: '始祖',
      })
    }
  }

  // 郡望描述补充关联姓氏（真实边关系汇总，不虚构）
  for (const node of nodes) {
    const surnames = junwangSurnames.get(node.nodeId)
    if (surnames && surnames.size > 0) {
      node.description = `历史郡望地名 · 关联姓氏：${[...surnames].map((s) => `${s}氏`).join('、')}`
    }
  }

  // ---------- 朝代层：真实人物 ----------
  for (const person of persons) {
    const descriptionParts: string[] = []
    if (person.jiguanName) {
      descriptionParts.push(`籍贯${person.jiguanName}`)
    }
    if (person.dynastyName) {
      descriptionParts.push(String(person.dynastyName))
    }
    nodes.push({
      sourceKey: person.sourceKey,
      nodeId: `person:p:${person.id}`,
      type: 'person',
      label: person.personName,
      description: descriptionParts.length > 0 ? descriptionParts.join(' · ') : '历史人物',
      ownerName: person.dynastyName ? String(person.dynastyName) : '',
      era: person.dynastyName ? String(person.dynastyName) : null,
      location: person.jiguanName ?? null,
      relatedClan: person.surname,
      source: 'query_records',
    })
    edges.push({
      sourceKey: person.sourceKey,
      edgeId: `p-clan:${person.id}`,
      source: `person:p:${person.id}`,
      target: `clan:${person.surname}`,
      label: '族属',
    })
  }

  // ---------- 批量入库 ----------
  for (let i = 0; i < nodes.length; i += 500) {
    await prisma.knowledgeNode.createMany({ data: nodes.slice(i, i + 500) })
  }
  for (let i = 0; i < edges.length; i += 500) {
    await prisma.knowledgeEdge.createMany({ data: edges.slice(i, i + 500) })
  }

  const baseNodes = nodes.filter((n) => n.sourceKey === 'base').length
  console.log(
    `知识图谱导入完成：节点 ${nodes.length}（base ${baseNodes} + 朝代层 ${nodes.length - baseNodes}），关系 ${edges.length}；涉及姓氏 ${clanSurnames.length} 个`,
  )
}

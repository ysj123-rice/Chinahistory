import type { Prisma } from '@prisma/client'

import { prisma } from '../../prisma/client'

/** base 层为跨朝代共享的姓氏源流骨架（宗族/郡望/始祖） */
const BASE_SOURCE_KEY = 'base'

type ListKnowledgeNodesParams = {
  sourceKey?: string
  type?: string
  keyword?: string
}

export const listKnowledgeNodes = async (params: ListKnowledgeNodesParams) => {
  const { sourceKey, type, keyword } = params
  const where: Prisma.KnowledgeNodeWhereInput = {}

  if (sourceKey) {
    where.sourceKey = { in: [sourceKey, BASE_SOURCE_KEY] }
  }
  if (type) {
    where.type = type
  }
  if (keyword) {
    const contains = { contains: keyword }
    where.OR = [
      { label: contains },
      { description: contains },
      { ownerName: contains },
      { location: contains },
      { relatedClan: contains },
    ]
  }

  return prisma.knowledgeNode.findMany({ where, orderBy: { id: 'asc' } })
}

export const listKnowledgeEdges = async (sourceKey?: string) =>
  prisma.knowledgeEdge.findMany({
    where: sourceKey ? { sourceKey: { in: [sourceKey, BASE_SOURCE_KEY] } } : {},
    orderBy: { id: 'asc' },
  })

export const getKnowledgeNode = (id: number) =>
  prisma.knowledgeNode.findUnique({ where: { id } })

export const getKnowledgeEdge = (id: number) =>
  prisma.knowledgeEdge.findUnique({ where: { id } })

export const createKnowledgeNode = (data: Prisma.KnowledgeNodeCreateInput) =>
  prisma.knowledgeNode.create({ data })

export const updateKnowledgeNode = (id: number, data: Prisma.KnowledgeNodeUpdateInput) =>
  prisma.knowledgeNode.update({ where: { id }, data })

export const deleteKnowledgeNode = (id: number) =>
  prisma.knowledgeNode.delete({ where: { id } })

export const createKnowledgeEdge = (data: Prisma.KnowledgeEdgeCreateInput) =>
  prisma.knowledgeEdge.create({ data })

export const updateKnowledgeEdge = (id: number, data: Prisma.KnowledgeEdgeUpdateInput) =>
  prisma.knowledgeEdge.update({ where: { id }, data })

export const deleteKnowledgeEdge = (id: number) =>
  prisma.knowledgeEdge.delete({ where: { id } })

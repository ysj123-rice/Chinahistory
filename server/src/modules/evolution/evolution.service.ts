import type { Prisma } from '@prisma/client'

import { prisma } from '../../prisma/client'

type ListEvolutionFlowsParams = {
  sourceKey?: string
  periodKey?: string
}

export const listEvolutionPeriods = (sourceKey?: string) =>
  prisma.evolutionPeriod.findMany({
    where: sourceKey ? { sourceKey } : {},
    orderBy: { id: 'asc' },
  })

export const listEvolutionFlows = (params: ListEvolutionFlowsParams) => {
  const where: Prisma.EvolutionFlowWhereInput = {}
  if (params.sourceKey) {
    where.sourceKey = params.sourceKey
  }
  if (params.periodKey) {
    where.periodKey = params.periodKey
  }
  return prisma.evolutionFlow.findMany({ where, orderBy: { id: 'asc' } })
}

export const getEvolutionPeriod = (id: number) =>
  prisma.evolutionPeriod.findUnique({ where: { id } })

export const getEvolutionFlow = (id: number) => prisma.evolutionFlow.findUnique({ where: { id } })

export const createEvolutionPeriod = (data: Prisma.EvolutionPeriodCreateInput) =>
  prisma.evolutionPeriod.create({ data })

export const updateEvolutionPeriod = (id: number, data: Prisma.EvolutionPeriodUpdateInput) =>
  prisma.evolutionPeriod.update({ where: { id }, data })

export const deleteEvolutionPeriod = (id: number) =>
  prisma.evolutionPeriod.delete({ where: { id } })

export const createEvolutionFlow = (data: Prisma.EvolutionFlowCreateInput) =>
  prisma.evolutionFlow.create({ data })

export const updateEvolutionFlow = (id: number, data: Prisma.EvolutionFlowUpdateInput) =>
  prisma.evolutionFlow.update({ where: { id }, data })

export const deleteEvolutionFlow = (id: number) => prisma.evolutionFlow.delete({ where: { id } })

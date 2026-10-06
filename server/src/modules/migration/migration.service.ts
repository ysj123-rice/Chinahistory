import type { Prisma } from '@prisma/client'

import { prisma } from '../../prisma/client'

export const listMigrationEvents = async (filters: {
  cause?: string
  dynasty?: string
  minYear?: number
}) => {
  const where: Prisma.MigrationEventWhereInput = {}
  if (filters.cause) {
    where.cause = filters.cause
  }
  if (filters.dynasty) {
    where.era = { contains: filters.dynasty }
  }
  if (filters.minYear !== undefined) {
    where.startYear = { gte: filters.minYear }
  }
  return prisma.migrationEvent.findMany({ where, orderBy: { startYear: 'asc' } })
}

export const listMigrationCauses = () =>
  prisma.migrationEvent.findMany({ distinct: ['cause'], select: { cause: true } })

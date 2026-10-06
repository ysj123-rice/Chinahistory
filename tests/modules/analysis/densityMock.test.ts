import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DENSITY_MOCK_MAX_POINTS_PER_BOUNDARY,
  DENSITY_MOCK_MIN_POINTS_PER_BOUNDARY,
} from '../../../src/modules/analysis/constants.ts'
import { buildMockDensityPoints } from '../../../src/modules/analysis/utils/densityMock.ts'

const MOCK_BOUNDARIES = [
  {
    index: 0,
    name: 'Area-A',
    centerX: 12_000_000,
    centerY: 3_800_000,
    extentWidth: 220_000,
    extentHeight: 180_000,
  },
  {
    index: 1,
    name: 'Area-B',
    centerX: 11_300_000,
    centerY: 3_500_000,
    extentWidth: 310_000,
    extentHeight: 260_000,
  },
  {
    index: 2,
    name: 'Area-C',
    centerX: 11_800_000,
    centerY: 4_200_000,
    extentWidth: 420_000,
    extentHeight: 300_000,
  },
]

test('buildMockDensityPoints returns deterministic points with same payload', () => {
  const payload = {
    sourceKey: 'yuan' as const,
    pointLayerId: 0,
    boundaryLayerId: 4,
    boundaries: MOCK_BOUNDARIES,
  }

  const pointsA = buildMockDensityPoints(payload)
  const pointsB = buildMockDensityPoints(payload)

  assert.deepEqual(pointsA, pointsB)
})

test('buildMockDensityPoints returns different distribution for different dynasties', () => {
  const yuanPoints = buildMockDensityPoints({
    sourceKey: 'yuan',
    pointLayerId: 0,
    boundaryLayerId: 4,
    boundaries: MOCK_BOUNDARIES,
  })

  const tangPoints = buildMockDensityPoints({
    sourceKey: 'tang',
    pointLayerId: 0,
    boundaryLayerId: 4,
    boundaries: MOCK_BOUNDARIES,
  })

  assert.notDeepEqual(yuanPoints, tangPoints)
})

test('buildMockDensityPoints returns empty array for empty boundaries', () => {
  const points = buildMockDensityPoints({
    sourceKey: 'ming',
    pointLayerId: 3,
    boundaryLayerId: 11,
    boundaries: [],
  })

  assert.deepEqual(points, [])
})

test('buildMockDensityPoints generates point count within configured range', () => {
  const points = buildMockDensityPoints({
    sourceKey: 'southernSong',
    pointLayerId: 2,
    boundaryLayerId: 8,
    boundaries: MOCK_BOUNDARIES,
  })

  const minCount = MOCK_BOUNDARIES.length * DENSITY_MOCK_MIN_POINTS_PER_BOUNDARY
  const maxCount = MOCK_BOUNDARIES.length * DENSITY_MOCK_MAX_POINTS_PER_BOUNDARY

  assert.ok(points.length >= minCount)
  assert.ok(points.length <= maxCount)
  assert.ok(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)))
  assert.ok(points.every((point) => point.weight >= 0.55 && point.weight <= 2))
})

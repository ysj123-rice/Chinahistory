import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildMockHotspotOutput } from '../../../src/modules/analysis/utils/hotspotMock.ts'

const MOCK_BOUNDARIES = [
  { index: 0, name: 'Region-A', centerX: 12000000, centerY: 3800000, areaSquareKilometer: 1800 },
  { index: 1, name: 'Region-B', centerX: 11800000, centerY: 4200000, areaSquareKilometer: 6200 },
  { index: 2, name: 'Region-C', centerX: 11350000, centerY: 3500000, areaSquareKilometer: 4200 },
]

test('buildMockHotspotOutput returns deterministic result with same payload', () => {
  const payload = {
    sourceKey: 'yuan' as const,
    pointLayerId: 0,
    boundaryLayerId: 4,
    boundaries: MOCK_BOUNDARIES,
  }

  const resultA = buildMockHotspotOutput(payload)
  const resultB = buildMockHotspotOutput(payload)

  assert.deepEqual(resultA.metricValues, resultB.metricValues)
  assert.deepEqual(resultA.pointCounts, resultB.pointCounts)
})

test('buildMockHotspotOutput produces different distributions for different dynasties', () => {
  const yuanOutput = buildMockHotspotOutput({
    sourceKey: 'yuan',
    pointLayerId: 0,
    boundaryLayerId: 4,
    boundaries: MOCK_BOUNDARIES,
  })

  const tangOutput = buildMockHotspotOutput({
    sourceKey: 'tang',
    pointLayerId: 0,
    boundaryLayerId: 4,
    boundaries: MOCK_BOUNDARIES,
  })

  assert.notDeepEqual(yuanOutput.metricValues, tangOutput.metricValues)
})

test('buildMockHotspotOutput always returns positive metric and point counts', () => {
  const output = buildMockHotspotOutput({
    sourceKey: 'ming',
    pointLayerId: 3,
    boundaryLayerId: 12,
    boundaries: MOCK_BOUNDARIES,
  })

  assert.equal(output.metricValues.length, MOCK_BOUNDARIES.length)
  assert.equal(output.pointCounts.length, MOCK_BOUNDARIES.length)
  assert.ok(output.metricValues.every((value) => Number.isFinite(value) && value > 0))
  assert.ok(output.pointCounts.every((value) => Number.isInteger(value) && value > 0))
})

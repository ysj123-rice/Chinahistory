import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildHotspotScores,
  calculateMean,
  calculateStandardDeviation,
  classifyHotspotLevel,
} from '../../../src/modules/analysis/utils/hotspot.ts'

test('calculateMean returns zero for empty array', () => {
  assert.equal(calculateMean([]), 0)
})

test('calculateStandardDeviation returns expected population deviation', () => {
  const values = [1, 2, 3, 4]
  const mean = calculateMean(values)
  const std = calculateStandardDeviation(values, mean)
  assert.equal(Number(std.toFixed(6)), 1.118034)
})

test('classifyHotspotLevel matches configured thresholds', () => {
  assert.equal(classifyHotspotLevel(1.5), 3)
  assert.equal(classifyHotspotLevel(0.75), 2)
  assert.equal(classifyHotspotLevel(0.25), 1)
  assert.equal(classifyHotspotLevel(0.24), 0)
  assert.equal(classifyHotspotLevel(-0.25), -1)
  assert.equal(classifyHotspotLevel(-0.75), -2)
  assert.equal(classifyHotspotLevel(-1.5), -3)
})

test('buildHotspotScores returns neutral levels when values are equal', () => {
  const results = buildHotspotScores([5, 5, 5])
  assert.equal(results.length, 3)
  assert.ok(results.every((item) => item.level === 0))
  assert.ok(results.every((item) => item.zScore === 0))
})

test('buildHotspotScores returns diverging hot and cold levels', () => {
  const results = buildHotspotScores([0, 0, 0, 10])
  assert.deepEqual(
    results.map((item) => item.level),
    [-1, -1, -1, 3],
  )
})

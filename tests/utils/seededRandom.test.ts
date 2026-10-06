import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createSeededRandom } from '../../src/utils/seededRandom.ts'

test('createSeededRandom produces deterministic sequence', () => {
  const randomA = createSeededRandom(42)
  const randomB = createSeededRandom(42)

  const sequenceA = [randomA.next(), randomA.next(), randomA.next()]
  const sequenceB = [randomB.next(), randomB.next(), randomB.next()]

  assert.deepEqual(sequenceA, sequenceB)
})

test('int respects min and max boundaries', () => {
  const random = createSeededRandom(7)
  const value = random.int(5, 5)
  assert.equal(value, 5)

  const swapped = random.int(10, 6)
  assert.ok(swapped >= 6 && swapped <= 10)
})

test('pickMany returns unique items when requested', () => {
  const random = createSeededRandom(9)
  const result = random.pickMany([1, 2, 3], 5, true)
  assert.equal(result.length, 3)
  assert.equal(new Set(result).size, 3)
})

test('pick throws on empty array', () => {
  const random = createSeededRandom(1)
  assert.throws(() => random.pick([]), /候选列表为空/)
})

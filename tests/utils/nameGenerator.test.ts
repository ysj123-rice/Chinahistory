import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildPersonName } from '../../src/utils/nameGenerator.ts'
import { createSeededRandom } from '../../src/utils/seededRandom.ts'

test('buildPersonName combines surname and given name', () => {
  const random = createSeededRandom(3)
  const name = buildPersonName(random, '王', { givenNameChars: ['甲'], minLength: 1, maxLength: 1 })
  assert.equal(name, '王甲')
})

test('buildPersonName throws when name pool is empty', () => {
  const random = createSeededRandom(2)
  assert.throws(() => buildPersonName(random, '张', { givenNameChars: [] }), /名字符号为空/)
})

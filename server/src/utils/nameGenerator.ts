import type { SeededRandom } from './seededRandom'

const DEFAULT_GIVEN_NAME_MIN = 1
const DEFAULT_GIVEN_NAME_MAX = 2

export type NamePool = {
  givenNameChars: string[]
  minLength?: number
  maxLength?: number
}

export const buildPersonName = (random: SeededRandom, surname: string, pool: NamePool) => {
  if (!surname) {
    throw new Error('姓名生成失败：姓氏为空')
  }
  if (!pool.givenNameChars.length) {
    throw new Error('姓名生成失败：名字符号为空')
  }

  const minLength = pool.minLength ?? DEFAULT_GIVEN_NAME_MIN
  const maxLength = pool.maxLength ?? DEFAULT_GIVEN_NAME_MAX
  const length = random.int(minLength, maxLength)
  let givenName = ''
  for (let i = 0; i < length; i += 1) {
    givenName += random.pick(pool.givenNameChars)
  }
  return `${surname}${givenName}`
}

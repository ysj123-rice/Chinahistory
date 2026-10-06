import { MOCK_SURNAMES } from '@/modules/mock/constants'
import { createSeededRandom, hashStringToSeed } from '@/utils/seededRandom'

export type MockMapPoint = {
  objectId: number
  surname: string
  name: string
  location: string
  longitude: number
  latitude: number
}

// 中国大致经纬度范围
const CHINA_LNG_MIN = 74
const CHINA_LNG_MAX = 135
const CHINA_LAT_MIN = 18
const CHINA_LAT_MAX = 54

// 人口密集区域（用于偏向分布）
const DENSE_REGIONS = [
  { lngMin: 110, lngMax: 122, latMin: 30, latMax: 42, weight: 0.35 }, // 华北华东
  { lngMin: 104, lngMax: 115, latMin: 28, latMax: 38, weight: 0.2 }, // 华中
  { lngMin: 113, lngMax: 125, latMin: 22, latMax: 32, weight: 0.2 }, // 华南
  { lngMin: 100, lngMax: 112, latMin: 22, latMax: 32, weight: 0.12 }, // 西南
  { lngMin: 118, lngMax: 130, latMin: 38, latMax: 50, weight: 0.13 }, // 东北
]

const pickRegion = (rng: ReturnType<typeof createSeededRandom>) => {
  const rand = rng.next()
  let acc = 0
  for (const region of DENSE_REGIONS) {
    acc += region.weight
    if (rand <= acc) {
      return region
    }
  }
  return DENSE_REGIONS[0]!
}

export const generateMockPoints = (count = 400, seed = 'yuan-demo'): MockMapPoint[] => {
  const rng = createSeededRandom(hashStringToSeed(seed))
  const points: MockMapPoint[] = []

  for (let i = 0; i < count; i += 1) {
    // 80% 概率落在密集区，20% 全国随机
    const useDense = rng.next() < 0.8
    const region = useDense ? pickRegion(rng) : null

    const lng = region
      ? region.lngMin + rng.next() * (region.lngMax - region.lngMin)
      : CHINA_LNG_MIN + rng.next() * (CHINA_LNG_MAX - CHINA_LNG_MIN)
    const lat = region
      ? region.latMin + rng.next() * (region.latMax - region.latMin)
      : CHINA_LAT_MIN + rng.next() * (CHINA_LAT_MAX - CHINA_LAT_MIN)

    const surname = rng.pick(MOCK_SURNAMES)
    const surnameIndex = MOCK_SURNAMES.indexOf(surname)

    points.push({
      // objectId 按姓氏索引取模分配，使热力图姓氏过滤生效
      objectId: surnameIndex + i * MOCK_SURNAMES.length,
      surname,
      name: `${surname}${rng.pick(MOCK_SURNAMES)}`,
      location: `地点${i + 1}`,
      longitude: lng,
      latitude: lat,
    })
  }

  return points
}

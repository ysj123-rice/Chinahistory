import type { MapSourceKey } from '../../map/dataSources.ts'
import { createSeededRandom, deriveSeed, hashStringToSeed } from '../../../utils/seededRandom.ts'
import {
  DENSITY_MOCK_MAX_POINTS_PER_BOUNDARY,
  DENSITY_MOCK_MAX_SPREAD_METERS,
  DENSITY_MOCK_MIN_POINTS_PER_BOUNDARY,
  DENSITY_MOCK_MIN_SPREAD_METERS,
  DENSITY_MOCK_POINT_FREQUENCY_X,
  DENSITY_MOCK_POINT_FREQUENCY_Y,
  DENSITY_MOCK_SPREAD_RATIO,
} from '../constants.ts'

export type DensityMockBoundaryInput = {
  index: number
  name: string
  centerX: number
  centerY: number
  extentWidth: number
  extentHeight: number
}

export type DensityMockPayload = {
  sourceKey: MapSourceKey
  pointLayerId: number
  boundaryLayerId: number | null
  boundaries: readonly DensityMockBoundaryInput[]
}

export type DensityMockPoint = {
  x: number
  y: number
  weight: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const resolveSpread = (extentLength: number) =>
  clamp(extentLength * DENSITY_MOCK_SPREAD_RATIO, DENSITY_MOCK_MIN_SPREAD_METERS, DENSITY_MOCK_MAX_SPREAD_METERS)

/**
 * Build deterministic mock points for density rendering.
 */
export const buildMockDensityPoints = ({
  sourceKey,
  pointLayerId,
  boundaryLayerId,
  boundaries,
}: DensityMockPayload): DensityMockPoint[] => {
  if (boundaries.length === 0) {
    return []
  }

  const baseSeed = hashStringToSeed(`${sourceKey}:${pointLayerId}:${boundaryLayerId ?? -1}:density`)
  const phaseRandom = createSeededRandom(baseSeed)
  const phaseX = phaseRandom.next() * Math.PI * 2
  const phaseY = phaseRandom.next() * Math.PI * 2

  const points: DensityMockPoint[] = []

  boundaries.forEach((boundary) => {
    const name = boundary.name.trim().length > 0 ? boundary.name : `Density-Area-${boundary.index + 1}`
    const boundarySeed = deriveSeed(baseSeed, `${name}:${boundary.index}`)
    const random = createSeededRandom(boundarySeed)

    const harmonic =
      Math.sin(boundary.centerX * DENSITY_MOCK_POINT_FREQUENCY_X + phaseX) * 0.55 +
      Math.cos(boundary.centerY * DENSITY_MOCK_POINT_FREQUENCY_Y + phaseY) * 0.45
    const normalized = (harmonic + 1) * 0.5
    const span = DENSITY_MOCK_MAX_POINTS_PER_BOUNDARY - DENSITY_MOCK_MIN_POINTS_PER_BOUNDARY
    const pointCount = clamp(
      Math.round(DENSITY_MOCK_MIN_POINTS_PER_BOUNDARY + normalized * span + random.int(-6, 6)),
      DENSITY_MOCK_MIN_POINTS_PER_BOUNDARY,
      DENSITY_MOCK_MAX_POINTS_PER_BOUNDARY,
    )

    const spreadX = resolveSpread(Math.abs(boundary.extentWidth))
    const spreadY = resolveSpread(Math.abs(boundary.extentHeight))

    for (let index = 0; index < pointCount; index += 1) {
      const angle = random.next() * Math.PI * 2
      const radius = Math.sqrt(random.next())
      const radialX = Math.cos(angle) * radius * spreadX
      const radialY = Math.sin(angle) * radius * spreadY
      const jitterX = (random.next() - 0.5) * spreadX * 0.24
      const jitterY = (random.next() - 0.5) * spreadY * 0.24
      const weight = Number((0.55 + random.next() * 1.45).toFixed(3))

      points.push({
        x: boundary.centerX + radialX + jitterX,
        y: boundary.centerY + radialY + jitterY,
        weight,
      })
    }
  })

  return points
}

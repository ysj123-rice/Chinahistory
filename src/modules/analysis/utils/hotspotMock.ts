import type { MapSourceKey } from '../../map/dataSources.ts'
import { createSeededRandom, deriveSeed, hashStringToSeed } from '../../../utils/seededRandom.ts'
import {
  HOTSPOT_MOCK_AREA_PENALTY,
  HOTSPOT_MOCK_BASELINE,
  HOTSPOT_MOCK_FREQUENCY_X,
  HOTSPOT_MOCK_FREQUENCY_Y,
  HOTSPOT_MOCK_NOISE_AMPLITUDE,
  HOTSPOT_MOCK_POINT_SCALE,
  HOTSPOT_MOCK_SPATIAL_AMPLITUDE,
} from '../constants.ts'

export type HotspotMockBoundaryInput = {
  index: number
  name: string
  centerX: number
  centerY: number
  areaSquareKilometer: number
}

export type HotspotMockPayload = {
  sourceKey: MapSourceKey
  pointLayerId: number
  boundaryLayerId: number | null
  boundaries: readonly HotspotMockBoundaryInput[]
}

export type HotspotMockOutput = {
  metricValues: number[]
  pointCounts: number[]
}

const resolveSafeArea = (areaSquareKilometer: number) =>
  areaSquareKilometer > 0 ? areaSquareKilometer : 1

const resolveBoundarySeed = (
  baseSeed: number,
  boundaryName: string,
  boundaryIndex: number,
) => deriveSeed(baseSeed, `${boundaryName}:${boundaryIndex}`)

/**
 * Build deterministic mock hotspot values for map demos.
 * The output changes with dynasty source and active point layer.
 */
export const buildMockHotspotOutput = ({
  sourceKey,
  pointLayerId,
  boundaryLayerId,
  boundaries,
}: HotspotMockPayload): HotspotMockOutput => {
  if (boundaries.length === 0) {
    return {
      metricValues: [],
      pointCounts: [],
    }
  }

  const baseSeed = hashStringToSeed(`${sourceKey}:${pointLayerId}:${boundaryLayerId ?? -1}`)
  const phaseRandom = createSeededRandom(baseSeed)
  const phaseX = phaseRandom.next() * Math.PI * 2
  const phaseY = phaseRandom.next() * Math.PI * 2

  const metricValues: number[] = []
  const pointCounts: number[] = []

  boundaries.forEach((boundary) => {
    const boundaryLabel =
      boundary.name.trim().length > 0 ? boundary.name : `Area-${boundary.index + 1}`
    const boundarySeed = resolveBoundarySeed(baseSeed, boundaryLabel, boundary.index)
    const boundaryRandom = createSeededRandom(boundarySeed)

    const xWave = Math.sin(boundary.centerX * HOTSPOT_MOCK_FREQUENCY_X + phaseX)
    const yWave = Math.cos(boundary.centerY * HOTSPOT_MOCK_FREQUENCY_Y + phaseY)
    const spatialSignal = (xWave * 0.62 + yWave * 0.38) * HOTSPOT_MOCK_SPATIAL_AMPLITUDE
    const localNoise = (boundaryRandom.next() - 0.5) * HOTSPOT_MOCK_NOISE_AMPLITUDE * 2
    const harmonicSignal =
      Math.sin((boundary.index + 1) * 0.83 + phaseX) * 8 +
      Math.cos((boundary.index + 1) * 0.29 + phaseY) * 5
    const areaPenalty = Math.log10(resolveSafeArea(boundary.areaSquareKilometer)) *
      HOTSPOT_MOCK_AREA_PENALTY

    const value = Math.max(2, HOTSPOT_MOCK_BASELINE + spatialSignal + harmonicSignal + localNoise - areaPenalty)
    const pointCount = Math.max(
      1,
      Math.round(value * HOTSPOT_MOCK_POINT_SCALE + boundaryRandom.int(0, 16)),
    )

    metricValues.push(Number(value.toFixed(6)))
    pointCounts.push(pointCount)
  })

  return {
    metricValues,
    pointCounts,
  }
}

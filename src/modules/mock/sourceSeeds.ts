import type { MapSourceKey } from '@/modules/map/dataSources'

export const SOURCE_SEED_MAP: Record<MapSourceKey, number> = {
  yuan: 1327,
  tang: 762,
  ming: 1425,
  southernSong: 1174,
  northernSong: 1032,
  qing: 1644,
}

export const getSourceSeed = (key: MapSourceKey) => SOURCE_SEED_MAP[key] ?? SOURCE_SEED_MAP.yuan

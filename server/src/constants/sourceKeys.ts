export const SOURCE_KEYS = ['yuan', 'tang', 'ming', 'southernSong', 'northernSong', 'qing'] as const

export type SourceKey = (typeof SOURCE_KEYS)[number]

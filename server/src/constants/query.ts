export const EVENT_TYPES = [
  { key: 'politics', label: '政治', color: '#1f88a7' },
  { key: 'military', label: '军事', color: '#d95d39' },
  { key: 'culture', label: '文化', color: '#5b7aa8' },
  { key: 'economy', label: '经济', color: '#2c9b6a' },
]

export const EVENT_TYPE_MAP = EVENT_TYPES.reduce<Record<string, { label: string; color: string }>>(
  (acc, item) => {
    acc[item.key] = { label: item.label, color: item.color }
    return acc
  },
  {},
)

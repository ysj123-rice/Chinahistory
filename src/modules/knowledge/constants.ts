import type { MapSourceKey } from '@/modules/map/dataSources'

export type KnowledgeNodeType =
  | 'person'
  | 'event'
  | 'place'
  | 'war'
  | 'institution'
  | 'work'
  | 'period'
  | 'law'
  | 'clan'

export type KnowledgeNode = {
  id: string
  type: KnowledgeNodeType
  label: string
  description: string
  ownerName: string
  era?: string
  location?: string
  relatedClan?: string
  source?: string
}

export type KnowledgeEdge = {
  id: string
  source: string
  target: string
  label: string
}

export const KNOWLEDGE_NODES: KnowledgeNode[] = []
export const KNOWLEDGE_EDGES: KnowledgeEdge[] = []

export const NODE_TYPES: Array<{ key: KnowledgeNodeType; label: string; color: string }> = [
  { key: 'person', label: '历史人物', color: '#1f88a7' },
  { key: 'event', label: '历史事件', color: '#e36b4b' },
  { key: 'place', label: '地点', color: '#5b7aa8' },
  { key: 'war', label: '战争', color: '#b56576' },
  { key: 'institution', label: '权力机构', color: '#2c9b6a' },
  { key: 'work', label: '作品', color: '#f2b84b' },
  { key: 'period', label: '历史时期', color: '#6d597a' },
  { key: 'law', label: '法律', color: '#9c6644' },
  { key: 'clan', label: '家族', color: '#6b705c' },
]

export const KNOWLEDGE_NODE_COUNT = 150
export const KNOWLEDGE_EDGE_COUNT = 220
export const KNOWLEDGE_SEED_SALT = 'knowledge'
export const KNOWLEDGE_EDGE_LIMIT_FACTOR = 2
export const KNOWLEDGE_LAYOUT_REPULSION = 30
export const KNOWLEDGE_LAYOUT_GRAVITY = 0.25
export const KNOWLEDGE_LAYOUT_SPRING = 0.1
export const KNOWLEDGE_LAYOUT_SPRING_MAX = 22
export const KNOWLEDGE_LAYOUT_TAO = 0.12
// 真实数据约 1174 节点/1239 边：force-atlas2 约 200 轮即收敛，原 800 轮纯属浪费
export const KNOWLEDGE_LAYOUT_MAX_ITERATION = 200
export const KNOWLEDGE_NODE_RENDER_SIZE = 48

export const KNOWLEDGE_OWNER_NAME_POOL = [
  '马思远',
  '顾清岚',
  '宋知微',
  '齐衡',
  '杜若南',
  '谢临川',
  '林策',
  '唐遇安',
  '秦予川',
  '白芷',
  '赵若明',
]

export const KNOWLEDGE_EVENT_POOL = ['行省改革', '书院复兴', '漕运调度', '治水工程', '盐税整饬']
export const KNOWLEDGE_WAR_POOL = ['边防整备', '关隘协防', '沿海战事', '湖广动乱']
export const KNOWLEDGE_INSTITUTION_POOL = ['行中书省', '都察院', '翰林院', '学政司', '漕运司']
export const KNOWLEDGE_WORK_POOL = ['授时历', '中原音韵', '水利纪要', '军政汇编']
export const KNOWLEDGE_LAW_POOL = ['律令总集', '教法敕令', '盐法细则', '赋役章程']

export const KNOWLEDGE_PERIOD_LABELS: Record<MapSourceKey, string[]> = {
  yuan: ['元初', '元中期', '元末'],
  tang: ['初唐', '盛唐', '晚唐'],
  ming: ['明初', '明中期', '明末'],
  southernSong: ['南宋初', '南宋中期', '南宋末'],
  northernSong: ['北宋初', '北宋中期', '北宋末'],
  qing: ['清初', '清中期', '晚清'],
}

export const KNOWLEDGE_ERA_POOL: Record<MapSourceKey, string[]> = {
  yuan: ['1260s', '1290s', '1320s', '1350s'],
  tang: ['620s', '690s', '750s', '820s'],
  ming: ['1380s', '1450s', '1520s', '1600s'],
  southernSong: ['1130s', '1180s', '1230s', '1260s'],
  northernSong: ['970s', '1020s', '1070s', '1110s'],
  qing: ['1650s', '1720s', '1790s', '1860s'],
}

export const KNOWLEDGE_DESCRIPTION_TEMPLATES: Record<KnowledgeNodeType, string[]> = {
  person: ['{label}活跃于{era}，参与{topic}相关事务。', '{label}在{location}主导{topic}实践。'],
  event: ['{label}推动了{topic}协作。', '{label}成为{location}的关键节点事件。'],
  place: ['{label}是区域中心节点。', '{label}在{era}成为重要枢纽。'],
  war: ['{label}影响{location}局势。', '{label}带来区域秩序调整。'],
  institution: ['{label}负责{topic}统筹。', '{label}强化{location}治理。'],
  work: ['{label}记录{topic}线索。', '{label}为{era}重要文献。'],
  period: ['{label}承接制度与人群变化。', '{label}跨区域互动加强。'],
  law: ['{label}规范{topic}流程。', '{label}用于{location}治理。'],
  clan: ['{label}在{location}形成聚居。', '{label}参与{topic}协作。'],
}

export const KNOWLEDGE_TOPIC_POOL = ['行政', '漕运', '学术', '军务', '财政', '水利']

export const KNOWLEDGE_EDGE_LABEL_POOL = ['参与', '主导', '协作', '发生于', '影响', '记录', '约束', '联通']

export const KNOWLEDGE_TYPE_WEIGHTS: Array<{ type: KnowledgeNodeType; weight: number }> = [
  { type: 'person', weight: 38 },
  { type: 'event', weight: 18 },
  { type: 'place', weight: 14 },
  { type: 'war', weight: 6 },
  { type: 'institution', weight: 8 },
  { type: 'work', weight: 6 },
  { type: 'period', weight: 4 },
  { type: 'law', weight: 3 },
  { type: 'clan', weight: 3 },
]

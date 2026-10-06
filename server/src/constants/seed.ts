import type { SourceKey } from './sourceKeys'

export const SEED_SURNAMES = ['王', '张', '李', '刘', '陈', '赵', '黄'] as const

export const SEED_GIVEN_NAME_CHARS = [
  '伟',
  '芳',
  '娜',
  '敏',
  '静',
  '强',
  '磊',
  '军',
  '洋',
  '勇',
  '艳',
  '杰',
  '涛',
  '明',
  '超',
  '秀',
  '英',
  '华',
  '鹏',
  '东',
  '宁',
  '雪',
  '晨',
  '博',
  '琪',
  '欣',
  '雯',
  '琳',
  '宇',
  '浩',
  '然',
  '雅',
  '涵',
  '璟',
  '澜',
  '瑶',
  '枫',
  '璇',
  '煜',
  '航',
  '昭',
  '辰',
  '岚',
  '澈',
  '晟',
  '越',
  '珂',
]

export const SEED_LOCATION_NAMES = [
  '大都',
  '汴梁',
  '江淮',
  '江南',
  '河西',
  '岭南',
  '太原',
  '济南',
  '杭州',
  '苏州',
  '成都',
  '广州',
  '福州',
  '襄阳',
  '开封',
  '奉元',
  '洛阳',
  '金陵',
  '武昌',
  '长沙',
  '宁波',
  '泉州',
  '扬州',
  '太仓',
  '广陵',
  '西安',
  '蓟州',
  '潭州',
  '渝州',
  '青州',
  '庐州',
  '邯郸',
]

export const SEED_REGION_NAMES = ['大都', '汴梁', '江淮', '岭南', '河西', '江南', '关中', '湖广']

export const SEED_SOURCE_NAMES = [
  '国家图书馆',
  '内府档案馆',
  '地方方志馆',
  '行省文书司',
  '文献整理中心',
  '史地研究院',
  '族谱数字化平台',
  '地方博物馆',
  '文献协作组',
  '古籍整理处',
]

export const SEED_TEAM_NAMES = [
  '文献整理组',
  '政务研究组',
  '经济史研究组',
  '地名信息组',
  '文物数字化组',
  '商贸研究组',
  '人口研究组',
  '水利史研究组',
  '军事史研究组',
  '学术传播组',
]

export const QUERY_RECORD_COUNT = 300
export const DATA_RECORD_COUNT = 80
export const KNOWLEDGE_NODE_COUNT = 150
export const KNOWLEDGE_EDGE_COUNT = 220
export const EVOLUTION_FLOW_COUNT_PER_PERIOD = 20

export const QUERY_EVENT_NAME_POOLS = {
  politics: ['行省调度', '官署整饬', '州县巡察', '吏治考核', '礼制修订'],
  military: ['边防整备', '关隘协防', '水陆调度', '战备演练', '驿站巡检'],
  culture: ['书院讲学', '文献整理', '书画交流', '学规修订', '讲席巡回'],
  economy: ['漕运统筹', '盐税核验', '田赋清查', '仓储整备', '商路维护'],
}

export const QUERY_KEYWORD_POOL = [
  '制度',
  '迁徙',
  '户籍',
  '交通',
  '粮运',
  '赋役',
  '文书',
  '文化',
  '关隘',
  '驿站',
  '水利',
  '治安',
  '商贸',
  '学政',
  '财政',
]

export const QUERY_SUMMARY_TEMPLATES = [
  '{year}年{person}在{location}主持{event}，推动{keyword}体系完善。',
  '{location}{event}期间，{person}整合{keyword}资源，形成协作机制。',
  '{person}于{year}年参与{event}，加强{location}的{keyword}治理。',
  '{year}年{location}启动{event}，{person}主导{keyword}部署。',
]

export const QUERY_TIME_RANGE_PRESETS: Record<SourceKey, Array<{ key: string; label: string; start: number; end: number }>> = {
  yuan: [
    { key: '1260-1290', label: '1260-1290', start: 1260, end: 1290 },
    { key: '1291-1320', label: '1291-1320', start: 1291, end: 1320 },
    { key: '1321-1350', label: '1321-1350', start: 1321, end: 1350 },
    { key: '1351-1368', label: '1351-1368', start: 1351, end: 1368 },
  ],
  tang: [
    { key: '618-655', label: '618-655', start: 618, end: 655 },
    { key: '656-705', label: '656-705', start: 656, end: 705 },
    { key: '706-770', label: '706-770', start: 706, end: 770 },
    { key: '771-907', label: '771-907', start: 771, end: 907 },
  ],
  ming: [
    { key: '1368-1420', label: '1368-1420', start: 1368, end: 1420 },
    { key: '1421-1505', label: '1421-1505', start: 1421, end: 1505 },
    { key: '1506-1566', label: '1506-1566', start: 1506, end: 1566 },
    { key: '1567-1644', label: '1567-1644', start: 1567, end: 1644 },
  ],
  southernSong: [
    { key: '1127-1160', label: '1127-1160', start: 1127, end: 1160 },
    { key: '1161-1200', label: '1161-1200', start: 1161, end: 1200 },
    { key: '1201-1240', label: '1201-1240', start: 1201, end: 1240 },
    { key: '1241-1279', label: '1241-1279', start: 1241, end: 1279 },
  ],
  northernSong: [
    { key: '960-1000', label: '960-1000', start: 960, end: 1000 },
    { key: '1001-1040', label: '1001-1040', start: 1001, end: 1040 },
    { key: '1041-1085', label: '1041-1085', start: 1041, end: 1085 },
    { key: '1086-1127', label: '1086-1127', start: 1086, end: 1127 },
  ],
  qing: [
    { key: '1644-1735', label: '1644-1735', start: 1644, end: 1735 },
    { key: '1736-1850', label: '1736-1850', start: 1736, end: 1850 },
    { key: '1851-1911', label: '1851-1911', start: 1851, end: 1911 },
  ],
}

export const DATA_NAME_TEMPLATES = [
  '{surname}氏族谱汇编',
  '{surname}氏迁徙档案',
  '{surname}氏碑刻索引',
  '{surname}氏方志条目',
  '{surname}氏人口统计册',
  '{surname}氏官署文书录',
  '{surname}氏商路舆图',
  '{surname}氏军务档案',
]

export const DATA_DESCRIPTION_TEMPLATES = [
  '整理{surname}氏家族在{coverage}的谱牒与迁徙记录。',
  '汇总{coverage}地区{surname}氏相关档案与制度资料。',
  '补齐{surname}氏在{coverage}的地方志与地名信息。',
  '收录{surname}氏在{coverage}的文献线索，便于专题分析。',
]

export const DATA_COVERAGE_POOL = ['华北', '江淮', '江南', '岭南', '河西', '关中', '湖广', '西南']

export const DATA_TAG_POOL = [
  '族谱',
  '户籍',
  '碑刻',
  '方志',
  '迁徙',
  '人口',
  '官署',
  '商贸',
  '水利',
  '军务',
]

export const DATA_VERSION_POOL = ['v1.0', 'v1.2', 'v1.4', 'v1.6', 'v1.8', 'v2.0', 'v2.2', 'v2.4']

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
export const KNOWLEDGE_TOPIC_POOL = ['行政', '漕运', '学术', '军务', '财政', '水利']
export const KNOWLEDGE_EDGE_LABEL_POOL = ['参与', '主导', '协作', '发生于', '影响', '记录', '约束', '联通']

export const KNOWLEDGE_PERIOD_LABELS: Record<SourceKey, string[]> = {
  yuan: ['元初', '元中期', '元末'],
  tang: ['初唐', '盛唐', '晚唐'],
  ming: ['明初', '明中期', '明末'],
  southernSong: ['南宋初', '南宋中期', '南宋末'],
  northernSong: ['北宋初', '北宋中期', '北宋末'],
  qing: ['清初', '清中期', '晚清'],
}

export const KNOWLEDGE_ERA_POOL: Record<SourceKey, string[]> = {
  yuan: ['1260s', '1290s', '1320s', '1350s'],
  tang: ['620s', '690s', '750s', '820s'],
  ming: ['1380s', '1450s', '1520s', '1600s'],
  southernSong: ['1130s', '1180s', '1230s', '1260s'],
  northernSong: ['970s', '1020s', '1070s', '1110s'],
  qing: ['1650s', '1720s', '1790s', '1860s'],
}

export const KNOWLEDGE_DESCRIPTION_TEMPLATES = {
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

export const EVOLUTION_NODE_POOL = {
  capital: { name: '大都', longitude: 116.4074, latitude: 39.9042 },
  kaifeng: { name: '汴梁', longitude: 114.3076, latitude: 34.7973 },
  taiyuan: { name: '太原', longitude: 112.5492, latitude: 37.857 },
  jinan: { name: '济南', longitude: 117.1201, latitude: 36.6512 },
  fengyuan: { name: '奉元', longitude: 108.9398, latitude: 34.3416 },
  nanjing: { name: '南京', longitude: 118.7969, latitude: 32.0603 },
  hangzhou: { name: '杭州', longitude: 120.1551, latitude: 30.2741 },
  suzhou: { name: '苏州', longitude: 120.5853, latitude: 31.2989 },
  wuhan: { name: '武昌', longitude: 114.3055, latitude: 30.5928 },
  fuzhou: { name: '福州', longitude: 119.2965, latitude: 26.0745 },
  guangzhou: { name: '广州', longitude: 113.2644, latitude: 23.1291 },
  chengdu: { name: '成都', longitude: 104.0665, latitude: 30.5723 },
  changsha: { name: '长沙', longitude: 112.9388, latitude: 28.2282 },
}

export const EVOLUTION_PERIOD_TEMPLATES = [
  { label: '奠基期', summary: '家族向核心区域集中，行政迁调明显。' },
  { label: '扩展期', summary: '区域联通增强，沿江与沿海迁徙上升。' },
  { label: '整合期', summary: '跨区域交流加深，人口分布趋于带状。' },
  { label: '动荡期', summary: '战乱与调度叠加，人口向安全腹地转移。' },
]

export const EVOLUTION_PERIOD_PRESETS: Record<SourceKey, Array<{ key: string; label: string }>> = {
  yuan: [
    { key: '1260-1290', label: '1260-1290' },
    { key: '1291-1320', label: '1291-1320' },
    { key: '1321-1350', label: '1321-1350' },
    { key: '1351-1368', label: '1351-1368' },
  ],
  tang: [
    { key: '618-655', label: '618-655' },
    { key: '656-705', label: '656-705' },
    { key: '706-770', label: '706-770' },
    { key: '771-907', label: '771-907' },
  ],
  ming: [
    { key: '1368-1420', label: '1368-1420' },
    { key: '1421-1505', label: '1421-1505' },
    { key: '1506-1566', label: '1506-1566' },
    { key: '1567-1644', label: '1567-1644' },
  ],
  southernSong: [
    { key: '1127-1160', label: '1127-1160' },
    { key: '1161-1200', label: '1161-1200' },
    { key: '1201-1240', label: '1201-1240' },
    { key: '1241-1279', label: '1241-1279' },
  ],
  northernSong: [
    { key: '960-1000', label: '960-1000' },
    { key: '1001-1040', label: '1001-1040' },
    { key: '1041-1085', label: '1041-1085' },
    { key: '1086-1127', label: '1086-1127' },
  ],
  qing: [
    { key: '1644-1735', label: '1644-1735' },
    { key: '1736-1850', label: '1736-1850' },
    { key: '1851-1911', label: '1851-1911' },
  ],
}

export const EVOLUTION_NOTE_TEMPLATES = [
  '{from}至{to}的{reason}迁徙显著增强。',
  '{reason}推动{from}家族向{to}集中。',
  '{from}—{to}通道活跃，{reason}成为主因。',
  '{to}成为新热点，{from}族群因{reason}迁入。',
]

export const EVOLUTION_REASON_POOL = ['军务调度', '商贸通道', '水利整饬', '行政迁转', '科举流动']

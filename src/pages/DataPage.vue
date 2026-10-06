<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import PageShell from '@/components/layout/PageShell.vue'
import {
  DATA_STATUS_OPTIONS,
  DATA_TYPE_OPTIONS,
  type DataRecord,
  type DataStatusKey,
  type DataTypeKey,
} from '@/modules/data/constants'
import {
  createDataRecord,
  deleteDataRecord,
  fetchDataRecords,
  updateDataRecord,
} from '@/modules/data/api'
import {
  createQueryRecord,
  deleteQueryRecord,
  fetchQueryRecords,
  updateQueryRecord,
} from '@/modules/query/api'
import { QUERY_EVENT_TYPES, type EventTypeKey, type QueryRecord } from '@/modules/query/constants'
import {
  createKnowledgeEdge,
  createKnowledgeNode,
  deleteKnowledgeEdge,
  deleteKnowledgeNode,
  fetchKnowledgeEdgesAdmin,
  fetchKnowledgeNodesAdmin,
  updateKnowledgeEdge,
  updateKnowledgeNode,
  type KnowledgeEdgeApi,
  type KnowledgeNodeApi,
} from '@/modules/knowledge/api'
import {
  NODE_TYPES,
  type KnowledgeNodeType,
} from '@/modules/knowledge/constants'
import {
  createEvolutionFlow,
  createEvolutionPeriod,
  deleteEvolutionFlow,
  deleteEvolutionPeriod,
  fetchEvolutionFlowsAdmin,
  fetchEvolutionPeriodsAdmin,
  updateEvolutionFlow,
  updateEvolutionPeriod,
  type EvolutionFlowApi,
  type EvolutionPeriodApi,
} from '@/modules/evolution/api'
import { EVOLUTION_NODES } from '@/modules/evolution/constants'
import { useMapSourceStore } from '@/stores/mapSource'

type AdminTabKey =
  | 'queryRecords'
  | 'dataRecords'
  | 'knowledgeNodes'
  | 'knowledgeEdges'
  | 'evolutionPeriods'
  | 'evolutionFlows'

type QueryForm = {
  personName: string
  surname: string
  eventName: string
  eventType: EventTypeKey
  location: string
  year: string
  summary: string
  keywords: string
  source: string
}

type DataForm = {
  name: string
  type: DataTypeKey
  source: string
  status: DataStatusKey
  updateTime: string
  description: string
  owner: string
  coverage: string
  records: string
  size: string
  tags: string
  qualityScore: string
  version: string
}

type KnowledgeNodeForm = {
  nodeId: string
  type: KnowledgeNodeType
  label: string
  description: string
  ownerName: string
  era: string
  location: string
  relatedClan: string
  source: string
}

type KnowledgeEdgeForm = {
  edgeId: string
  source: string
  target: string
  label: string
}

type EvolutionPeriodForm = {
  key: string
  label: string
  range: string
  summary: string
}

type EvolutionFlowForm = {
  flowId: string
  periodKey: string
  surname: string
  fromName: string
  fromLng: string
  fromLat: string
  toName: string
  toLng: string
  toLat: string
  intensity: string
  note: string
}

const KEYWORD_SEPARATOR = ','

const mapSourceStore = useMapSourceStore()
const activeSourceKey = computed(() => mapSourceStore.activeSourceKey)
const activeSourceLabel = computed(() =>
  mapSourceStore.sources.find((item) => item.key === activeSourceKey.value)?.label ?? '未知',
)

const tabs = [
  { key: 'queryRecords', label: '查询记录' },
  { key: 'dataRecords', label: '数据记录' },
  { key: 'knowledgeNodes', label: '知识节点' },
  { key: 'knowledgeEdges', label: '知识关系' },
  { key: 'evolutionPeriods', label: '演变时期' },
  { key: 'evolutionFlows', label: '演变流' },
] as const

const activeTab = ref<AdminTabKey>('queryRecords')

const loadingState = ref<Record<AdminTabKey, boolean>>({
  queryRecords: false,
  dataRecords: false,
  knowledgeNodes: false,
  knowledgeEdges: false,
  evolutionPeriods: false,
  evolutionFlows: false,
})

const errorState = ref<Record<AdminTabKey, string>>({
  queryRecords: '',
  dataRecords: '',
  knowledgeNodes: '',
  knowledgeEdges: '',
  evolutionPeriods: '',
  evolutionFlows: '',
})

const queryRecords = ref<QueryRecord[]>([])
const dataRecords = ref<DataRecord[]>([])
const knowledgeNodes = ref<KnowledgeNodeApi[]>([])
const knowledgeEdges = ref<KnowledgeEdgeApi[]>([])
const evolutionPeriods = ref<EvolutionPeriodApi[]>([])
const evolutionFlows = ref<EvolutionFlowApi[]>([])

const queryKeyword = ref('')
const queryEventType = ref<EventTypeKey | 'all'>('all')

const dataKeyword = ref('')
const dataType = ref<DataTypeKey | 'all'>('all')
const dataStatus = ref<DataStatusKey | 'all'>('all')

const knowledgeKeyword = ref('')
const knowledgeType = ref<KnowledgeNodeType | 'all'>('all')

const evolutionPeriodKey = ref('')

const selectedQueryId = ref<number | null>(null)
const selectedDataId = ref<number | null>(null)
const selectedNodeId = ref<number | null>(null)
const selectedEdgeId = ref<number | null>(null)
const selectedPeriodId = ref<number | null>(null)
const selectedFlowId = ref<number | null>(null)

const queryForm = ref<QueryForm>({
  personName: '',
  surname: '',
  eventName: '',
  eventType: QUERY_EVENT_TYPES[0]?.key ?? 'politics',
  location: '',
  year: '',
  summary: '',
  keywords: '',
  source: '',
})

const dataForm = ref<DataForm>({
  name: '',
  type: DATA_TYPE_OPTIONS[0]?.key ?? 'archive',
  source: '',
  status: DATA_STATUS_OPTIONS[0]?.key ?? 'draft',
  updateTime: '',
  description: '',
  owner: '',
  coverage: '',
  records: '',
  size: '',
  tags: '',
  qualityScore: '',
  version: '',
})

const nodeForm = ref<KnowledgeNodeForm>({
  nodeId: '',
  type: NODE_TYPES[0]?.key ?? 'person',
  label: '',
  description: '',
  ownerName: '',
  era: '',
  location: '',
  relatedClan: '',
  source: '',
})

const edgeForm = ref<KnowledgeEdgeForm>({
  edgeId: '',
  source: '',
  target: '',
  label: '',
})

const periodForm = ref<EvolutionPeriodForm>({
  key: '',
  label: '',
  range: '',
  summary: '',
})

const flowForm = ref<EvolutionFlowForm>({
  flowId: '',
  periodKey: '',
  surname: '',
  fromName: '',
  fromLng: '',
  fromLat: '',
  toName: '',
  toLng: '',
  toLat: '',
  intensity: '',
  note: '',
})

const filteredQueryRecords = computed(() => {
  const keywordValue = queryKeyword.value.trim()
  return queryRecords.value.filter((record) => {
    const matchesKeyword =
      !keywordValue ||
      [record.personName, record.surname, record.eventName, record.location, record.summary]
        .join(' ')
        .includes(keywordValue)
    const matchesType = queryEventType.value === 'all' || record.eventType === queryEventType.value
    return matchesKeyword && matchesType
  })
})

const filteredDataRecords = computed(() => {
  const keywordValue = dataKeyword.value.trim()
  return dataRecords.value.filter((record) => {
    const matchesKeyword =
      !keywordValue ||
      [record.name, record.description, record.owner, record.coverage].join(' ').includes(keywordValue)
    const matchesType = dataType.value === 'all' || record.type === dataType.value
    const matchesStatus = dataStatus.value === 'all' || record.status === dataStatus.value
    return matchesKeyword && matchesType && matchesStatus
  })
})

const filteredKnowledgeNodes = computed(() => {
  const keywordValue = knowledgeKeyword.value.trim()
  return knowledgeNodes.value.filter((node) => {
    const matchesKeyword =
      !keywordValue ||
      [node.label, node.description, node.ownerName, node.location ?? '', node.relatedClan ?? '']
        .join(' ')
        .includes(keywordValue)
    const matchesType = knowledgeType.value === 'all' || node.type === knowledgeType.value
    return matchesKeyword && matchesType
  })
})

const filteredKnowledgeEdges = computed(() => knowledgeEdges.value)

const filteredEvolutionPeriods = computed(() => evolutionPeriods.value)

const filteredEvolutionFlows = computed(() => {
  if (!evolutionPeriodKey.value) {
    return evolutionFlows.value
  }
  return evolutionFlows.value.filter((flow) => flow.periodKey === evolutionPeriodKey.value)
})

const setLoading = (key: AdminTabKey, value: boolean) => {
  loadingState.value = { ...loadingState.value, [key]: value }
}

const setError = (key: AdminTabKey, message: string) => {
  errorState.value = { ...errorState.value, [key]: message }
}

const parseListInput = (value: string) =>
  value
    .split(KEYWORD_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean)

const ensureNumber = (value: string, field: string) => {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    throw new Error(`${field} 必须为数字`)
  }
  return parsed
}

const loadQueryRecords = async (sourceKey: string) => {
  try {
    setLoading('queryRecords', true)
    setError('queryRecords', '')
    const result = await fetchQueryRecords(sourceKey)
    queryRecords.value = result.items
  } catch (error) {
    console.error('查询记录加载失败', error)
    setError('queryRecords', '查询记录加载失败')
  } finally {
    setLoading('queryRecords', false)
  }
}

const loadDataRecords = async (sourceKey: string) => {
  try {
    setLoading('dataRecords', true)
    setError('dataRecords', '')
    const result = await fetchDataRecords(sourceKey)
    dataRecords.value = result.items
  } catch (error) {
    console.error('数据记录加载失败', error)
    setError('dataRecords', '数据记录加载失败')
  } finally {
    setLoading('dataRecords', false)
  }
}

const loadKnowledgeNodes = async (sourceKey: string) => {
  try {
    setLoading('knowledgeNodes', true)
    setError('knowledgeNodes', '')
    knowledgeNodes.value = await fetchKnowledgeNodesAdmin(sourceKey)
  } catch (error) {
    console.error('知识节点加载失败', error)
    setError('knowledgeNodes', '知识节点加载失败')
  } finally {
    setLoading('knowledgeNodes', false)
  }
}

const loadKnowledgeEdges = async (sourceKey: string) => {
  try {
    setLoading('knowledgeEdges', true)
    setError('knowledgeEdges', '')
    knowledgeEdges.value = await fetchKnowledgeEdgesAdmin(sourceKey)
  } catch (error) {
    console.error('知识关系加载失败', error)
    setError('knowledgeEdges', '知识关系加载失败')
  } finally {
    setLoading('knowledgeEdges', false)
  }
}

const loadEvolutionPeriods = async (sourceKey: string) => {
  try {
    setLoading('evolutionPeriods', true)
    setError('evolutionPeriods', '')
    evolutionPeriods.value = await fetchEvolutionPeriodsAdmin(sourceKey)
  } catch (error) {
    console.error('演变时期加载失败', error)
    setError('evolutionPeriods', '演变时期加载失败')
  } finally {
    setLoading('evolutionPeriods', false)
  }
}

const loadEvolutionFlows = async (sourceKey: string) => {
  try {
    setLoading('evolutionFlows', true)
    setError('evolutionFlows', '')
    evolutionFlows.value = await fetchEvolutionFlowsAdmin(sourceKey)
  } catch (error) {
    console.error('演变流加载失败', error)
    setError('evolutionFlows', '演变流加载失败')
  } finally {
    setLoading('evolutionFlows', false)
  }
}

const loadAllData = async (sourceKey: string) => {
  await Promise.all([
    loadQueryRecords(sourceKey),
    loadDataRecords(sourceKey),
    loadKnowledgeNodes(sourceKey),
    loadKnowledgeEdges(sourceKey),
    loadEvolutionPeriods(sourceKey),
    loadEvolutionFlows(sourceKey),
  ])
}

const resetQueryForm = () => {
  queryForm.value = {
    personName: '',
    surname: '',
    eventName: '',
    eventType: QUERY_EVENT_TYPES[0]?.key ?? 'politics',
    location: '',
    year: '',
    summary: '',
    keywords: '',
    source: '',
  }
  selectedQueryId.value = null
}

const resetDataForm = () => {
  dataForm.value = {
    name: '',
    type: DATA_TYPE_OPTIONS[0]?.key ?? 'archive',
    source: '',
    status: DATA_STATUS_OPTIONS[0]?.key ?? 'draft',
    updateTime: '',
    description: '',
    owner: '',
    coverage: '',
    records: '',
    size: '',
    tags: '',
    qualityScore: '',
    version: '',
  }
  selectedDataId.value = null
}

const resetNodeForm = () => {
  nodeForm.value = {
    nodeId: '',
    type: NODE_TYPES[0]?.key ?? 'person',
    label: '',
    description: '',
    ownerName: '',
    era: '',
    location: '',
    relatedClan: '',
    source: '',
  }
  selectedNodeId.value = null
}

const resetEdgeForm = () => {
  edgeForm.value = {
    edgeId: '',
    source: '',
    target: '',
    label: '',
  }
  selectedEdgeId.value = null
}

const resetPeriodForm = () => {
  periodForm.value = {
    key: '',
    label: '',
    range: '',
    summary: '',
  }
  selectedPeriodId.value = null
}

const resetFlowForm = () => {
  flowForm.value = {
    flowId: '',
    periodKey: evolutionPeriods.value[0]?.key ?? '',
    surname: '',
    fromName: '',
    fromLng: '',
    fromLat: '',
    toName: '',
    toLng: '',
    toLat: '',
    intensity: '',
    note: '',
  }
  selectedFlowId.value = null
}

const selectQueryRecord = (record: QueryRecord) => {
  selectedQueryId.value = record.id
  queryForm.value = {
    personName: record.personName,
    surname: record.surname,
    eventName: record.eventName,
    eventType: record.eventType,
    location: record.location,
    year: String(record.year),
    summary: record.summary,
    keywords: record.keywords.join(`${KEYWORD_SEPARATOR} `),
    source: record.source,
  }
}

const selectDataRecord = (record: DataRecord) => {
  selectedDataId.value = record.id
  dataForm.value = {
    name: record.name,
    type: record.type,
    source: record.source,
    status: record.status,
    updateTime: record.updateTime,
    description: record.description,
    owner: record.owner,
    coverage: record.coverage,
    records: String(record.records),
    size: record.size,
    tags: record.tags.join(`${KEYWORD_SEPARATOR} `),
    qualityScore: String(record.qualityScore),
    version: record.version,
  }
}

const selectKnowledgeNode = (node: KnowledgeNodeApi) => {
  selectedNodeId.value = node.id
  nodeForm.value = {
    nodeId: node.nodeId,
    type: node.type,
    label: node.label,
    description: node.description,
    ownerName: node.ownerName,
    era: node.era ?? '',
    location: node.location ?? '',
    relatedClan: node.relatedClan ?? '',
    source: node.source ?? '',
  }
}

const selectKnowledgeEdge = (edge: KnowledgeEdgeApi) => {
  selectedEdgeId.value = edge.id
  edgeForm.value = {
    edgeId: edge.edgeId,
    source: edge.source,
    target: edge.target,
    label: edge.label,
  }
}

const selectEvolutionPeriod = (period: EvolutionPeriodApi) => {
  selectedPeriodId.value = period.id
  periodForm.value = {
    key: period.key,
    label: period.label,
    range: period.range,
    summary: period.summary,
  }
}

const selectEvolutionFlow = (flow: EvolutionFlowApi) => {
  selectedFlowId.value = flow.id
  flowForm.value = {
    flowId: flow.flowId,
    periodKey: flow.periodKey,
    surname: flow.surname,
    fromName: flow.fromName,
    fromLng: String(flow.fromLng),
    fromLat: String(flow.fromLat),
    toName: flow.toName,
    toLng: String(flow.toLng),
    toLat: String(flow.toLat),
    intensity: String(flow.intensity),
    note: flow.note,
  }
}

const syncFlowNode = (target: 'from' | 'to') => {
  const nodeName = target === 'from' ? flowForm.value.fromName : flowForm.value.toName
  const node = Object.values(EVOLUTION_NODES).find((item) => item.name === nodeName)
  if (!node) {
    return
  }
  if (target === 'from') {
    flowForm.value.fromLng = String(node.longitude)
    flowForm.value.fromLat = String(node.latitude)
  } else {
    flowForm.value.toLng = String(node.longitude)
    flowForm.value.toLat = String(node.latitude)
  }
}

const submitQueryForm = async () => {
  try {
    const payload = {
      source_key: activeSourceKey.value,
      person_name: queryForm.value.personName,
      surname: queryForm.value.surname,
      event_name: queryForm.value.eventName,
      event_type: queryForm.value.eventType,
      location: queryForm.value.location,
      year: ensureNumber(queryForm.value.year, '年份'),
      summary: queryForm.value.summary,
      keywords: parseListInput(queryForm.value.keywords),
      source: queryForm.value.source,
    }

    if (selectedQueryId.value) {
      await updateQueryRecord(selectedQueryId.value, payload)
    } else {
      await createQueryRecord(payload)
    }
    await loadQueryRecords(activeSourceKey.value)
    resetQueryForm()
  } catch (error) {
    console.error('保存查询记录失败', error)
    setError('queryRecords', '保存查询记录失败')
  }
}

const submitDataForm = async () => {
  try {
    const payload = {
      source_key: activeSourceKey.value,
      name: dataForm.value.name,
      type: dataForm.value.type,
      source: dataForm.value.source,
      status: dataForm.value.status,
      update_time: dataForm.value.updateTime,
      description: dataForm.value.description,
      owner: dataForm.value.owner,
      coverage: dataForm.value.coverage,
      records: ensureNumber(dataForm.value.records, '记录数'),
      size: dataForm.value.size,
      tags: parseListInput(dataForm.value.tags),
      quality_score: ensureNumber(dataForm.value.qualityScore, '质量评分'),
      version: dataForm.value.version,
    }

    if (selectedDataId.value) {
      await updateDataRecord(selectedDataId.value, payload)
    } else {
      await createDataRecord(payload)
    }
    await loadDataRecords(activeSourceKey.value)
    resetDataForm()
  } catch (error) {
    console.error('保存数据记录失败', error)
    setError('dataRecords', '保存数据记录失败')
  }
}

const submitNodeForm = async () => {
  try {
    const payload = {
      source_key: activeSourceKey.value,
      node_id: nodeForm.value.nodeId,
      type: nodeForm.value.type,
      label: nodeForm.value.label,
      description: nodeForm.value.description,
      owner_name: nodeForm.value.ownerName,
      era: nodeForm.value.era || undefined,
      location: nodeForm.value.location || undefined,
      related_clan: nodeForm.value.relatedClan || undefined,
      source: nodeForm.value.source || undefined,
    }

    if (selectedNodeId.value) {
      await updateKnowledgeNode(selectedNodeId.value, payload)
    } else {
      await createKnowledgeNode(payload)
    }
    await loadKnowledgeNodes(activeSourceKey.value)
    resetNodeForm()
  } catch (error) {
    console.error('保存知识节点失败', error)
    setError('knowledgeNodes', '保存知识节点失败')
  }
}

const submitEdgeForm = async () => {
  try {
    const payload = {
      source_key: activeSourceKey.value,
      edge_id: edgeForm.value.edgeId,
      source: edgeForm.value.source,
      target: edgeForm.value.target,
      label: edgeForm.value.label,
    }

    if (selectedEdgeId.value) {
      await updateKnowledgeEdge(selectedEdgeId.value, payload)
    } else {
      await createKnowledgeEdge(payload)
    }
    await loadKnowledgeEdges(activeSourceKey.value)
    resetEdgeForm()
  } catch (error) {
    console.error('保存知识关系失败', error)
    setError('knowledgeEdges', '保存知识关系失败')
  }
}

const submitPeriodForm = async () => {
  try {
    const payload = {
      source_key: activeSourceKey.value,
      key: periodForm.value.key,
      label: periodForm.value.label,
      range: periodForm.value.range,
      summary: periodForm.value.summary,
    }

    if (selectedPeriodId.value) {
      await updateEvolutionPeriod(selectedPeriodId.value, payload)
    } else {
      await createEvolutionPeriod(payload)
    }
    await loadEvolutionPeriods(activeSourceKey.value)
    resetPeriodForm()
  } catch (error) {
    console.error('保存演变时期失败', error)
    setError('evolutionPeriods', '保存演变时期失败')
  }
}

const submitFlowForm = async () => {
  try {
    const payload = {
      source_key: activeSourceKey.value,
      flow_id: flowForm.value.flowId,
      period_key: flowForm.value.periodKey,
      surname: flowForm.value.surname,
      from_name: flowForm.value.fromName,
      from_lng: ensureNumber(flowForm.value.fromLng, '起点经度'),
      from_lat: ensureNumber(flowForm.value.fromLat, '起点纬度'),
      to_name: flowForm.value.toName,
      to_lng: ensureNumber(flowForm.value.toLng, '终点经度'),
      to_lat: ensureNumber(flowForm.value.toLat, '终点纬度'),
      intensity: ensureNumber(flowForm.value.intensity, '强度'),
      note: flowForm.value.note,
    }

    if (selectedFlowId.value) {
      await updateEvolutionFlow(selectedFlowId.value, payload)
    } else {
      await createEvolutionFlow(payload)
    }
    await loadEvolutionFlows(activeSourceKey.value)
    resetFlowForm()
  } catch (error) {
    console.error('保存演变流失败', error)
    setError('evolutionFlows', '保存演变流失败')
  }
}

const confirmDelete = (message: string) => window.confirm(message)

const removeQueryRecord = async (record: QueryRecord) => {
  if (!confirmDelete(`确认删除 ${record.personName} 的记录？`)) {
    return
  }
  await deleteQueryRecord(record.id)
  await loadQueryRecords(activeSourceKey.value)
  resetQueryForm()
}

const removeDataRecord = async (record: DataRecord) => {
  if (!confirmDelete(`确认删除 ${record.name}？`)) {
    return
  }
  await deleteDataRecord(record.id)
  await loadDataRecords(activeSourceKey.value)
  resetDataForm()
}

const removeKnowledgeNode = async (node: KnowledgeNodeApi) => {
  if (!confirmDelete(`确认删除节点 ${node.label}？`)) {
    return
  }
  await deleteKnowledgeNode(node.id)
  await loadKnowledgeNodes(activeSourceKey.value)
  resetNodeForm()
}

const removeKnowledgeEdge = async (edge: KnowledgeEdgeApi) => {
  if (!confirmDelete(`确认删除关系 ${edge.label}？`)) {
    return
  }
  await deleteKnowledgeEdge(edge.id)
  await loadKnowledgeEdges(activeSourceKey.value)
  resetEdgeForm()
}

const removeEvolutionPeriod = async (period: EvolutionPeriodApi) => {
  if (!confirmDelete(`确认删除时期 ${period.label}？`)) {
    return
  }
  await deleteEvolutionPeriod(period.id)
  await loadEvolutionPeriods(activeSourceKey.value)
  resetPeriodForm()
}

const removeEvolutionFlow = async (flow: EvolutionFlowApi) => {
  if (!confirmDelete(`确认删除流 ${flow.flowId}？`)) {
    return
  }
  await deleteEvolutionFlow(flow.id)
  await loadEvolutionFlows(activeSourceKey.value)
  resetFlowForm()
}

watch(
  activeSourceKey,
  (sourceKey) => {
    void loadAllData(sourceKey)
    resetQueryForm()
    resetDataForm()
    resetNodeForm()
    resetEdgeForm()
    resetPeriodForm()
    resetFlowForm()
  },
  { immediate: true },
)

watch(evolutionPeriods, () => {
  if (!flowForm.value.periodKey) {
    flowForm.value.periodKey = evolutionPeriods.value[0]?.key ?? ''
  }
})
</script>

<template>
  <PageShell title="管理数据" subtitle="按要素类型维护查询、知识与演变数据">
    <div class="admin-layout">
      <header class="admin-header">
        <div class="admin-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="tab-button"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="admin-meta">
          当前要素：<strong>{{ activeSourceLabel }}</strong>
        </div>
      </header>

      <section v-if="activeTab === 'queryRecords'" class="admin-panel">
        <div class="panel-toolbar">
          <div>
            <h3>查询记录</h3>
            <p>共 {{ filteredQueryRecords.length }} 条记录</p>
          </div>
          <div class="toolbar-actions">
            <input v-model="queryKeyword" class="input" placeholder="搜索人物/地点/事件" />
            <select v-model="queryEventType" class="select">
              <option value="all">全部类型</option>
              <option v-for="item in QUERY_EVENT_TYPES" :key="item.key" :value="item.key">
                {{ item.label }}
              </option>
            </select>
            <button class="btn secondary" type="button" @click="loadQueryRecords(activeSourceKey)">
              刷新
            </button>
            <button class="btn" type="button" @click="resetQueryForm">新增</button>
          </div>
        </div>
        <div v-if="errorState.queryRecords" class="panel-error">{{ errorState.queryRecords }}</div>
        <div class="panel-body">
          <div class="table-panel">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>人物</th>
                  <th>事件类型</th>
                  <th>地点</th>
                  <th>年份</th>
                  <th>事件</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in filteredQueryRecords" :key="record.id">
                  <td>{{ record.id }}</td>
                  <td>{{ record.personName }}</td>
                  <td>{{ QUERY_EVENT_TYPES.find((item) => item.key === record.eventType)?.label }}</td>
                  <td>{{ record.location }}</td>
                  <td>{{ record.year }}</td>
                  <td>{{ record.eventName }}</td>
                  <td>
                    <button class="btn-link" type="button" @click="selectQueryRecord(record)">
                      编辑
                    </button>
                    <button class="btn-link danger" type="button" @click="removeQueryRecord(record)">
                      删除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <form class="form-panel" @submit.prevent="submitQueryForm">
            <h4>{{ selectedQueryId ? '编辑记录' : '新增记录' }}</h4>
            <div class="form-grid">
              <label class="form-field">
                <span>人物</span>
                <input v-model="queryForm.personName" class="input" required />
              </label>
              <label class="form-field">
                <span>姓氏</span>
                <input v-model="queryForm.surname" class="input" required />
              </label>
              <label class="form-field">
                <span>事件名称</span>
                <input v-model="queryForm.eventName" class="input" required />
              </label>
              <label class="form-field">
                <span>事件类型</span>
                <select v-model="queryForm.eventType" class="select">
                  <option v-for="item in QUERY_EVENT_TYPES" :key="item.key" :value="item.key">
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="form-field">
                <span>地点</span>
                <input v-model="queryForm.location" class="input" required />
              </label>
              <label class="form-field">
                <span>年份</span>
                <input v-model="queryForm.year" class="input" required />
              </label>
              <label class="form-field full">
                <span>摘要</span>
                <textarea v-model="queryForm.summary" class="textarea" rows="3" required></textarea>
              </label>
              <label class="form-field full">
                <span>关键词（逗号分隔）</span>
                <input v-model="queryForm.keywords" class="input" />
              </label>
              <label class="form-field full">
                <span>来源</span>
                <input v-model="queryForm.source" class="input" />
              </label>
            </div>
            <div class="form-actions">
              <button class="btn" type="submit">保存</button>
              <button class="btn secondary" type="button" @click="resetQueryForm">清空</button>
            </div>
          </form>
        </div>
      </section>

      <section v-else-if="activeTab === 'dataRecords'" class="admin-panel">
        <div class="panel-toolbar">
          <div>
            <h3>数据记录</h3>
            <p>共 {{ filteredDataRecords.length }} 条记录</p>
          </div>
          <div class="toolbar-actions">
            <input v-model="dataKeyword" class="input" placeholder="搜索名称/描述" />
            <select v-model="dataType" class="select">
              <option value="all">全部类型</option>
              <option v-for="item in DATA_TYPE_OPTIONS" :key="item.key" :value="item.key">
                {{ item.label }}
              </option>
            </select>
            <select v-model="dataStatus" class="select">
              <option value="all">全部状态</option>
              <option v-for="item in DATA_STATUS_OPTIONS" :key="item.key" :value="item.key">
                {{ item.label }}
              </option>
            </select>
            <button class="btn secondary" type="button" @click="loadDataRecords(activeSourceKey)">
              刷新
            </button>
            <button class="btn" type="button" @click="resetDataForm">新增</button>
          </div>
        </div>
        <div v-if="errorState.dataRecords" class="panel-error">{{ errorState.dataRecords }}</div>
        <div class="panel-body">
          <div class="table-panel">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>名称</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>质量</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in filteredDataRecords" :key="record.id">
                  <td>{{ record.id }}</td>
                  <td>{{ record.name }}</td>
                  <td>{{ DATA_TYPE_OPTIONS.find((item) => item.key === record.type)?.label }}</td>
                  <td>{{ DATA_STATUS_OPTIONS.find((item) => item.key === record.status)?.label }}</td>
                  <td>{{ record.updateTime }}</td>
                  <td>{{ record.qualityScore }}</td>
                  <td>
                    <button class="btn-link" type="button" @click="selectDataRecord(record)">
                      编辑
                    </button>
                    <button class="btn-link danger" type="button" @click="removeDataRecord(record)">
                      删除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <form class="form-panel" @submit.prevent="submitDataForm">
            <h4>{{ selectedDataId ? '编辑记录' : '新增记录' }}</h4>
            <div class="form-grid">
              <label class="form-field">
                <span>名称</span>
                <input v-model="dataForm.name" class="input" required />
              </label>
              <label class="form-field">
                <span>类型</span>
                <select v-model="dataForm.type" class="select">
                  <option v-for="item in DATA_TYPE_OPTIONS" :key="item.key" :value="item.key">
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="form-field">
                <span>状态</span>
                <select v-model="dataForm.status" class="select">
                  <option v-for="item in DATA_STATUS_OPTIONS" :key="item.key" :value="item.key">
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="form-field">
                <span>来源</span>
                <input v-model="dataForm.source" class="input" required />
              </label>
              <label class="form-field">
                <span>更新时间</span>
                <input v-model="dataForm.updateTime" class="input" placeholder="2025-01-01 12:00" />
              </label>
              <label class="form-field">
                <span>负责人</span>
                <input v-model="dataForm.owner" class="input" />
              </label>
              <label class="form-field">
                <span>覆盖范围</span>
                <input v-model="dataForm.coverage" class="input" />
              </label>
              <label class="form-field">
                <span>记录数</span>
                <input v-model="dataForm.records" class="input" />
              </label>
              <label class="form-field">
                <span>数据大小</span>
                <input v-model="dataForm.size" class="input" />
              </label>
              <label class="form-field">
                <span>质量评分</span>
                <input v-model="dataForm.qualityScore" class="input" />
              </label>
              <label class="form-field">
                <span>版本</span>
                <input v-model="dataForm.version" class="input" />
              </label>
              <label class="form-field full">
                <span>描述</span>
                <textarea v-model="dataForm.description" class="textarea" rows="3"></textarea>
              </label>
              <label class="form-field full">
                <span>标签（逗号分隔）</span>
                <input v-model="dataForm.tags" class="input" />
              </label>
            </div>
            <div class="form-actions">
              <button class="btn" type="submit">保存</button>
              <button class="btn secondary" type="button" @click="resetDataForm">清空</button>
            </div>
          </form>
        </div>
      </section>

      <section v-else-if="activeTab === 'knowledgeNodes'" class="admin-panel">
        <div class="panel-toolbar">
          <div>
            <h3>知识节点</h3>
            <p>共 {{ filteredKnowledgeNodes.length }} 条记录</p>
          </div>
          <div class="toolbar-actions">
            <input v-model="knowledgeKeyword" class="input" placeholder="搜索标签/描述" />
            <select v-model="knowledgeType" class="select">
              <option value="all">全部类型</option>
              <option v-for="item in NODE_TYPES" :key="item.key" :value="item.key">
                {{ item.label }}
              </option>
            </select>
            <button class="btn secondary" type="button" @click="loadKnowledgeNodes(activeSourceKey)">
              刷新
            </button>
            <button class="btn" type="button" @click="resetNodeForm">新增</button>
          </div>
        </div>
        <div v-if="errorState.knowledgeNodes" class="panel-error">{{ errorState.knowledgeNodes }}</div>
        <div class="panel-body">
          <div class="table-panel">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>节点ID</th>
                  <th>类型</th>
                  <th>标签</th>
                  <th>负责人</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="node in filteredKnowledgeNodes" :key="node.id">
                  <td>{{ node.id }}</td>
                  <td>{{ node.nodeId }}</td>
                  <td>{{ NODE_TYPES.find((item) => item.key === node.type)?.label }}</td>
                  <td>{{ node.label }}</td>
                  <td>{{ node.ownerName }}</td>
                  <td>
                    <button class="btn-link" type="button" @click="selectKnowledgeNode(node)">
                      编辑
                    </button>
                    <button class="btn-link danger" type="button" @click="removeKnowledgeNode(node)">
                      删除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <form class="form-panel" @submit.prevent="submitNodeForm">
            <h4>{{ selectedNodeId ? '编辑节点' : '新增节点' }}</h4>
            <div class="form-grid">
              <label class="form-field">
                <span>节点ID</span>
                <input v-model="nodeForm.nodeId" class="input" required />
              </label>
              <label class="form-field">
                <span>类型</span>
                <select v-model="nodeForm.type" class="select">
                  <option v-for="item in NODE_TYPES" :key="item.key" :value="item.key">
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="form-field">
                <span>标签</span>
                <input v-model="nodeForm.label" class="input" required />
              </label>
              <label class="form-field">
                <span>负责人</span>
                <input v-model="nodeForm.ownerName" class="input" />
              </label>
              <label class="form-field">
                <span>年代</span>
                <input v-model="nodeForm.era" class="input" />
              </label>
              <label class="form-field">
                <span>地点</span>
                <input v-model="nodeForm.location" class="input" />
              </label>
              <label class="form-field">
                <span>家族</span>
                <input v-model="nodeForm.relatedClan" class="input" />
              </label>
              <label class="form-field">
                <span>来源</span>
                <input v-model="nodeForm.source" class="input" />
              </label>
              <label class="form-field full">
                <span>描述</span>
                <textarea v-model="nodeForm.description" class="textarea" rows="3"></textarea>
              </label>
            </div>
            <div class="form-actions">
              <button class="btn" type="submit">保存</button>
              <button class="btn secondary" type="button" @click="resetNodeForm">清空</button>
            </div>
          </form>
        </div>
      </section>

      <section v-else-if="activeTab === 'knowledgeEdges'" class="admin-panel">
        <div class="panel-toolbar">
          <div>
            <h3>知识关系</h3>
            <p>共 {{ filteredKnowledgeEdges.length }} 条记录</p>
          </div>
          <div class="toolbar-actions">
            <button class="btn secondary" type="button" @click="loadKnowledgeEdges(activeSourceKey)">
              刷新
            </button>
            <button class="btn" type="button" @click="resetEdgeForm">新增</button>
          </div>
        </div>
        <div v-if="errorState.knowledgeEdges" class="panel-error">{{ errorState.knowledgeEdges }}</div>
        <div class="panel-body">
          <div class="table-panel">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>关系ID</th>
                  <th>来源</th>
                  <th>目标</th>
                  <th>标签</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="edge in filteredKnowledgeEdges" :key="edge.id">
                  <td>{{ edge.id }}</td>
                  <td>{{ edge.edgeId }}</td>
                  <td>{{ edge.source }}</td>
                  <td>{{ edge.target }}</td>
                  <td>{{ edge.label }}</td>
                  <td>
                    <button class="btn-link" type="button" @click="selectKnowledgeEdge(edge)">
                      编辑
                    </button>
                    <button class="btn-link danger" type="button" @click="removeKnowledgeEdge(edge)">
                      删除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <form class="form-panel" @submit.prevent="submitEdgeForm">
            <h4>{{ selectedEdgeId ? '编辑关系' : '新增关系' }}</h4>
            <div class="form-grid">
              <label class="form-field">
                <span>关系ID</span>
                <input v-model="edgeForm.edgeId" class="input" required />
              </label>
              <label class="form-field">
                <span>来源节点</span>
                <input v-model="edgeForm.source" class="input" required />
              </label>
              <label class="form-field">
                <span>目标节点</span>
                <input v-model="edgeForm.target" class="input" required />
              </label>
              <label class="form-field">
                <span>关系标签</span>
                <input v-model="edgeForm.label" class="input" required />
              </label>
            </div>
            <div class="form-actions">
              <button class="btn" type="submit">保存</button>
              <button class="btn secondary" type="button" @click="resetEdgeForm">清空</button>
            </div>
          </form>
        </div>
      </section>

      <section v-else-if="activeTab === 'evolutionPeriods'" class="admin-panel">
        <div class="panel-toolbar">
          <div>
            <h3>演变时期</h3>
            <p>共 {{ filteredEvolutionPeriods.length }} 条记录</p>
          </div>
          <div class="toolbar-actions">
            <button class="btn secondary" type="button" @click="loadEvolutionPeriods(activeSourceKey)">
              刷新
            </button>
            <button class="btn" type="button" @click="resetPeriodForm">新增</button>
          </div>
        </div>
        <div v-if="errorState.evolutionPeriods" class="panel-error">{{ errorState.evolutionPeriods }}</div>
        <div class="panel-body">
          <div class="table-panel">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Key</th>
                  <th>标签</th>
                  <th>范围</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="period in filteredEvolutionPeriods" :key="period.id">
                  <td>{{ period.id }}</td>
                  <td>{{ period.key }}</td>
                  <td>{{ period.label }}</td>
                  <td>{{ period.range }}</td>
                  <td>
                    <button class="btn-link" type="button" @click="selectEvolutionPeriod(period)">
                      编辑
                    </button>
                    <button class="btn-link danger" type="button" @click="removeEvolutionPeriod(period)">
                      删除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <form class="form-panel" @submit.prevent="submitPeriodForm">
            <h4>{{ selectedPeriodId ? '编辑时期' : '新增时期' }}</h4>
            <div class="form-grid">
              <label class="form-field">
                <span>Key</span>
                <input v-model="periodForm.key" class="input" required />
              </label>
              <label class="form-field">
                <span>标签</span>
                <input v-model="periodForm.label" class="input" required />
              </label>
              <label class="form-field">
                <span>范围</span>
                <input v-model="periodForm.range" class="input" required />
              </label>
              <label class="form-field full">
                <span>说明</span>
                <textarea v-model="periodForm.summary" class="textarea" rows="3"></textarea>
              </label>
            </div>
            <div class="form-actions">
              <button class="btn" type="submit">保存</button>
              <button class="btn secondary" type="button" @click="resetPeriodForm">清空</button>
            </div>
          </form>
        </div>
      </section>

      <section v-else-if="activeTab === 'evolutionFlows'" class="admin-panel">
        <div class="panel-toolbar">
          <div>
            <h3>演变流</h3>
            <p>共 {{ filteredEvolutionFlows.length }} 条记录</p>
          </div>
          <div class="toolbar-actions">
            <select v-model="evolutionPeriodKey" class="select">
              <option value="">全部时期</option>
              <option v-for="period in evolutionPeriods" :key="period.key" :value="period.key">
                {{ period.label }}
              </option>
            </select>
            <button class="btn secondary" type="button" @click="loadEvolutionFlows(activeSourceKey)">
              刷新
            </button>
            <button class="btn" type="button" @click="resetFlowForm">新增</button>
          </div>
        </div>
        <div v-if="errorState.evolutionFlows" class="panel-error">{{ errorState.evolutionFlows }}</div>
        <div class="panel-body">
          <div class="table-panel">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Flow</th>
                  <th>时期</th>
                  <th>姓氏</th>
                  <th>路径</th>
                  <th>强度</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="flow in filteredEvolutionFlows" :key="flow.id">
                  <td>{{ flow.id }}</td>
                  <td>{{ flow.flowId }}</td>
                  <td>{{ flow.periodKey }}</td>
                  <td>{{ flow.surname }}</td>
                  <td>{{ flow.fromName }} → {{ flow.toName }}</td>
                  <td>{{ flow.intensity }}</td>
                  <td>
                    <button class="btn-link" type="button" @click="selectEvolutionFlow(flow)">
                      编辑
                    </button>
                    <button class="btn-link danger" type="button" @click="removeEvolutionFlow(flow)">
                      删除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <form class="form-panel" @submit.prevent="submitFlowForm">
            <h4>{{ selectedFlowId ? '编辑演变流' : '新增演变流' }}</h4>
            <div class="form-grid">
              <label class="form-field">
                <span>Flow ID</span>
                <input v-model="flowForm.flowId" class="input" required />
              </label>
              <label class="form-field">
                <span>时期</span>
                <select v-model="flowForm.periodKey" class="select" required>
                  <option v-for="period in evolutionPeriods" :key="period.key" :value="period.key">
                    {{ period.label }}
                  </option>
                </select>
              </label>
              <label class="form-field">
                <span>姓氏</span>
                <input v-model="flowForm.surname" class="input" required />
              </label>
              <label class="form-field">
                <span>起点</span>
                <select v-model="flowForm.fromName" class="select" @change="syncFlowNode('from')">
                  <option value="">选择节点</option>
                  <option
                    v-for="node in Object.values(EVOLUTION_NODES)"
                    :key="node.name"
                    :value="node.name"
                  >
                    {{ node.name }}
                  </option>
                </select>
              </label>
              <label class="form-field">
                <span>起点经度</span>
                <input v-model="flowForm.fromLng" class="input" required />
              </label>
              <label class="form-field">
                <span>起点纬度</span>
                <input v-model="flowForm.fromLat" class="input" required />
              </label>
              <label class="form-field">
                <span>终点</span>
                <select v-model="flowForm.toName" class="select" @change="syncFlowNode('to')">
                  <option value="">选择节点</option>
                  <option
                    v-for="node in Object.values(EVOLUTION_NODES)"
                    :key="node.name"
                    :value="node.name"
                  >
                    {{ node.name }}
                  </option>
                </select>
              </label>
              <label class="form-field">
                <span>终点经度</span>
                <input v-model="flowForm.toLng" class="input" required />
              </label>
              <label class="form-field">
                <span>终点纬度</span>
                <input v-model="flowForm.toLat" class="input" required />
              </label>
              <label class="form-field">
                <span>强度</span>
                <input v-model="flowForm.intensity" class="input" required />
              </label>
              <label class="form-field full">
                <span>说明</span>
                <textarea v-model="flowForm.note" class="textarea" rows="3"></textarea>
              </label>
            </div>
            <div class="form-actions">
              <button class="btn" type="submit">保存</button>
              <button class="btn secondary" type="button" @click="resetFlowForm">清空</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  </PageShell>
</template>

<style scoped>
.admin-layout {
  display: grid;
  gap: 20px;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 20px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  box-shadow: var(--shadow-soft);
}

.admin-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tab-button {
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(31, 136, 167, 0.3);
  background: rgba(31, 136, 167, 0.08);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-strong);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background: rgba(31, 136, 167, 0.15);
  border-color: rgba(31, 136, 167, 0.4);
}

.tab-button.active {
  background: #1f88a7;
  border-color: #1f88a7;
  color: #fff;
  font-weight: 600;
}

.admin-meta {
  font-size: 14px;
  color: var(--text-muted);
  padding: 8px 16px;
  background: rgba(31, 136, 167, 0.05);
  border-radius: 8px;
}

.admin-meta strong {
  color: #1f88a7;
  font-weight: 600;
}

.admin-panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  padding: 20px;
  box-shadow: var(--shadow-soft);
}

.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(31, 136, 167, 0.1);
}

.panel-toolbar > div:first-child {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-shrink: 0;
}

.panel-toolbar h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-strong);
  white-space: nowrap;
}

.panel-toolbar p {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
}

.toolbar-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.toolbar-actions .input {
  min-width: 200px;
  width: 200px;
}

.toolbar-actions .select {
  min-width: 120px;
  width: auto;
}

.panel-error {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(217, 93, 57, 0.08);
  border: 1px solid rgba(217, 93, 57, 0.2);
  color: #a94a31;
  font-size: 13px;
  font-weight: 500;
}

.panel-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
}

.table-panel {
  overflow: auto;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(31, 136, 167, 0.08);
  text-align: left;
  white-space: nowrap;
}

th {
  background: rgba(31, 136, 167, 0.06);
  font-weight: 600;
  color: var(--text-strong);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  position: sticky;
  top: 0;
  z-index: 1;
}

tbody tr {
  transition: background-color 0.15s ease;
}

tbody tr:hover {
  background: rgba(31, 136, 167, 0.03);
}

tbody tr:last-child td {
  border-bottom: none;
}

.form-panel {
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  height: fit-content;
}

.form-panel h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-strong);
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(31, 136, 167, 0.1);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-field {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-strong);
}

.form-field.full {
  grid-column: 1 / -1;
}

.input,
.select,
.textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(31, 136, 167, 0.25);
  background: #fff;
  font-size: 13px;
  transition: all 0.2s ease;
}

.input:focus,
.select:focus,
.textarea:focus {
  outline: none;
  border-color: #1f88a7;
  box-shadow: 0 0 0 3px rgba(31, 136, 167, 0.1);
}

.textarea {
  resize: vertical;
  font-family: inherit;
}

.form-actions {
  display: flex;
  gap: 10px;
  padding-top: 8px;
}

.btn {
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: #1f88a7;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background: #1a7090;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(31, 136, 167, 0.3);
}

.btn.secondary {
  background: rgba(31, 136, 167, 0.1);
  color: #1f6f93;
  border: 1px solid rgba(31, 136, 167, 0.3);
}

.btn.secondary:hover {
  background: rgba(31, 136, 167, 0.15);
  border-color: rgba(31, 136, 167, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(31, 136, 167, 0.15);
}

.btn-link {
  background: transparent;
  border: none;
  color: #1f88a7;
  font-size: 13px;
  font-weight: 500;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-link:hover {
  color: #1a7090;
  text-decoration: underline;
}

.btn-link.danger {
  color: #d95d39;
}

.btn-link.danger:hover {
  color: #b84c3a;
}

@media (max-width: 1200px) {
  .panel-body {
    grid-template-columns: 1fr;
  }

  .form-panel {
    order: -1;
  }
}

@media (max-width: 768px) {
  .admin-header {
    padding: 12px 16px;
  }

  .admin-panel {
    padding: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions .input,
  .toolbar-actions .select {
    flex: 1;
    min-width: 150px;
  }
}
</style>

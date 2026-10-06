<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import PageShell from '@/components/layout/PageShell.vue'
import { openSurnameCard } from '@/modules/surname/store'
import { fetchQueryRecords, fetchQueryTimeRanges } from '@/modules/query/api'
import { QUERY_EVENT_TYPES, type EventTypeKey, type QueryRecord, type QueryTimeRange } from '@/modules/query/constants'
import { useMapSourceStore } from '@/stores/mapSource'

const mapSourceStore = useMapSourceStore()
const activeSourceKey = computed(() => mapSourceStore.activeSourceKey)

const keyword = ref('')
const selectedEventTypes = ref<EventTypeKey[]>([])
const selectedTimeRanges = ref<string[]>([])

const queryRecords = ref<QueryRecord[]>([])
const timeRanges = ref<QueryTimeRange[]>([])
const queryKey = ref(0)
const isLoading = ref(false)
const errorMessage = ref('')

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

const filteredRecords = computed(() =>
  queryRecords.value.filter((record) => {
    const keywordValue = normalizedKeyword.value
    const matchesKeyword =
      !keywordValue ||
      [
        record.personName,
        record.surname,
        record.eventName,
        record.location,
        record.summary,
        record.keywords.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(keywordValue)

    const matchesType =
      selectedEventTypes.value.length === 0 || selectedEventTypes.value.includes(record.eventType)

    const matchesTime =
      selectedTimeRanges.value.length === 0 ||
      selectedTimeRanges.value.some((rangeKey) => {
        const range = timeRanges.value.find((item) => item.key === rangeKey)
        if (!range) {
          return false
        }
        return record.year >= range.startYear && record.year <= range.endYear
      })

    return matchesKeyword && matchesType && matchesTime
  }),
)

const resultCount = computed(() => filteredRecords.value.length)

const topEventType = computed(() => {
  const tally = new Map<EventTypeKey, number>()
  filteredRecords.value.forEach((record) => {
    tally.set(record.eventType, (tally.get(record.eventType) ?? 0) + 1)
  })
  const sorted = Array.from(tally.entries()).sort((a, b) => b[1] - a[1])
  const top = sorted[0]
  if (!top) {
    return null
  }
  return {
    key: top[0],
    count: top[1],
    label: QUERY_EVENT_TYPES.find((item) => item.key === top[0])?.label ?? '未知',
  }
})

const topLocation = computed(() => {
  const tally = new Map<string, number>()
  filteredRecords.value.forEach((record) => {
    tally.set(record.location, (tally.get(record.location) ?? 0) + 1)
  })
  const sorted = Array.from(tally.entries()).sort((a, b) => b[1] - a[1])
  const top = sorted[0]
  if (!top) {
    return null
  }
  return { location: top[0], count: top[1] }
})

const clearFilters = () => {
  keyword.value = ''
  selectedEventTypes.value = []
  selectedTimeRanges.value = []
}

const toggleTimeRange = (rangeKey: string) => {
  if (selectedTimeRanges.value.includes(rangeKey)) {
    selectedTimeRanges.value = selectedTimeRanges.value.filter((item) => item !== rangeKey)
    return
  }
  selectedTimeRanges.value = [...selectedTimeRanges.value, rangeKey]
}

const isTimeRangeActive = (rangeKey: string) => selectedTimeRanges.value.includes(rangeKey)

const loadQueryData = async (sourceKey: string) => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    const [recordResult, rangeResult] = await Promise.all([
      fetchQueryRecords(sourceKey),
      fetchQueryTimeRanges(sourceKey),
    ])
    queryRecords.value = recordResult.items
    timeRanges.value = rangeResult.items
    clearFilters()
    queryKey.value += 1
  } catch (error) {
    console.error('查询数据加载失败', error)
    errorMessage.value = '查询数据加载失败'
  } finally {
    isLoading.value = false
  }
}

watch(
  activeSourceKey,
  (sourceKey) => {
    void loadQueryData(sourceKey)
  },
  { immediate: true },
)
</script>

<template>
  <PageShell title="查询" subtitle="按姓名、地点、事件与时间段进行快速检索">
    <div class="query-layout" :key="queryKey">
      <aside class="filters">
        <div class="filter-card">
          <div class="filter-title">关键词检索</div>
          <input v-model="keyword" class="keyword-input" placeholder="人物、地点、事件、关键词" />
          <div class="hint">支持全文检索文献摘要与关键词</div>
        </div>

        <div class="filter-card">
          <div class="filter-title">时间段</div>
          <div class="chips">
            <button
              v-for="range in timeRanges"
              :key="range.key"
              type="button"
              class="chip"
              :class="{ active: isTimeRangeActive(range.key) }"
              @click="toggleTimeRange(range.key)"
            >
              {{ range.label }}
            </button>
          </div>
        </div>

        <div class="filter-card">
          <div class="filter-title">事件类型</div>
          <div class="checkbox-list">
            <label v-for="item in QUERY_EVENT_TYPES" :key="item.key" class="checkbox-item">
              <input v-model="selectedEventTypes" type="checkbox" :value="item.key" />
              <span class="color-dot" :style="{ background: item.color }"></span>
              <span>{{ item.label }}</span>
            </label>
          </div>
        </div>

        <button class="clear-btn" type="button" @click="clearFilters">清空筛选</button>
      </aside>

      <section class="results">
        <div v-if="errorMessage" class="load-error">{{ errorMessage }}</div>
        <div v-if="isLoading" class="load-hint">数据加载中...</div>
        <div class="results-header">
          <div>
            <h3>检索结果</h3>
            <p>共 {{ resultCount }} 条记录</p>
          </div>
          <div class="trend">
            <div class="trend-item">
              <span>高频类型</span>
              <strong>{{ topEventType ? topEventType.label : '暂无' }}</strong>
            </div>
            <div class="trend-item">
              <span>热点地区</span>
              <strong>{{ topLocation ? topLocation.location : '暂无' }}</strong>
            </div>
          </div>
        </div>

        <div class="result-list">
          <article v-for="record in filteredRecords" :key="record.id" class="result-card">
            <div class="result-top">
              <div>
                <h4>{{ record.personName }}</h4>
                <span class="subtitle">{{ record.eventName }} · {{ record.location }}</span>
              </div>
              <div class="year">{{ record.year }}</div>
            </div>
            <p class="summary">{{ record.summary }}</p>
            <div class="tags">
              <button class="tag origin-tag" type="button" @click="openSurnameCard(record.surname)">
                {{ record.surname }}氏源流
              </button>
              <span class="tag">{{ QUERY_EVENT_TYPES.find((item) => item.key === record.eventType)?.label }}</span>
              <span v-for="word in record.keywords" :key="word" class="tag soft">{{ word }}</span>
            </div>
            <div class="source">来源：{{ record.source }}</div>
          </article>
        </div>
      </section>
    </div>
  </PageShell>
</template>

<style scoped>
.query-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
}

.filters {
  display: grid;
  gap: 16px;
  height: fit-content;
}

.filter-card {
  padding: 18px;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  display: grid;
  gap: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.filter-title {
  font-size: 15px;
  color: var(--text-strong);
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 2px solid rgba(31, 136, 167, 0.1);
}

.keyword-input {
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid rgba(31, 136, 167, 0.25);
  background: #fff;
  font-size: 13px;
  transition: all 0.2s ease;
}

.keyword-input:focus {
  outline: none;
  border-color: #1f88a7;
  box-shadow: 0 0 0 3px rgba(31, 136, 167, 0.1);
}

.keyword-input::placeholder {
  color: rgba(0, 0, 0, 0.4);
}

.hint {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(31, 136, 167, 0.25);
  background: rgba(31, 136, 167, 0.05);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip:hover {
  background: rgba(31, 136, 167, 0.1);
  border-color: rgba(31, 136, 167, 0.35);
}

.chip.active {
  background: #1f88a7;
  border-color: #1f88a7;
  color: #fff;
  font-weight: 600;
}

.checkbox-list {
  display: grid;
  gap: 10px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.15s ease;
}

.checkbox-item:hover {
  color: var(--text-strong);
}

.checkbox-item input {
  accent-color: #1f88a7;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.clear-btn {
  padding: 11px 16px;
  border-radius: 10px;
  border: 1px solid rgba(31, 136, 167, 0.3);
  background: rgba(31, 136, 167, 0.1);
  color: #1f6f93;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(31, 136, 167, 0.15);
  border-color: rgba(31, 136, 167, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(31, 136, 167, 0.15);
}

.results {
  display: grid;
  gap: 18px;
}

.load-error {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(217, 93, 57, 0.08);
  border: 1px solid rgba(217, 93, 57, 0.2);
  color: #a94a31;
  font-size: 13px;
  font-weight: 500;
}

.load-hint {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(31, 136, 167, 0.08);
  border: 1px solid rgba(31, 136, 167, 0.2);
  color: #1f6f93;
  font-size: 13px;
  font-weight: 500;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.results-header > div:first-child {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.results-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-strong);
  white-space: nowrap;
}

.results-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  white-space: nowrap;
}

.trend {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: var(--text-muted);
}

.trend-item {
  display: grid;
  gap: 6px;
  text-align: right;
}

.trend-item span {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trend-item strong {
  color: #1f88a7;
  font-size: 16px;
  font-weight: 600;
}

.result-list {
  display: grid;
  gap: 16px;
}

.result-card {
  padding: 20px;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  display: grid;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.result-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
  border-color: rgba(31, 136, 167, 0.3);
}

.result-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.result-top h4 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-strong);
}

.subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

.year {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(31, 136, 167, 0.12);
  font-size: 13px;
  font-weight: 600;
  color: #1f88a7;
  white-space: nowrap;
  flex-shrink: 0;
}

.summary {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(31, 136, 167, 0.12);
  font-size: 12px;
  font-weight: 500;
  color: #1f6f93;
}

.tag.soft {
  background: rgba(90, 114, 140, 0.12);
  color: #5a728c;
}

.origin-tag {
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.origin-tag:hover {
  background: #1f88a7;
  color: #fff;
}

.source {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
  padding-top: 4px;
  border-top: 1px solid rgba(31, 136, 167, 0.08);
}

@media (max-width: 1024px) {
  .query-layout {
    grid-template-columns: 1fr;
  }

  .filters {
    order: 1;
  }

  .results {
    order: 2;
  }

  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .results-header > div:first-child {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .trend {
    width: 100%;
    justify-content: space-between;
  }

  .trend-item {
    text-align: left;
  }
}

@media (max-width: 768px) {
  .query-layout {
    gap: 16px;
  }

  .filter-card {
    padding: 16px;
  }

  .results-header {
    padding: 16px;
  }

  .result-card {
    padding: 16px;
  }
}
</style>

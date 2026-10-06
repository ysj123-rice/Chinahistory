<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AppHeader from '@/components/layout/AppHeader.vue'
import { fetchHomeSummary } from '@/modules/home/api'
import type { HomeData } from '@/modules/home/mockData'
import ArcgisMap from '@/modules/map/components/ArcgisMap.vue'
import { useMapSourceStore } from '@/stores/mapSource'

const mapSourceStore = useMapSourceStore()
const activeSourceKey = computed(() => mapSourceStore.activeSourceKey)
const emptyHomeData: HomeData = {
  overviewStats: [],
  surnameRanking: [],
  eventTypes: [],
  regionRanking: [],
  trendSeries: [],
  trendLabel: '',
  mapHighlights: [],
  activityLevels: [],
}

const homeData = ref<HomeData>(emptyHomeData)
const isLoading = ref(false)
const errorMessage = ref('')

const numberFormatter = new Intl.NumberFormat('zh-CN')

const getMax = (values: number[]) => (values.length > 0 ? Math.max(...values) : 1)

const surnameMax = computed(() =>
  getMax(homeData.value.surnameRanking.map((item) => item.value)),
)
const regionMax = computed(() =>
  getMax(homeData.value.regionRanking.map((item) => item.value)),
)

const donutGradient = computed(() => {
  let start = 0
  if (homeData.value.eventTypes.length === 0) {
    return 'rgba(31, 136, 167, 0.12) 0% 100%'
  }
  return homeData.value.eventTypes
    .map((item) => {
      const end = start + item.value
      const segment = `${item.color} ${start}% ${end}%`
      start = end
      return segment
    })
    .join(', ')
})

const trendPoints = computed(() => {
  const values = homeData.value.trendSeries
  if (values.length < 2) {
    return ''
  }
  const maxValue = Math.max(...values)
  const minValue = Math.min(...values)
  const range = maxValue - minValue || 1
  const width = 240
  const height = 120
  const step = width / (values.length - 1)

  return values
    .map((value, index) => {
      const x = index * step
      const y = height - ((value - minValue) / range) * height
      return `${x},${y}`
    })
    .join(' ')
})

const formatNumber = (value: number) => numberFormatter.format(value)

const loadHomeData = async (sourceKey: string) => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    homeData.value = await fetchHomeSummary(sourceKey)
  } catch (error) {
    console.error('首页数据加载失败', error)
    errorMessage.value = '首页数据加载失败'
  } finally {
    isLoading.value = false
  }
}

watch(
  activeSourceKey,
  (sourceKey) => {
    void loadHomeData(sourceKey)
  },
  { immediate: true },
)
</script>

<template>
  <div class="home-page">
    <AppHeader />

    <div class="home-body">
      <div v-if="errorMessage" class="load-error">{{ errorMessage }}</div>
      <div v-if="isLoading" class="load-hint">数据加载中...</div>
      <aside class="panel left">
        <section class="card">
          <header class="card-header">
            <h2>姓氏总览</h2>
            <span>样本统计</span>
          </header>
          <div class="stat-grid">
            <div v-for="item in homeData.overviewStats" :key="item.label" class="stat-item">
              <div class="stat-value">{{ formatNumber(item.value) }}</div>
              <div class="stat-label">{{ item.label }} · {{ item.unit }}</div>
            </div>
          </div>
        </section>

        <section class="card">
          <header class="card-header">
            <h2>高频姓氏分布</h2>
            <span>Top 7</span>
          </header>
          <div class="bar-list">
            <div v-for="item in homeData.surnameRanking" :key="item.label" class="bar-row">
              <span class="bar-label">{{ item.label }}</span>
              <div class="bar-track">
                <span class="bar-fill" :style="{ width: `${(item.value / surnameMax) * 100}%` }"></span>
              </div>
              <span class="bar-value">{{ formatNumber(item.value) }}</span>
            </div>
          </div>
        </section>

        <section class="card">
          <header class="card-header">
            <h2>时间跨度</h2>
            <span>人物年代</span>
          </header>
          <div class="badge-grid">
            <div v-for="item in homeData.activityLevels" :key="item.label" class="badge">
              <strong>{{ item.label }}</strong>
              <span>{{ item.value }}</span>
            </div>
          </div>
        </section>
      </aside>

      <section class="center">
        <div class="map-frame">
          <ArcgisMap />
        </div>
        <div class="map-footer">
          <div v-for="item in homeData.mapHighlights" :key="item.label" class="highlight">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>

      <aside class="panel right">
        <section class="card">
          <header class="card-header">
            <h2>时段分布占比</h2>
            <span>朝代分段</span>
          </header>
          <div class="donut-section">
            <div class="donut" :style="{ background: `conic-gradient(${donutGradient})` }"></div>
            <div class="donut-legend">
              <div v-for="item in homeData.eventTypes" :key="item.label" class="legend-item">
                <span class="legend-dot" :style="{ background: item.color }"></span>
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}%</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <header class="card-header">
            <h2>人物活动趋势</h2>
            <span>时间序列</span>
          </header>
          <div class="line-chart">
            <svg viewBox="0 0 240 120" aria-hidden="true">
              <defs>
                <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#1f88a7" />
                  <stop offset="100%" stop-color="#2fb2c4" />
                </linearGradient>
              </defs>
              <polyline
                :points="trendPoints"
                fill="none"
                stroke="url(#trendStroke)"
                stroke-width="3"
                stroke-linecap="round"
              />
            </svg>
            <div class="line-values">
              <span>{{ homeData.trendLabel }}</span>
              <strong>{{ homeData.trendSeries[homeData.trendSeries.length - 1] ?? 0 }} 人</strong>
            </div>
          </div>
        </section>

        <section class="card">
          <header class="card-header">
            <h2>地域热度排行</h2>
            <span>Top 5</span>
          </header>
          <div class="bar-list">
            <div v-for="item in homeData.regionRanking" :key="item.label" class="bar-row">
              <span class="bar-label">{{ item.label }}</span>
              <div class="bar-track">
                <span class="bar-fill accent" :style="{ width: `${(item.value / regionMax) * 100}%` }"></span>
              </div>
              <span class="bar-value">{{ formatNumber(item.value) }}</span>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.home-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: clamp(240px, 22vw, 330px) minmax(0, 1fr) clamp(240px, 22vw, 330px);
  gap: clamp(10px, 1.2vw, 20px);
  padding: clamp(10px, 1.6vh, 24px) clamp(12px, 1.6vw, 24px);
}

.load-error {
  grid-column: 1 / -1;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(217, 93, 57, 0.08);
  border: 1px solid rgba(217, 93, 57, 0.2);
  color: #a94a31;
  font-size: 13px;
}

.load-hint {
  grid-column: 1 / -1;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(31, 136, 167, 0.08);
  border: 1px solid rgba(31, 136, 167, 0.18);
  color: #1f6f93;
  font-size: 13px;
}

.panel {
  display: grid;
  gap: clamp(8px, 1.1vh, 14px);
  min-height: 0;
}

/* 左栏：上、下卡按内容定高，条形排名卡伸缩吃满剩余高度 */
.panel.left {
  grid-template-rows: auto minmax(0, 1fr) auto;
}

/* 右栏：环形图、趋势图按内容定高，地域排行卡伸缩 */
.panel.right {
  grid-template-rows: auto auto minmax(0, 1fr);
}

.card {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: clamp(10px, 1.4vh, 16px);
  box-shadow: var(--shadow-soft);
  animation: riseIn 0.6s ease both;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: clamp(6px, 0.9vh, 12px);
}

.card-header h2 {
  margin: 0;
  font-size: clamp(13px, 1.5vh, 16px);
  font-family: var(--font-display);
}

.card-header span {
  font-size: clamp(11px, 1.2vh, 12px);
  color: var(--text-muted);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8em, 1fr));
  gap: clamp(6px, 0.9vh, 12px);
}

.stat-item {
  padding: clamp(7px, 1vh, 12px);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  border: 1px solid rgba(31, 136, 167, 0.15);
}

.stat-value {
  font-size: clamp(16px, 2.2vh, 22px);
  font-weight: 700;
  color: var(--text-strong);
}

.stat-label {
  font-size: clamp(11px, 1.2vh, 12px);
  color: var(--text-muted);
  margin-top: 0.3em;
}

.bar-list {
  display: grid;
  gap: clamp(4px, 0.8vh, 10px);
  align-content: start;
}

.bar-row {
  display: grid;
  grid-template-columns: 2.6em 1fr 4.2em;
  align-items: center;
  gap: 0.6em;
  font-size: clamp(11px, 1.2vh, 12px);
  color: var(--text-muted);
}

.bar-track {
  height: clamp(5px, 0.8vh, 8px);
  border-radius: 999px;
  background: rgba(31, 136, 167, 0.12);
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, rgba(31, 136, 167, 0.5), rgba(47, 178, 196, 0.9));
  border-radius: inherit;
}

.bar-fill.accent {
  background: linear-gradient(90deg, rgba(44, 155, 106, 0.6), rgba(91, 202, 165, 0.95));
}

.bar-label {
  color: var(--text-primary);
}

.bar-value {
  text-align: right;
  color: var(--text-primary);
}

.badge-grid {
  display: grid;
  gap: clamp(6px, 0.9vh, 10px);
}

.badge {
  padding: clamp(7px, 1vh, 12px);
  border-radius: var(--radius-md);
  background: var(--surface-3);
  border: 1px dashed rgba(31, 136, 167, 0.25);
  display: flex;
  justify-content: space-between;
  font-size: clamp(12px, 1.3vh, 13px);
}

.center {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.1vh, 14px);
  min-height: 0;
}

.map-frame {
  flex: 1;
  min-height: 0;
}

.map-footer {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5em, 1fr));
  gap: clamp(6px, 0.9vw, 12px);
}

.highlight {
  padding: clamp(7px, 1vh, 12px);
  border-radius: var(--radius-md);
  border: 1px solid var(--panel-border);
  background: var(--surface-1);
  display: grid;
  gap: 0.4em;
  font-size: clamp(11px, 1.2vh, 12px);
  color: var(--text-muted);
}

.highlight strong {
  color: var(--text-primary);
  font-size: clamp(13px, 1.4vh, 14px);
}

.donut-section {
  display: grid;
  grid-template-columns: clamp(84px, 9vw, 120px) 1fr;
  gap: clamp(10px, 1.2vw, 16px);
  align-items: center;
}

.donut {
  width: clamp(80px, 10vh, 110px);
  height: clamp(80px, 10vh, 110px);
  border-radius: 50%;
  position: relative;
}

.donut::after {
  content: '';
  position: absolute;
  inset: 16%;
  border-radius: 50%;
  background: var(--panel-bg);
  box-shadow: inset 0 0 0 1px rgba(31, 136, 167, 0.18);
}

.donut-legend {
  display: grid;
  gap: 0.6em;
  font-size: clamp(11px, 1.2vh, 12px);
  color: var(--text-muted);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.6em;
}

.legend-item strong {
  margin-left: auto;
  color: var(--text-primary);
}

.legend-dot {
  width: 0.8em;
  height: 0.8em;
  border-radius: 50%;
}

.line-chart {
  display: grid;
  gap: clamp(6px, 0.9vh, 10px);
}

.line-chart svg {
  width: 100%;
  height: clamp(72px, 13vh, 120px);
  background: var(--surface-3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(31, 136, 167, 0.18);
  padding: 0.6em;
}

.line-values {
  display: flex;
  justify-content: space-between;
  font-size: clamp(11px, 1.2vh, 12px);
  color: var(--text-muted);
}

.line-values strong {
  color: var(--text-primary);
  font-size: clamp(13px, 1.4vh, 14px);
}

@media (max-width: 1200px) {
  /* 窄屏回退为单列 + 整页可滚动，避免锁定视口高度截断内容 */
  .home-page {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .home-body {
    grid-template-columns: 1fr;
  }

  .panel {
    grid-template-rows: none;
  }

  .map-frame {
    min-height: 55vh;
  }

  .center {
    order: -1;
  }
}
</style>

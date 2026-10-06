<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

import MapView from '@arcgis/core/views/MapView'
import Map from '@arcgis/core/Map'
import WebTileLayer from '@arcgis/core/layers/WebTileLayer'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Graphic from '@arcgis/core/Graphic'
import Point from '@arcgis/core/geometry/Point'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol'

import {
  buildTiandituTileUrl,
  TIANDITU_SUBDOMAIN_LIST,
} from '@/modules/map/constants'
import { fetchSurnameOrigin, fetchSurnameRouteGroups, type SurnameOrigin, type SurnameRouteGroup } from '../api'
import { closeSurnameCard, surnameCardState } from '../store'

type MatchedPoint = { lng: number; lat: number; label: string }

const isLoading = ref(false)
const origin = ref<SurnameOrigin | null>(null)
const matchedPoints = ref<MatchedPoint[]>([])

const miniMapRef = ref<HTMLDivElement | null>(null)
let miniMapView: MapView | null = null

const fieldGroups = () => {
  const data = origin.value
  if (!data) {
    return []
  }
  return [
    { label: '得姓时代', value: data.originEra },
    { label: '衍派方式', value: data.deriveType },
    { label: '起源地', value: data.originPlace },
    { label: '郡望', value: data.junwang },
    { label: '堂号', value: data.hallNames },
    { label: '得姓始祖', value: data.firstAncestor ? `${data.firstAncestor}${data.firstAncestorTitle ? `（${data.firstAncestorTitle}）` : ''}` : '' },
    { label: '主要分布', value: data.majorDistribution },
  ].filter((item) => item.value)
}

/** 起源地与迁徙路线点做地名互包含匹配（均为真实采集地名，不做推算） */
const matchOriginPoints = (originPlace: string, groups: SurnameRouteGroup[]): MatchedPoint[] => {
  if (!originPlace) {
    return []
  }
  const normalize = (text: string) => text.replace(/\s+/g, '')
  const target = normalize(originPlace)
  const seen = new Set<string>()
  const points: MatchedPoint[] = []
  groups.forEach((group) => {
    group.points.forEach((point) => {
      const oldName = normalize(point.placeOld ?? '')
      const newName = normalize(point.placeNew ?? '')
      const hit =
        (oldName && (target.includes(oldName) || oldName.includes(target))) ||
        (newName && (target.includes(newName) || newName.includes(target)))
      if (!hit) {
        return
      }
      const key = `${point.lng},${point.lat}`
      if (seen.has(key)) {
        return
      }
      seen.add(key)
      points.push({ lng: point.lng, lat: point.lat, label: point.placeOld || point.placeNew })
    })
  })
  return points
}

const destroyMiniMap = () => {
  miniMapView?.destroy()
  miniMapView = null
}

const initMiniMap = async () => {
  destroyMiniMap()
  const tileBase = buildTiandituTileUrl('vec')
  const tileLabel = buildTiandituTileUrl('cva')
  if (!miniMapRef.value || matchedPoints.value.length === 0 || !tileBase || !tileLabel) {
    return
  }

  const graphics = matchedPoints.value.map(
    (point) =>
      new Graphic({
        geometry: new Point({ longitude: point.lng, latitude: point.lat }),
        symbol: new SimpleMarkerSymbol({
          color: [225, 106, 74],
          outline: { color: [255, 255, 255], width: 1.5 },
          size: 12,
        }),
        attributes: { label: point.label },
      }),
  )

  const layer = new GraphicsLayer({ graphics })
  const lons = matchedPoints.value.map((p) => p.lng)
  const lats = matchedPoints.value.map((p) => p.lat)
  const center: [number, number] = [
    (Math.min(...lons) + Math.max(...lons)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2,
  ]

  miniMapView = new MapView({
    container: miniMapRef.value,
    map: new Map({
      basemap: null,
      layers: [
        new WebTileLayer({ urlTemplate: tileBase, subDomains: TIANDITU_SUBDOMAIN_LIST }),
        new WebTileLayer({ urlTemplate: tileLabel, subDomains: TIANDITU_SUBDOMAIN_LIST }),
        layer,
      ],
    }),
    center,
    zoom: matchedPoints.value.length === 1 ? 7 : 5,
    ui: { components: [] },
  })

  try {
    await miniMapView.when()
  } catch {
    // 迷你地图初始化失败不阻塞卡片
  }
}

const loadCard = async (surname: string) => {
  isLoading.value = true
  origin.value = null
  matchedPoints.value = []
  destroyMiniMap()
  try {
    const [originData, groups] = await Promise.all([
      fetchSurnameOrigin(surname),
      fetchSurnameRouteGroups(surname),
    ])
    origin.value = originData
    matchedPoints.value = matchOriginPoints(originData?.originPlace ?? '', groups)
    await nextTick()
    void initMiniMap()
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [surnameCardState.open, surnameCardState.surname] as const,
  ([open, surname]) => {
    if (open && surname) {
      void loadCard(surname)
    }
    if (!open) {
      destroyMiniMap()
    }
  },
)

onBeforeUnmount(destroyMiniMap)
</script>

<template>
  <Teleport to="body">
    <Transition name="card-fade">
      <div v-if="surnameCardState.open" class="origin-overlay" @click.self="closeSurnameCard">
        <div class="origin-card" role="dialog" aria-modal="true">
          <header class="card-header">
            <div>
              <div class="card-eyebrow">SURNAME ORIGIN</div>
              <h3 class="card-title">{{ surnameCardState.surname }}氏 · 溯源卡</h3>
            </div>
            <button class="close-btn" type="button" aria-label="关闭" @click="closeSurnameCard">×</button>
          </header>

          <div class="card-body">
            <div v-if="isLoading" class="state-hint">源流数据加载中...</div>

            <template v-else-if="origin">
              <div class="field-grid">
                <div v-for="field in fieldGroups()" :key="field.label" class="field-item">
                  <span class="field-label">{{ field.label }}</span>
                  <span class="field-value">{{ field.value }}</span>
                </div>
              </div>

              <section v-if="origin.originStory" class="story-block">
                <h4>得姓由来</h4>
                <p>{{ origin.originStory }}</p>
              </section>

              <section v-if="origin.originStoryDetail" class="story-block">
                <h4>源流详考</h4>
                <p>{{ origin.originStoryDetail }}</p>
              </section>

              <section v-if="matchedPoints.length > 0" class="map-block">
                <h4>起源地落图</h4>
                <p class="map-note">
                  依据迁徙路线记载地名「{{ matchedPoints.map((p) => p.label).join('、') }}」匹配定位
                </p>
                <div ref="miniMapRef" class="mini-map"></div>
              </section>
              <p v-else class="map-note empty">起源地暂无可匹配的坐标记载，未落图</p>

              <footer v-if="origin.sourceRef || origin.sourceUrl" class="source-block">
                <span>史料来源：{{ origin.sourceRef }}</span>
                <a v-if="origin.sourceUrl" :href="origin.sourceUrl" target="_blank" rel="noopener noreferrer">
                  查看原文 ↗
                </a>
              </footer>
            </template>

            <div v-else class="state-hint">该姓氏暂无源流记载数据</div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.origin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13, 35, 48, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 1000;
}

.origin-card {
  width: min(720px, 100%);
  max-height: min(84vh, 860px);
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg, #fff);
  box-shadow: 0 24px 64px rgba(13, 35, 48, 0.25);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--panel-border);
  background: linear-gradient(135deg, rgba(31, 136, 167, 0.08), rgba(31, 136, 167, 0.02));
}

.card-eyebrow {
  font-size: 11px;
  letter-spacing: 1.5px;
  color: #1f88a7;
  font-weight: 600;
}

.card-title {
  margin: 4px 0 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-strong, #1d2c3b);
}

.close-btn {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--panel-border);
  background: #fff;
  font-size: 18px;
  line-height: 1;
  color: var(--text-muted, #5a728c);
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  color: #e1553f;
  border-color: rgba(225, 85, 63, 0.4);
}

.card-body {
  padding: 20px 24px;
  overflow-y: auto;
  display: grid;
  gap: 18px;
}

.state-hint {
  padding: 32px;
  text-align: center;
  color: var(--text-muted, #5a728c);
  font-size: 14px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.field-item {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(31, 136, 167, 0.06);
  border: 1px solid rgba(31, 136, 167, 0.12);
}

.field-label {
  font-size: 12px;
  color: var(--text-muted, #5a728c);
}

.field-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-strong, #1d2c3b);
  line-height: 1.5;
}

.story-block h4,
.map-block h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f88a7;
}

.story-block p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--text-primary, #33495c);
  text-align: justify;
}

.map-note {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--text-muted, #5a728c);
}

.map-note.empty {
  font-style: italic;
}

.mini-map {
  height: 240px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--panel-border);
}

.source-block {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(31, 136, 167, 0.12);
  font-size: 12px;
  color: var(--text-muted, #5a728c);
}

.source-block a {
  color: #1f88a7;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.source-block a:hover {
  text-decoration: underline;
}

.card-fade-enter-active,
.card-fade-leave-active {
  transition: opacity 0.2s ease;
}

.card-fade-enter-from,
.card-fade-leave-to {
  opacity: 0;
}
</style>

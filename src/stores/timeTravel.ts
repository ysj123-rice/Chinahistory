import { computed, ref, watch } from 'vue'

import { defineStore } from 'pinia'

import {
  TIMELINE_MAX_YEAR,
  TIMELINE_MIN_YEAR,
  clampYear,
  getEraAtYear,
  getEraBySourceKey,
} from '@/modules/timeline/eras'
import { useMapSourceStore } from '@/stores/mapSource'

/**
 * 时空主轴 store：连续年份是唯一事实源，朝代由年份推算。
 * - 滑块/播放 -> currentYear -> 推算朝代 -> 同步 mapSource.activeSourceKey
 * - 顶部下拉框 -> activeSourceKey -> 定位到该朝代代表年份
 * 双向同步用 syncingFromYear 标志去环，避免 year/source 互相 watch 造成回弹。
 */
export const useTimeTravelStore = defineStore('timeTravel', () => {
  const mapSourceStore = useMapSourceStore()

  const initialEra = getEraBySourceKey(mapSourceStore.activeSourceKey)
  const currentYear = ref(clampYear(initialEra?.representativeYear ?? 1080))
  const isPlaying = ref(false)

  // 本次 sourceKey 变更由年份推进引起时置位，source watcher 据此跳过回写
  let syncingFromYear = false

  const currentEra = computed(() => getEraAtYear(currentYear.value))
  const progress = computed(
    () => (currentYear.value - TIMELINE_MIN_YEAR) / (TIMELINE_MAX_YEAR - TIMELINE_MIN_YEAR),
  )
  const isAtEnd = computed(() => currentYear.value >= TIMELINE_MAX_YEAR)

  /** 滑块拖动 / 播放帧推进统一入口 */
  const seekYear = (year: number) => {
    const next = clampYear(year)
    if (next === currentYear.value) {
      return
    }
    currentYear.value = next
  }

  const togglePlay = () => {
    // 在终点再次播放：从头开始
    if (!isPlaying.value && isAtEnd.value) {
      currentYear.value = TIMELINE_MIN_YEAR
    }
    isPlaying.value = !isPlaying.value
  }

  const stopPlay = () => {
    isPlaying.value = false
  }

  // 年份 -> 朝代（边界数据源）
  watch(currentYear, (year) => {
    const era = getEraAtYear(year)
    if (era.sourceKey && mapSourceStore.activeSourceKey !== era.sourceKey) {
      syncingFromYear = true
      mapSourceStore.setActiveSource(era.sourceKey)
    }
  })

  // 朝代下拉框 -> 定位代表年份（同朝代内拖动年份不应回弹）
  watch(
    () => mapSourceStore.activeSourceKey,
    (key) => {
      if (syncingFromYear) {
        syncingFromYear = false
        return
      }
      const era = getEraBySourceKey(key)
      if (era && getEraAtYear(currentYear.value).key !== era.key) {
        currentYear.value = era.representativeYear
      }
    },
  )

  return {
    currentYear,
    isPlaying,
    currentEra,
    progress,
    isAtEnd,
    seekYear,
    togglePlay,
    stopPlay,
  }
})

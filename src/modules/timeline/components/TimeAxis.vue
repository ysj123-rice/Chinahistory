<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'

import { useTimeTravelStore } from '@/stores/timeTravel'
import {
  ERAS,
  PLAY_YEARS_PER_SECOND,
  TIMELINE_MAX_YEAR,
  TIMELINE_MIN_YEAR,
  formatEraYear,
} from '@/modules/timeline/eras'

const timeTravel = useTimeTravelStore()

// 播放引擎：单一 rAF 循环，每帧实时读取 store 中的年份——
// 播放中拖动滑块时下一帧自然从新年份继续，无需重建播放链路
let rafId = 0
let lastFrameTs = 0

const tick = (ts: number) => {
  if (!timeTravel.isPlaying) {
    rafId = 0
    lastFrameTs = 0
    return
  }
  if (!lastFrameTs) {
    lastFrameTs = ts
  }
  const dtSeconds = Math.min((ts - lastFrameTs) / 1000, 0.1)
  lastFrameTs = ts

  const next = timeTravel.currentYear + dtSeconds * PLAY_YEARS_PER_SECOND
  if (next >= TIMELINE_MAX_YEAR) {
    timeTravel.seekYear(TIMELINE_MAX_YEAR)
    timeTravel.stopPlay()
    return
  }
  timeTravel.seekYear(next)
  rafId = requestAnimationFrame(tick)
}

watch(
  () => timeTravel.isPlaying,
  (playing) => {
    if (playing) {
      lastFrameTs = 0
      rafId = requestAnimationFrame(tick)
    } else if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
      lastFrameTs = 0
    }
  },
)

onBeforeUnmount(() => {
  if (rafId) {
    cancelAnimationFrame(rafId)
  }
  timeTravel.stopPlay()
})

const totalSpan = TIMELINE_MAX_YEAR - TIMELINE_MIN_YEAR

// 朝代色带：宽度按真实纪年跨度占比（战国至唐末占比大、五代很窄）
const eraBands = ERAS.map((era) => ({
  key: era.key,
  label: era.label,
  color: era.color,
  widthPct: ((era.end - era.start + 1) / totalSpan) * 100,
  // 过窄的色段（五代等）放不下文字，只保留色块
  showLabel: (era.end - era.start + 1) / totalSpan >= 0.035,
}))

// 大朝代分界刻度
const tickYears = [-221, -206, 9, 618, 960, 1127, 1279, 1368, 1644, 1911]
const ticks = tickYears.map((year) => ({
  year,
  leftPct: ((year - TIMELINE_MIN_YEAR) / totalSpan) * 100,
  label: formatEraYear(Math.round(year)),
}))

const sliderValue = computed({
  get: () => Math.round(timeTravel.currentYear),
  set: (value) => timeTravel.seekYear(Number(value)),
})

const yearLabel = computed(() => formatEraYear(Math.round(timeTravel.currentYear)))
const eraLabel = computed(() => timeTravel.currentEra.label)
const playButtonTitle = computed(() => {
  if (timeTravel.isPlaying) {
    return '暂停时光推演'
  }
  return timeTravel.isAtEnd ? '从头播放时光推演' : '播放时光推演'
})
</script>

<template>
  <div class="timeline-dock">
    <button
      type="button"
      class="play-button"
      :title="playButtonTitle"
      @click="timeTravel.togglePlay()"
    >
      <svg v-if="!timeTravel.isPlaying" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
      </svg>
    </button>

    <div class="time-readout">
      <strong>{{ yearLabel }}</strong>
      <span>{{ eraLabel }}</span>
    </div>

    <div class="timeline-body">
      <div class="era-band">
        <div
          v-for="era in eraBands"
          :key="era.key"
          class="era-segment"
          :style="{ width: `${era.widthPct}%`, background: era.color }"
        >
          <span v-if="era.showLabel" class="era-name">{{ era.label }}</span>
        </div>
      </div>

      <input
        v-model.number="sliderValue"
        class="year-slider"
        type="range"
        :min="TIMELINE_MIN_YEAR"
        :max="TIMELINE_MAX_YEAR"
        step="1"
        :aria-label="'历史年份滑块'"
      />

      <div class="tick-row">
        <span
          v-for="tick in ticks"
          :key="tick.year"
          class="tick"
          :style="{ left: `${tick.leftPct}%` }"
        >
          {{ tick.label.replace(' 年', '').replace('前 ', '前') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-dock {
  position: absolute;
  left: clamp(12px, 2vw, 28px);
  right: clamp(12px, 2vw, 28px);
  bottom: clamp(10px, 1.6vh, 18px);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vw, 14px);
  padding: clamp(8px, 1vh, 12px) clamp(10px, 1.2vw, 16px);
  background: color-mix(in srgb, var(--panel-bg, #ffffff) 88%, transparent);
  backdrop-filter: blur(8px);
  border: 1px solid var(--panel-border, rgba(31, 136, 167, 0.18));
  border-radius: 12px;
  box-shadow: 0 6px 22px rgba(20, 45, 70, 0.16);
  pointer-events: auto;
}

.play-button {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #ffffff;
  background: linear-gradient(135deg, #1f88a7, #2fb2c4);
  box-shadow: 0 3px 10px rgba(31, 136, 167, 0.35);
  transition: transform 0.15s ease;
}

.play-button:hover {
  transform: scale(1.06);
}

.play-button svg {
  width: 20px;
  height: 20px;
}

.time-readout {
  flex: none;
  display: grid;
  justify-items: center;
  min-width: 4.6em;
  line-height: 1.25;
}

.time-readout strong {
  font-size: clamp(13px, 1.6vh, 16px);
  color: var(--text-strong, #1d2c3b);
  font-family: var(--font-display, inherit);
  white-space: nowrap;
}

.time-readout span {
  font-size: 11px;
  color: var(--text-muted, #5f7285);
}

.timeline-body {
  position: relative;
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}

.era-band {
  display: flex;
  height: 16px;
  border-radius: 5px;
  overflow: hidden;
  margin: 0 2px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.era-segment {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.era-name {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
  pointer-events: none;
}

.year-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 18px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.year-slider::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 2px;
  background: transparent;
}

.year-slider::-moz-range-track {
  height: 3px;
  background: transparent;
}

.year-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 15px;
  height: 15px;
  margin-top: -6px;
  border-radius: 50%;
  background: #ffffff;
  border: 3px solid #1f88a7;
  box-shadow: 0 2px 6px rgba(20, 45, 70, 0.35);
}

.year-slider::-moz-range-thumb {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ffffff;
  border: 3px solid #1f88a7;
  box-shadow: 0 2px 6px rgba(20, 45, 70, 0.35);
}

.tick-row {
  position: relative;
  height: 14px;
  margin: 0 2px;
}

.tick {
  position: absolute;
  transform: translateX(-50%);
  font-size: 9.5px;
  color: var(--text-muted, #5f7285);
  white-space: nowrap;
}

.tick:first-child {
  transform: translateX(0);
}

.tick:last-child {
  transform: translateX(-100%);
}

@media (max-width: 760px) {
  .tick:nth-child(odd) {
    display: none;
  }
}
</style>

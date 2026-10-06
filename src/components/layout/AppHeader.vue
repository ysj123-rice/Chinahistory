<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { ROUTE_PATHS } from '@/constants/routePaths'
import { type MapSourceKey } from '@/modules/map/dataSources'
import { useMapSourceStore } from '@/stores/mapSource'

const route = useRoute()
const mapSourceStore = useMapSourceStore()

const navItems = [
  { label: '首页', path: ROUTE_PATHS.home },
  { label: '查询', path: ROUTE_PATHS.query },
  { label: '空间分析', path: ROUTE_PATHS.analysis },
  { label: '专题制图', path: ROUTE_PATHS.thematic },
  { label: '知识图谱', path: ROUTE_PATHS.knowledge },
  { label: '姓氏演变', path: ROUTE_PATHS.evolution },
  { label: '管理数据', path: ROUTE_PATHS.data },
] as const

const activePath = computed(() => route.path)
const sourceOptions = computed(() => mapSourceStore.sources)
const isSourceReady = computed(() => sourceOptions.value.length > 0)
const activeSourceKey = computed({
  get: () => mapSourceStore.activeSourceKey,
  set: (value: MapSourceKey) => mapSourceStore.setActiveSource(value),
})
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <div class="brand-icon">
        <span class="brand-core"></span>
      </div>
      <div>
        <div class="brand-title">中华姓氏时空溯源与迁徙推演系统</div>
        <div class="brand-subtitle">SURNAME SPATIO-TEMPORAL ATLAS</div>
      </div>
    </div>

    <nav class="nav">
      <div class="source-switcher">
        <span class="switcher-label">图层切换</span>
        <select v-model="activeSourceKey" class="switcher-select" :disabled="!isSourceReady">
          <option v-for="source in sourceOptions" :key="source.key" :value="source.key">
            {{ source.label }}要素
          </option>
        </select>
      </div>
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-link"
        :class="{ active: activePath === item.path }"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 28px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(12px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: radial-gradient(circle at 30% 20%, #c5f1ff, #2fb2c4);
  display: grid;
  place-items: center;
  box-shadow: 0 10px 22px rgba(31, 136, 167, 0.25);
}

.brand-core {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: #f4fbff;
  border: 2px solid rgba(31, 136, 167, 0.45);
}

.brand-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: var(--text-strong);
}

.brand-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.6px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.source-switcher {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(0, 214, 255, 0.35);
  background: linear-gradient(120deg, rgba(12, 31, 44, 0.9), rgba(9, 25, 38, 0.7));
  box-shadow: 0 12px 24px rgba(0, 214, 255, 0.12);
}

.switcher-label {
  font-size: 12px;
  color: rgba(160, 220, 255, 0.8);
  letter-spacing: 0.4px;
}

.switcher-select {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(0, 214, 255, 0.35);
  background: rgba(7, 18, 28, 0.95);
  color: #e6f7ff;
  font-size: 12px;
}

.switcher-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-link {
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 14px;
  color: var(--text-muted);
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: var(--text-strong);
  border-color: rgba(31, 136, 167, 0.35);
  background: rgba(31, 136, 167, 0.12);
}

.nav-link.active {
  color: var(--text-strong);
  border-color: rgba(31, 136, 167, 0.45);
  background: rgba(31, 136, 167, 0.18);
}


@media (max-width: 1024px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

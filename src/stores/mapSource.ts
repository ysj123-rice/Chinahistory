import { computed, ref } from 'vue'

import { defineStore } from 'pinia'

import {
  DEFAULT_MAP_SOURCE_KEY,
  MAP_SOURCE_STORAGE_KEY,
  MAP_SOURCES,
  type MapSourceKey,
} from '@/modules/map/dataSources'

const isBrowser = typeof window !== 'undefined'

const loadStoredKey = (): MapSourceKey | null => {
  if (!isBrowser) {
    return null
  }

  try {
    const storedKey = window.localStorage.getItem(MAP_SOURCE_STORAGE_KEY)
    if (!storedKey) {
      return null
    }
    const isValid = MAP_SOURCES.some((source) => source.key === storedKey)
    return isValid ? (storedKey as MapSourceKey) : null
  } catch (error) {
    console.warn('读取图层缓存失败', error)
    return null
  }
}

const persistKey = (key: MapSourceKey) => {
  if (!isBrowser) {
    return
  }

  try {
    window.localStorage.setItem(MAP_SOURCE_STORAGE_KEY, key)
  } catch (error) {
    console.warn('写入图层缓存失败', error)
  }
}

const resolveDefaultKey = () => {
  const storedKey = loadStoredKey()
  if (storedKey) {
    return storedKey
  }

  return MAP_SOURCES[0]?.key ?? DEFAULT_MAP_SOURCE_KEY
}

export const useMapSourceStore = defineStore('mapSource', () => {
  const activeSourceKey = ref<MapSourceKey>(resolveDefaultKey())

  const sources = MAP_SOURCES
  const fallbackSource = sources[0] ?? null
  const activeSource = computed(() =>
    sources.find((source) => source.key === activeSourceKey.value) ?? fallbackSource,
  )
  const activeServiceUrl = computed(() => activeSource.value?.serviceUrl ?? '')
  const activeGeoJsonPath = computed(() => activeSource.value?.geoJsonPath ?? '')

  const setActiveSource = (key: MapSourceKey) => {
    if (!sources.some((source) => source.key === key)) {
      return
    }
    activeSourceKey.value = key
    persistKey(key)
  }

  return {
    activeSourceKey,
    sources,
    activeSource,
    activeServiceUrl,
    activeGeoJsonPath,
    setActiveSource,
  }
})

import { API_ENDPOINTS } from '@/constants/api'
import { apiGet } from '@/utils/http'
import PopupTemplate from '@arcgis/core/PopupTemplate'
// 仅类型导入：运行时用普通对象 autocast，避免额外的 ArcGIS 模块副作用影响 popup 初始化
import type ActionButton from '@arcgis/core/support/actions/ActionButton'
import type MapView from '@arcgis/core/views/MapView'

import { dispatchOpenSurnameCard } from '../surname/store'

// 后端 /api/persons/points 返回的 CBDB 真实人物籍贯点
export type RealPersonPoint = {
  id: number
  personName: string
  surname: string
  year: number
  jiguanName: string | null
  dynastyName: string | null
  sourceKey: string
  lng: number
  lat: number
}

type PointsResponse = {
  items: RealPersonPoint[]
  total: number
}

// 按 sourceKey 缓存（朝代切换时不重复请求），失败返回空数组以回退示例数据
const cache = new Map<string, Promise<RealPersonPoint[]>>()

export const fetchRealPersonPoints = (sourceKey: string): Promise<RealPersonPoint[]> => {
  if (!sourceKey) {
    return Promise.resolve([])
  }
  const cached = cache.get(sourceKey)
  if (cached) {
    return cached
  }

  const promise = apiGet<PointsResponse>(API_ENDPOINTS.personPoints, { source_key: sourceKey })
    .then((data) => data.items ?? [])
    .catch((error) => {
      console.warn('[真实人物点] 加载失败，将回退示例数据', error)
      return []
    })

  cache.set(sourceKey, promise)
  return promise
}

export const clearRealPersonPointsCache = () => cache.clear()

// 真实人物点弹窗：标题为人名，字段含姓氏/籍贯/朝代/生年
export const createPersonPopupTemplate = () =>
  new PopupTemplate({
    title: '{name}',
    content: [
      {
        type: 'fields',
        fieldInfos: [
          { fieldName: 'surname', label: '姓氏' },
          { fieldName: 'location', label: '籍贯' },
          { fieldName: 'dynasty', label: '朝代' },
          { fieldName: 'year', label: '生年' },
        ],
      },
    ],
  })

const ACTION_ID = 'surname-card'
const registeredViews = new WeakSet<object>()

/**
 * 在地图弹窗上注册"姓氏源流卡"动作按钮（官方 popup actions 机制，点击后
 * 以当前选中人物的姓氏打开溯源卡；无姓氏属性的弹窗点击不响应）。
 */
export const registerSurnameCardAction = (view: MapView) => {
  if (registeredViews.has(view)) {
    return
  }
  registeredViews.add(view)

  const popup = view.popup
  if (!popup?.actions) {
    return
  }

  const hasAction = popup.actions.some((action) => action.id === ACTION_ID)
  if (!hasAction) {
    popup.actions.add({ id: ACTION_ID, title: '姓氏源流卡' } as unknown as ActionButton)
  }

  popup.on('trigger-action', (event) => {
    if (event.action.id !== ACTION_ID) {
      return
    }
    const attributes = popup.selectedFeature?.attributes as Record<string, unknown> | undefined
    const surname = attributes?.surname
    if (typeof surname === 'string' && surname) {
      dispatchOpenSurnameCard(surname)
    }
  })
}

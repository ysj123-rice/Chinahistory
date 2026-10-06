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
  chgisSysId?: string | null
  chgisName?: string | null
  chgisBegin?: number | null
  chgisEnd?: number | null
  chgisYearMatched?: boolean | null
  coordSource?: 'cbdb' | 'chgis_rescue' | string
}

type PointsResponse = {
  items: RealPersonPoint[]
  total: number
}

/** 年份展示：公元前用"前 N 年" */
const formatYear = (year: number | null | undefined): string => {
  if (year === null || year === undefined) return '?'
  return year < 0 ? `前 ${Math.abs(year)} 年` : `${year} 年`
}

/**
 * 历史地理校验文案（弹窗用，单一归一化出口）：
 * - CBDB 坐标 + CHGIS 时代吻合：建制与生年吻合
 * - CBDB 坐标 + 时代不吻合：坐标为后世治所参考
 * - CHGIS 救援坐标：CBDB 无坐标，由 CHGIS 实体补全
 * - 无 CHGIS 记录：空串（弹窗自动省略该行）
 */
export const buildPersonGeoNote = (point: RealPersonPoint): string => {
  if (!point.chgisSysId) {
    return ''
  }
  const period =
    point.chgisBegin !== null && point.chgisBegin !== undefined &&
    point.chgisEnd !== null && point.chgisEnd !== undefined
      ? `${formatYear(point.chgisBegin)}~${formatYear(point.chgisEnd)}`
      : ''
  const entity = `${point.chgisName ?? point.jiguanName ?? '该地名'}${period ? `（${period}）` : ''}`
  if (point.coordSource === 'chgis_rescue') {
    return `CHGIS 补全坐标：${entity}（CBDB 无坐标）`
  }
  return point.chgisYearMatched === false
    ? `CHGIS 校验：${entity}，生年时该建制未见载，籍贯坐标为后世同名治所参考`
    : `CHGIS 校验：${entity}，建制存续与生年时代吻合`
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

// 真实人物点弹窗：标题为人名，字段含姓氏/籍贯/朝代/生年/历史地理校验
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
          { fieldName: 'geoNote', label: '历史地理校验' },
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

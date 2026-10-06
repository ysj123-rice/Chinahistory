import type { MapSourceKey } from '@/modules/map/dataSources'

export type LayerDefinition = {
  id: number
  label: string
  type: 'point' | 'polygon'
}

export type LayerGroupDefinition = {
  pointLayers: LayerDefinition[]
  boundaryLayers: LayerDefinition[]
  defaultPointLayerId: number
  defaultVisibleBoundaryIds: number[]
}

const DEFAULT_LAYER_GROUP_KEY: MapSourceKey = 'yuan'

export const LAYER_GROUPS: Record<MapSourceKey, LayerGroupDefinition> = {
  yuan: {
    pointLayers: [
      { id: 0, label: '县级驻点 1330', type: 'point' },
      { id: 1, label: '一级行政驻点 1330', type: 'point' },
      { id: 2, label: '二级行政驻点 1330', type: 'point' },
    ],
    boundaryLayers: [
      { id: 3, label: '一级行政区 1329', type: 'polygon' },
      { id: 4, label: '二级行政区 1329', type: 'polygon' },
      { id: 5, label: '全国边界 1290', type: 'polygon' },
    ],
    defaultPointLayerId: 0,
    defaultVisibleBoundaryIds: [5],
  },
  tang: {
    pointLayers: [
      { id: 0, label: '地名点', type: 'point' },
      { id: 1, label: '州府驻点 741', type: 'point' },
    ],
    boundaryLayers: [
      { id: 2, label: '一级行政区 741', type: 'polygon' },
      { id: 3, label: '二级行政区 741', type: 'polygon' },
      { id: 4, label: '全国边界 741', type: 'polygon' },
    ],
    defaultPointLayerId: 0,
    defaultVisibleBoundaryIds: [4],
  },
  ming: {
    pointLayers: [
      { id: 0, label: '县级驻点 1400', type: 'point' },
      { id: 1, label: '县级驻点 1450', type: 'point' },
      { id: 2, label: '县级驻点 1550', type: 'point' },
      { id: 3, label: '县级驻点 1600', type: 'point' },
      { id: 4, label: '县级驻点 1650', type: 'point' },
      { id: 5, label: '县级驻点 1700', type: 'point' },
      { id: 6, label: '州府驻点 1400', type: 'point' },
      { id: 7, label: '州府驻点 1450', type: 'point' },
      { id: 8, label: '州府驻点 1650', type: 'point' },
      { id: 9, label: '州府驻点 1700', type: 'point' },
      { id: 10, label: '郑和下西洋航线点', type: 'point' },
    ],
    boundaryLayers: [
      { id: 11, label: '一级行政区 1389', type: 'polygon' },
      { id: 12, label: '二级行政区 1500', type: 'polygon' },
      { id: 13, label: '全国边界 1433', type: 'polygon' },
    ],
    defaultPointLayerId: 0,
    defaultVisibleBoundaryIds: [13],
  },
  southernSong: {
    pointLayers: [
      { id: 0, label: '路级行政中心', type: 'point' },
      { id: 1, label: '二级行政中心', type: 'point' },
    ],
    boundaryLayers: [
      { id: 2, label: '路级行政区', type: 'polygon' },
      { id: 3, label: '府军州监行政区', type: 'polygon' },
    ],
    defaultPointLayerId: 0,
    defaultVisibleBoundaryIds: [2],
  },
  northernSong: {
    pointLayers: [
      { id: 0, label: '路级行政中心', type: 'point' },
      { id: 1, label: '二级行政中心', type: 'point' },
    ],
    boundaryLayers: [
      { id: 2, label: '路级行政区', type: 'polygon' },
      { id: 3, label: '州府军监行政区', type: 'polygon' },
    ],
    defaultPointLayerId: 0,
    defaultVisibleBoundaryIds: [2],
  },
  qing: {
    pointLayers: [{ id: 0, label: '历史人物籍贯', type: 'point' }],
    boundaryLayers: [{ id: 1, label: '全国疆域 1911', type: 'polygon' }],
    defaultPointLayerId: 0,
    defaultVisibleBoundaryIds: [1],
  },
}

export const getLayerGroup = (key: MapSourceKey) =>
  LAYER_GROUPS[key] ?? LAYER_GROUPS[DEFAULT_LAYER_GROUP_KEY]

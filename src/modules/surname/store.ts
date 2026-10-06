import { reactive } from 'vue'

/**
 * 姓氏溯源卡全局状态单例：
 * 任何位置（地图弹窗、检索页、知识图谱）都可通过 openSurnameCard 打开卡片。
 * ArcGIS Popup 内的按钮通过 window CustomEvent 桥接触发（popup 是原生 DOM，不在 Vue 上下文内）。
 */
export const surnameCardState = reactive({
  open: false,
  surname: '',
})

export const openSurnameCard = (surname: string) => {
  if (!surname) {
    return
  }
  surnameCardState.surname = surname
  surnameCardState.open = true
}

export const closeSurnameCard = () => {
  surnameCardState.open = false
}

const CARD_OPEN_EVENT = 'surname-card:open'

if (typeof window !== 'undefined') {
  window.addEventListener(CARD_OPEN_EVENT, (event) => {
    const detail = (event as CustomEvent<string>).detail
    if (typeof detail === 'string') {
      openSurnameCard(detail)
    }
  })
}

/** 供 ArcGIS PopupTemplate 内容里的原生按钮使用 */
export const dispatchOpenSurnameCard = (surname: string) => {
  window.dispatchEvent(new CustomEvent<string>(CARD_OPEN_EVENT, { detail: surname }))
}

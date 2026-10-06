import { createApp } from 'vue'
import { createPinia } from 'pinia'

import esriConfig from '@arcgis/core/config'
import '@arcgis/core/assets/esri/themes/light/main.css'

import { ARCGIS_API_KEY, ARCGIS_ASSETS_URL } from '@/modules/map/constants'
import App from './App.vue'
import router from './router'
import './styles/global.css'

if (ARCGIS_API_KEY) {
  esriConfig.apiKey = ARCGIS_API_KEY
}

if (ARCGIS_ASSETS_URL) {
  esriConfig.assetsPath = ARCGIS_ASSETS_URL
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

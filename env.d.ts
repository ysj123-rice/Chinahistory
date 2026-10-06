interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_ARCGIS_API_KEY?: string
  readonly VITE_ARCGIS_ASSETS_PATH?: string
  readonly VITE_ARCGIS_ASSETS_URL?: string
  readonly VITE_ARCGIS_BASEMAP_ID?: string
  readonly VITE_ARCGIS_SERVICE_URL?: string
  readonly VITE_ARCGIS_SERVICE_URL_YUAN?: string
  readonly VITE_ARCGIS_SERVICE_URL_TANG?: string
  readonly VITE_ARCGIS_SERVICE_URL_MING?: string
  readonly VITE_ARCGIS_SERVICE_URL_SOUTHERN_SONG?: string
  readonly VITE_ARCGIS_SERVICE_URL_NORTHERN_SONG?: string
  readonly VITE_TIANDITU_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

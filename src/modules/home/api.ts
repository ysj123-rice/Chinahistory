import { API_ENDPOINTS } from '@/constants/api'
import { apiGet } from '@/utils/http'

import type { HomeData } from './mockData'

export const fetchHomeSummary = (sourceKey: string) =>
  apiGet<HomeData>(API_ENDPOINTS.homeSummary, { source_key: sourceKey })

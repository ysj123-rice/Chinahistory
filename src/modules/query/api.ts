import { API_ENDPOINTS } from '@/constants/api'
import type { ApiListResult } from '@/types/api'
import { apiDelete, apiGet, apiPost, apiPut } from '@/utils/http'

import type { QueryRecord, QueryTimeRange } from './constants'

export type QueryRecordPayload = {
  source_key: string
  person_name: string
  surname: string
  event_name: string
  event_type: string
  location: string
  year: number
  summary: string
  keywords: string[]
  source: string
}

export const fetchQueryRecords = (sourceKey: string) =>
  apiGet<ApiListResult<QueryRecord>>(API_ENDPOINTS.queryRecords, { source_key: sourceKey })

export const fetchQueryTimeRanges = (sourceKey: string) =>
  apiGet<ApiListResult<QueryTimeRange>>(API_ENDPOINTS.queryTimeRanges, { source_key: sourceKey })

export const createQueryRecord = (payload: QueryRecordPayload) =>
  apiPost<QueryRecord>(API_ENDPOINTS.queryRecords, payload)

export const updateQueryRecord = (id: number, payload: QueryRecordPayload) =>
  apiPut<QueryRecord>(`${API_ENDPOINTS.queryRecords}/${id}`, payload)

export const deleteQueryRecord = (id: number) =>
  apiDelete<{ id: number }>(`${API_ENDPOINTS.queryRecords}/${id}`)

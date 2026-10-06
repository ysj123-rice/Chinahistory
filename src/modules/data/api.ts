import { API_ENDPOINTS } from '@/constants/api'
import type { ApiListResult } from '@/types/api'
import { apiDelete, apiGet, apiPost, apiPut } from '@/utils/http'

import type { DataRecord } from './constants'

export const fetchDataRecords = (sourceKey: string) =>
  apiGet<ApiListResult<DataRecord>>(API_ENDPOINTS.dataRecords, { source_key: sourceKey })

export type DataRecordPayload = {
  source_key: string
  name: string
  type: string
  source: string
  status: string
  update_time: string
  description: string
  owner: string
  coverage: string
  records: number
  size: string
  tags: string[]
  quality_score: number
  version: string
}

export const createDataRecord = (payload: DataRecordPayload) =>
  apiPost<DataRecord>(API_ENDPOINTS.dataRecords, payload)

export const updateDataRecord = (id: number, payload: DataRecordPayload) =>
  apiPut<DataRecord>(`${API_ENDPOINTS.dataRecords}/${id}`, payload)

export const deleteDataRecord = (id: number) =>
  apiDelete<{ id: number }>(`${API_ENDPOINTS.dataRecords}/${id}`)

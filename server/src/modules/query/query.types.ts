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

export type QueryTimeRangePayload = {
  source_key: string
  key: string
  label: string
  start_year: number
  end_year: number
}

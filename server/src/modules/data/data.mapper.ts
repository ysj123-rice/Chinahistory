import type { DataRecord } from '@prisma/client'

import { parseJsonArray } from '../../utils/validators'

export const toDataRecordDto = (record: DataRecord) => ({
  id: record.id,
  source_key: record.sourceKey,
  name: record.name,
  type: record.type,
  source: record.source,
  status: record.status,
  update_time: record.updateTime,
  description: record.description,
  owner: record.owner,
  coverage: record.coverage,
  records: record.records,
  size: record.size,
  tags: parseJsonArray(record.tags),
  quality_score: record.quality,
  version: record.version,
})

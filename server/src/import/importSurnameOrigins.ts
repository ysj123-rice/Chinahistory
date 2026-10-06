import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { prisma } from '../prisma/client'
import { readCsv, toInt } from './csv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH = path.resolve(__dirname, '../../data/import/surnames_baijiaxing_origin_14col.csv')

/** 导入姓氏源流 502 姓（文献结构化数据） */
export const importSurnameOrigins = async () => {
  const rows = await readCsv(CSV_PATH)

  const records = rows
    .map((row) => ({
      surname: row.surname?.trim() ?? '',
      originEra: row.origin_era?.trim() ?? '',
      originPlace: row.origin_place?.trim() ?? '',
      deriveType: row.derive_type?.trim() ?? '',
      originStory: row.origin_story?.trim() ?? '',
      originStoryDetail: row.origin_story_detail?.trim() ?? '',
      junwang: row.junwang?.trim() ?? '',
      firstAncestor: row.first_ancestor?.trim() || null,
      firstAncestorTitle: row.first_ancestor_title?.trim() || null,
      majorDistribution: row.major_distribution?.trim() || null,
      hallNames: row.hall_names?.trim() || null,
      sourceRef: row.source_ref?.trim() || null,
      sourceUrl: row.source_url?.trim() || null,
      confidence: toInt(row.confidence) ?? 3,
    }))
    .filter((item) => item.surname)

  await prisma.surnameOrigin.deleteMany()
  await prisma.surnameOrigin.createMany({ data: records })

  return records.length
}

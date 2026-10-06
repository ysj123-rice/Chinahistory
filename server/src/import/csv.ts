import { readFile } from 'node:fs/promises'
import { parse } from 'csv-parse/sync'

export type CsvRow = Record<string, string>

/** 读取 UTF-8（自动去 BOM）CSV，首行作为列名，返回对象数组 */
export const readCsv = async (filePath: string): Promise<CsvRow[]> => {
  const buffer = await readFile(filePath)
  return parse(buffer, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  }) as CsvRow[]
}

export const toInt = (value: string | undefined): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : null
}

export const toFloat = (value: string | undefined): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

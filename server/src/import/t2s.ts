import OpenCC from 'opencc-js'

// 繁体（台/港用字习惯）→ 简体，覆盖 CBDB 人物表的 張/籍貫/南漢 等
const converter = OpenCC.Converter({ from: 'tw', to: 'cn' })

export const t2s = (text: string | null | undefined): string => {
  if (!text) {
    return ''
  }
  return converter(String(text))
}

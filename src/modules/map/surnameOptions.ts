import { MOCK_SURNAMES, type MockSurname } from '@/modules/mock/constants'

export type SurnameOption = {
  key: string
  label: string
  modValue?: number
}

const SURNAME_KEY_MAP: Record<MockSurname, string> = {
  王: 'wang',
  张: 'zhang',
  李: 'li',
  刘: 'liu',
  陈: 'chen',
  赵: 'zhao',
  黄: 'huang',
}

export const SURNAME_MOD_BASE = MOCK_SURNAMES.length

export const SURNAME_OPTIONS: SurnameOption[] = [
  { key: 'all', label: '全部' },
  ...MOCK_SURNAMES.map((surname, index) => ({
    key: SURNAME_KEY_MAP[surname],
    label: surname,
    modValue: index,
  })),
]

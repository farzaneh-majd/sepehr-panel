import { setDefaultOptions } from "date-fns-jalali"
import { enUS as jalaliEnUS } from "date-fns-jalali/locale"
import type { Locale } from "date-fns-jalali"

export const JALALI_MONTHS = [
  "Farvardin",
  "Ordibehesht",
  "Khordad",
  "Tir",
  "Mordad",
  "Shahrivar",
  "Mehr",
  "Aban",
  "Azar",
  "Dey",
  "Bahman",
  "Esfand",
]

export const JALALI_MONTHS_SHORT = ["Far", "Ord", "Kho", "Tir", "Mor", "Sha", "Meh", "Aba", "Aza", "Dey", "Bah", "Esf"]

export const WEEK_STARTS_ON = 6 as const

export const jalaliLocale: Locale = {
  ...jalaliEnUS,
  localize: {
    ...jalaliEnUS.localize,
    month: (month: number, options?: { width?: string }) => {
      if (options?.width === "abbreviated") return JALALI_MONTHS_SHORT[month]
      if (options?.width === "narrow") return JALALI_MONTHS[month][0]
      return JALALI_MONTHS[month]
    },
  },
  options: {
    ...jalaliEnUS.options,
    weekStartsOn: WEEK_STARTS_ON,
  },
}

setDefaultOptions({ locale: jalaliLocale, weekStartsOn: WEEK_STARTS_ON })

export * from "date-fns-jalali"

export function parseServerDate(value: string): Date {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value)
  return new Date(hasZone ? value : `${value}Z`)
}

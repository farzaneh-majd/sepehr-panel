const CHAR_MAP: Record<string, string> = {
  "ي": "ی",
  "ى": "ی",
  "ك": "ک",
  "ة": "ه",
  "أ": "ا",
  "إ": "ا",
  "آ": "ا",
  "ؤ": "و",
}

export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return ""
  return value
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[يىكةأإآؤ]/g, (c) => CHAR_MAP[c] ?? c)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[‌‏‎]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function searchTokens(query: string): string[] {
  const normalized = normalizeSearchText(query)
  return normalized ? normalized.split(" ") : []
}

export function matchesTokens(haystack: string, tokens: string[]): boolean {
  for (const token of tokens) {
    if (!haystack.includes(token)) return false
  }
  return true
}

/**
 * Excel uyumluluk yardımcıları (ADR-002).
 * Excel'in `=` karşılaştırması büyük/küçük harf duyarsızdır ve Türkçe yerel ayarda çalışır.
 */

export const trUpper = (s: string): string => s.toLocaleUpperCase('tr-TR')
export const trLower = (s: string): string => s.toLocaleLowerCase('tr-TR')

/** Excel `=` eşitliği: trim + tr-TR büyük harf duyarsız. */
export function eqTR(a: unknown, b: unknown): boolean {
  return trUpper(String(a ?? '').trim()) === trUpper(String(b ?? '').trim())
}

/** Excel `=` eşitliği, trim'siz (ham). Sayılar için sayısal karşılaştırma. */
export function eqExcel(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return a === b
  if (typeof a === 'number' || typeof b === 'number') {
    const na = Number(a), nb = Number(b)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb
  }
  return trUpper(String(a ?? '')) === trUpper(String(b ?? ''))
}

export interface LookupRow { key: string; text: string; row?: number }

/** VLOOKUP(key, tablo, col, 0): ilk tam eşleşme (büyük/küçük harf duyarsız). */
export function vlookupExact<T extends LookupRow>(key: unknown, table: T[], opts: { trim?: boolean } = {}): T | undefined {
  const k = String(key ?? '')
  const norm = (s: string) => (opts.trim === false ? trUpper(s) : trUpper(s.trim()))
  const nk = norm(k)
  return table.find((r) => norm(r.key) === nk)
}

/** VLOOKUP(..., 1) yaklaşık eşleşme: anahtardan küçük/eşit en büyük değer (metin sıralaması). */
export function vlookupApprox<T extends LookupRow>(key: unknown, table: T[]): T | undefined {
  const k = trUpper(String(key ?? ''))
  let best: T | undefined
  for (const r of table) {
    if (trUpper(r.key).localeCompare(k, 'tr-TR') <= 0) best = r
    else break
  }
  return best
}

/** CONCATENATE: boşlar "" olur, sayılar Excel genel biçiminde. */
export function concatenate(...parts: unknown[]): string {
  return parts.map(excelText).join('')
}

export function excelText(v: unknown): string {
  if (v === null || v === undefined || v === false) return ''
  if (v === true) return 'TRUE'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(15)))
  return String(v)
}

const GUNLER = ['PAZAR', 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ']

/** Grş 1!D28 formülünün karşılığı: WEEKDAY → Türkçe gün adı. */
export function weekdayTR(date: string | Date | undefined | null): string {
  const d = toDate(date)
  if (!d) return ''
  return GUNLER[d.getUTCDay()]
}

/** 'YYYY-MM-DD', 'GG.AA.YYYY', ISO veya Date → UTC gece yarısı Date. */
export function toDate(v: string | Date | undefined | null): Date | null {
  if (!v) return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()))
  const s = String(v).trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(s)
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]))
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** HOUR("17:45:00") → 17. Sayısal Excel zamanı (0.74) da kabul eder. */
export function hourOf(v: unknown): number | '' {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number') return Math.floor(((v % 1) + 1) % 1 * 24)
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v).trim())
  if (m) return +m[1]
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? '' : d.getHours()
}

/** TODAY(): yerel saat dilimine göre bugünün tarihi (YYYY-MM-DD). Test için enjekte edilebilir. */
export let today: () => string = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function setToday(fn: () => string) { today = fn }

/** Tarihleri GG.AA.YYYY olarak biçimler (tr-TR). */
export function formatDateTR(v: string | Date | undefined | null): string {
  const d = toDate(v)
  if (!d) return ''
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`
}

/** Saatleri SS:DD olarak biçimler. */
export function formatTimeTR(v: unknown): string {
  if (v === null || v === undefined || v === '') return ''
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v))
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  return String(v)
}

/** Sayıları tr-TR biçiminde (ondalık virgül) yazar. */
export function formatNumberTR(v: number | '' | undefined | null, digits = 2): string {
  if (v === null || v === undefined || v === '' || Number.isNaN(v)) return ''
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: digits })
}

/** TEXT(x, "0.0") benzeri basit biçimleme. */
export function textFormat(v: number, pattern: string): string {
  const dec = (pattern.split('.')[1] ?? '').length
  return v.toFixed(dec)
}

/** `,` ve `.` ondalık ayracı kabul eden sayı ayrıştırıcı (güneş modülü yerel ayar hatasını önler). */
export function parseNumberTR(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (v === null || v === undefined) return undefined
  let s = String(v).trim().replace(/\s/g, '')
  if (!s) return undefined
  if (s.includes(',') && s.includes('.')) {
    // son ayraç ondalıktır
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (s.includes(',')) s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

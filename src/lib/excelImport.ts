/** "Excel'den içe aktar": EĞİTİM 001.xlsx benzeri bir dosyanın Giriş, Grş 1 ve kart girişlerini Dosya'ya çevirir (content/core/excel-map.json). */
import { EXCEL_MAP, CONTENT_VERSION } from '@/content'
import { newCase, normalizeCase, type CaseData } from '@/model/case'
import { setPath } from '@/engine/path'
import type { FactorEntry } from '@/engine/types'

type Sheet = Record<string, { v?: unknown; w?: string }>
const cellVal = (ws: Sheet | undefined, addr: string): unknown => { const c = ws?.[addr]; if (!c) return undefined; return c.v instanceof Date ? c.v.toISOString().slice(0, 10) : c.v }
const colShift = (col: string, by: number) => { let n = 0; for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64); n += by; let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s }

export interface ImportReport { warnings: string[]; fields: number; entries: number }

export async function importFromExcel(file: File, settingsHash: string): Promise<{ caseData: CaseData; report: ImportReport }> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  const warnings: string[] = []
  const c = newCase(CONTENT_VERSION, settingsHash) as unknown as Record<string, unknown>
  const map = EXCEL_MAP as { giris: Record<string, string>; grs1: Record<string, { path: string; kind: string }>; cards: { factorId: string; sheet: string; titleRow: number; statusRow: number }[]; sheet4EntityOffset: number }
  let fields = 0
  // Giriş
  const giris = wb.Sheets['Giriş'] as Sheet | undefined
  if (!giris) warnings.push('"Giriş" sayfası bulunamadı.')
  for (const [cell, path] of Object.entries(map.giris)) { const v = cellVal(giris, cell); if (v !== undefined && v !== '') { setPath(c, path, v); fields++ } }
  const m11 = Number(cellVal(giris, 'M11'))
  if (m11) { setPath(c, 'dosya.mahkemeNo', m11); setPath(c, 'dosya.dosyaTuru', ({ 1: 'ceza', 2: 'hukuk', 3: 'savcilik', 4: 'icra' } as Record<number, string>)[m11] ?? 'ceza'); warnings.push(`Giriş!M11=${m11} hem mahkeme no hem dosya türü olarak alındı (tutarsızlık #4); dosya türünü kontrol edin.`) }
  // Grş 1
  const g = wb.Sheets['Grş 1'] as Sheet | undefined
  if (!g) warnings.push('"Grş 1" sayfası bulunamadı.')
  for (const [row, spec] of Object.entries(map.grs1)) {
    if (spec.kind === 'derived') continue
    const cols = spec.kind === 'scalar' ? ['D'] : ['D', 'E', 'F']
    cols.forEach((col, i) => { const v = cellVal(g, `${col}${row}`); if (v !== undefined && v !== '') { setPath(c, spec.path.replace('[]', `[${i}]`), typeof v === 'string' ? v : v), fields++ } })
  }
  const cd = c as unknown as CaseData
  for (const k of ['araclar', 'suruculer', 'yayalar', 'yolcular'] as const) cd[k] = (cd[k] ?? []).filter((e) => e && Object.keys(e).length > 0)
  if (cd.kazaYeri.tarih) cd.kazaYeri.tarih = String(cd.kazaYeri.tarih).slice(0, 10)
  if (typeof cd.kazaYeri.saat === "object" || /T\d\d:/.test(String(cd.kazaYeri.saat))) { const d = new Date(String(cd.kazaYeri.saat)); cd.kazaYeri.saat = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` }
  // Kartlar
  const entries: FactorEntry[] = []
  const readCard = (ws: Sheet, sr: number, off: number, factorId: string, entityIndex: number | null) => {
    const E = colShift('E', off), B = colShift('B', off)
    const e: FactorEntry = { factorId, entityIndex, incelemeDurumu: String(cellVal(ws, `${E}${sr}`) ?? ''), muteala: '', tespit: { yontemler: [], puanlar: [] } }
    const val = cellVal(ws, `${E}${sr - 1}`)
    if (val !== undefined) e.selectedValue = val as string
    for (let r = sr + 1; r <= sr + 9; r++) {
      const label = String(cellVal(ws, `${B}${r}`) ?? '').trim()
      if (label === 'Müteala') e.muteala = String(cellVal(ws, `${E}${r}`) ?? '')
      else if (label === 'Tespit Yöntemi') e.tespit = { yontemler: ['E', 'H', 'K'].map((col) => String(cellVal(ws, `${colShift(col, off)}${r}`) ?? '').trim()).filter(Boolean), delilKodu: (cellVal(ws, `${colShift('P', off)}${r}`) as string) ?? null, puanlar: ['Q', 'R', 'S', 'T'].map((col) => { const v = cellVal(ws, `${colShift(col, off)}${r}`); return v === undefined ? null : Number(v) }), dogrulama: (cellVal(ws, `${colShift('X', off)}${r}`) as string) ?? null }
      else if (label === 'Sorumlu Tespiti') { e.sorumlu = (cellVal(ws, `${E}${r}`) as string) ?? null; e.hakimSavciTespit = (cellVal(ws, `${colShift('S', off)}${r}`) as string) ?? null; break }
      else if (label === 'İnceleme Durumu') break
    }
    if (e.incelemeDurumu || e.muteala || e.sorumlu) entries.push(e)
  }
  for (const card of map.cards) {
    const ws = wb.Sheets[card.sheet] as Sheet | undefined
    if (!ws) { warnings.push(`"${card.sheet}" sayfası yok.`); continue }
    readCard(ws, card.statusRow, 0, card.factorId, card.sheet === '3' ? null : 0)
    if (card.sheet === '4' && (cd.araclar.length > 1)) readCard(ws, card.statusRow, map.sheet4EntityOffset, card.factorId, 1)
  }
  cd.factorEntries = entries
  cd.title = `Excel içe aktarma: ${file.name}`
  if (wb.Sheets['4']) warnings.push('Sayfa 4 Araç 2 sütunu Excel\'de kırık referans içerir; Araç 2 kart girişleri (E/S) alındı, değerler Grş 1\'den gelir.')
  return { caseData: normalizeCase(cd), report: { warnings, fields, entries: entries.length } }
}

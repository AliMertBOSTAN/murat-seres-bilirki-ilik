/** Paketle gelen içerik (Faz 0 çıkarımı). Ayarlar katmanı bunun üstüne biner. */
import factorsIndex from '@content/core/factors/index.json'
import yerZaman from '@content/core/factors/yer-zaman.json'
import yolCevre from '@content/core/factors/yol-cevre.json'
import arac from '@content/core/factors/arac.json'
import dorse from '@content/core/factors/dorse.json'
import surucu from '@content/core/factors/surucu.json'
import yolcu from '@content/core/factors/yolcu.json'
import yaya from '@content/core/factors/yaya.json'
import iz from '@content/core/factors/iz.json'
import oluYarali from '@content/core/factors/olu-yarali.json'
import kazaNedeni from '@content/core/factors/kaza-nedeni.json'
import sections from '@content/core/factors/sections.json'
import statusProfiles from '@content/core/rules/status-profiles.json'
import constants from '@content/core/rules/constants.json'
import lists from '@content/core/lists/index.json'
import evidenceCodes from '@content/core/evidence-codes.json'
import legalTexts from '@content/core/legal-texts.json'
import reportMeta from '@content/core/report-meta.json'
import partyLabels from '@content/core/party-labels.json'
import excelMap from '@content/core/excel-map.json'
import sampleCase from '@content/core/sample-case.json'
import istatistikMetinleri from '@content/core/knowledge/istatistik-metinleri.json'
import type { FactorDef, StatusProfile } from '@/engine/types'

const groupFiles: Record<string, { factors: unknown[] }> = {
  'yer-zaman': yerZaman as never, 'yol-cevre': yolCevre as never, arac: arac as never, dorse: dorse as never, surucu: surucu as never,
  yolcu: yolcu as never, yaya: yaya as never, iz: iz as never, 'olu-yarali': oluYarali as never, 'kaza-nedeni': kazaNedeni as never,
}

export const GROUP_ORDER = factorsIndex.groups.map((g) => g.group)
export const GROUP_TITLES: Record<string, string> = factorsIndex.groupTitles as Record<string, string>
export const SECTION_TITLES: Record<string, string> = (sections as { sections: Record<string, string> }).sections

export const ALL_FACTORS: FactorDef[] = GROUP_ORDER.flatMap((g) => (groupFiles[g]?.factors ?? []) as FactorDef[])
export const FACTOR_BY_ID: Map<string, FactorDef> = new Map(ALL_FACTORS.map((f) => [f.id, f]))
export const FACTORS_BY_GROUP: Record<string, FactorDef[]> = Object.fromEntries(GROUP_ORDER.map((g) => [g, (groupFiles[g]?.factors ?? []) as FactorDef[]]))

export const STATUS_PROFILES: StatusProfile[] = [...(statusProfiles.profiles as StatusProfile[]), statusProfiles.merged as unknown as StatusProfile]
export const STATUS_PROFILE_BY_ID: Map<string, StatusProfile> = new Map(STATUS_PROFILES.map((p) => [p.id, p]))
export const STATUS_INPUTS: string[] = statusProfiles.inputs

export const CONSTANTS = constants
export const LISTS = lists.lists as Record<string, { id: string; source: string; items: (string | number)[]; usedBy: { sheet: string; cells: string }[]; named?: boolean }>
export const LIST_USAGE = lists.usage as { sheet: string; cells: string; listId: string }[]
export const EVIDENCE_CODES = evidenceCodes
export const LEGAL_TEXTS = legalTexts
export const REPORT_META = reportMeta
export const PARTY_LABELS = partyLabels
export const EXCEL_MAP = excelMap
export const SAMPLE_CASE = sampleCase
export const ISTATISTIK_METINLERI = istatistikMetinleri
export const CONTENT_VERSION: string = factorsIndex.version

/** Bir hücre için (ör. "Grş 1", "D43") liste kimliği bulur. */
export function listIdForCell(sheet: string, cell: string): string | undefined {
  const col = cell.replace(/\d+/g, '')
  const row = +cell.replace(/\D+/g, '')
  for (const u of LIST_USAGE) {
    if (u.sheet !== sheet) continue
    for (const ref of u.cells.split(' ')) {
      const [a, b] = ref.split(':')
      const ac = a.replace(/\d+/g, ''), ar = +a.replace(/\D+/g, '')
      if (!b) { if (ac === col && ar === row) return u.listId; continue }
      const bc = b.replace(/\d+/g, ''), br = +b.replace(/\D+/g, '')
      if (col.length === ac.length && col >= ac && col <= bc && row >= ar && row <= br) return u.listId
      if (col.length !== ac.length && colIndex(col) >= colIndex(ac) && colIndex(col) <= colIndex(bc) && row >= ar && row <= br) return u.listId
    }
  }
  return undefined
}

function colIndex(c: string): number { let n = 0; for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64); return n }

export function listItems(listId: string | undefined): string[] {
  if (!listId) return []
  return (LISTS[listId]?.items ?? []).map(String)
}

const libraryFiles = import.meta.glob('../../content/core/factors/library-rows/*.json') as Record<string, () => Promise<{ default: Record<string, { row: number; cells: Record<string, unknown> }[]> }>>
/** Bir etkenin kütüphane satırlarını (ham Excel bloğu) gerektiğinde yükler. */
export async function loadLibraryRows(factor: FactorDef): Promise<{ row: number; cells: Record<string, unknown> }[]> {
  const path = Object.keys(libraryFiles).find((p) => p.endsWith(`/${factor.group}.json`))
  if (!path) return []
  const m = await libraryFiles[path]()
  return m.default[factor.id] ?? []
}

/* ───────────── Ayar katmanıyla birleşen saf yardımcılar ───────────── */

/** Delil kodu — paket + ayar katmanının birleşimi. */
export interface EvidenceCode { kod: string; ad: string; not: string; grup: string; kaynak: 'paket' | 'eklendi' | 'düzenlendi' }
type EvidenceOverridesLike = { added: { kod: string; ad: string; not?: string; grup?: string }[]; edited: Record<string, { ad?: string; not?: string; grup?: string }>; removed: string[] }

/** "ÇEV-02" → "ÇEV", "ZMN-KYN-02" → "ZMN-KYN" (son parça sayı ise atılır). */
export function evidenceGroupOf(kod: string): string {
  const parts = kod.split('-')
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) return parts.slice(0, -1).join('-')
  return parts.length > 1 ? parts[0] : ''
}

/** Paketten gelen delil kodları (tekilleştirilmiş; ad eşlemesi mapping'den). */
export function packageEvidenceCodes(): EvidenceCode[] {
  const ec = evidenceCodes as { codes: { kod: string; sira: number | null; not: string }[]; mapping: { eskiKod: string; turkceKod: string; ad: string }[] }
  const seen = new Set<string>()
  const out: EvidenceCode[] = []
  for (const c of ec.codes) {
    const kod = String(c.kod ?? '').trim()
    if (!kod || seen.has(kod)) continue
    seen.add(kod)
    out.push({ kod, ad: ec.mapping.find((m) => m.turkceKod === kod)?.ad ?? '', not: c.not ?? '', grup: evidenceGroupOf(kod), kaynak: 'paket' })
  }
  return out
}

/** Paket kodları + ayar katmanı (eklenen / düzenlenen / gizlenen). Gizlenenler hariç, kod benzersiz. */
export function effectiveEvidenceCodes(settings: { evidenceOverrides?: EvidenceOverridesLike }): EvidenceCode[] {
  const ov: EvidenceOverridesLike = settings.evidenceOverrides ?? { added: [], edited: {}, removed: [] }
  const removed = new Set(ov.removed)
  const out: EvidenceCode[] = []
  for (const c of packageEvidenceCodes()) {
    if (removed.has(c.kod)) continue
    const e = ov.edited[c.kod]
    out.push(e ? { ...c, ad: e.ad ?? c.ad, not: e.not ?? c.not, grup: e.grup ?? c.grup, kaynak: 'düzenlendi' } : c)
  }
  const seen = new Set(out.map((c) => c.kod))
  for (const a of ov.added) {
    const kod = String(a.kod ?? '').trim()
    if (!kod || seen.has(kod) || removed.has(kod)) continue
    seen.add(kod)
    out.push({ kod, ad: a.ad ?? '', not: a.not ?? '', grup: a.grup ?? evidenceGroupOf(kod), kaynak: 'eklendi' })
  }
  return out
}

type ProfileOverrideLike = { mapping?: Record<string, string>; else?: string; copiedFrom?: string }

/** Paket profilleri + ayar katmanı. Override mapping'inde 'FALSE' değeri anahtarı siler (⚠ tanımsız). Yeni (kopya) profiller de eklenir. */
export function effectiveProfileList(settings: { profileOverrides?: Record<string, ProfileOverrideLike> }): StatusProfile[] {
  const ov = settings.profileOverrides ?? {}
  const apply = (base: StatusProfile, o: ProfileOverrideLike | undefined): StatusProfile => {
    if (!o) return base
    const mapping: Record<string, string> = { ...base.mapping, ...(o.mapping ?? {}) }
    for (const k of Object.keys(mapping)) if (mapping[k] === 'FALSE') delete mapping[k]
    return { ...base, mapping, else: o.else ?? base.else }
  }
  const out = STATUS_PROFILES.map((p) => apply(p, ov[p.id]))
  for (const [id, o] of Object.entries(ov)) {
    if (STATUS_PROFILE_BY_ID.has(id)) continue
    const src = o.copiedFrom ? STATUS_PROFILE_BY_ID.get(o.copiedFrom) : undefined
    out.push(apply({ id, mapping: src?.mapping ?? {}, else: src?.else ?? 'FALSE', sheets: [] }, o))
  }
  return out
}

export function effectiveProfiles(settings: { profileOverrides?: Record<string, ProfileOverrideLike> }): Map<string, StatusProfile> {
  return new Map(effectiveProfileList(settings).map((p) => [p.id, p]))
}

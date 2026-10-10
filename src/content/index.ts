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
import colors from '@content/core/rules/colors.json'
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
export const COLORS = colors
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

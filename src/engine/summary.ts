import type { FactorDef, FactorResult } from './types'
import { countsForSummary } from './status'

export interface SummaryRow { factorId: string; title: string; durum: string; muteala: string; group: string; entityIndex: number | null }

/** sonuç1 karşılığı: ETKEN ve İNCELENMELİ kartları toplar. `groups` ile kapsam sınırlanır (Excel uyumlu: yalnız yol-cevre). */
export function buildSummary(results: { def: FactorDef; result: FactorResult; muteala: string }[], groups?: string[]): { count: number; rows: SummaryRow[] } {
  const rows: SummaryRow[] = []
  for (const r of results) {
    if (groups && !groups.includes(r.def.group)) continue
    if (!countsForSummary(r.result.durum)) continue
    rows.push({ factorId: r.def.id, title: r.def.title, durum: r.result.durum, muteala: r.muteala, group: r.def.group, entityIndex: r.result.entityIndex })
  }
  return { count: rows.length, rows }
}

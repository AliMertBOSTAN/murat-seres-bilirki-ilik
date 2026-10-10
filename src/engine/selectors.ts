import { useMemo } from 'react'
import { ALL_FACTORS, GROUP_ORDER, CONTENT_VERSION, effectiveProfiles } from '@/content'
import type { CaseData } from '@/model/case'
import { ENTITY_KIND_BY_FACTOR } from '@/model/case'
import type { FactorDef, FactorEntry, FactorResult } from './types'
import { evaluateFactor } from './factor'
import { findEntry, useCaseStore } from '@/store/caseStore'
import { useSettingsStore, type Settings } from '@/store/settingsStore'
import { buildSummary } from './summary'

export const keyOf = (factorId: string, idx: number | null | undefined) => `${factorId}#${idx ?? 0}`

export interface EvaluatedCard { def: FactorDef; entityIndex: number | null; entry: FactorEntry | undefined; result: FactorResult }

/** Paket içindeki grup içi sıra (1'den başlar); `order` verilmemişse bu kullanılır. */
export const PACKAGE_ORDER: Map<string, number> = (() => {
  const m = new Map<string, number>()
  const counters: Record<string, number> = {}
  for (const f of ALL_FACTORS) { counters[f.group] = (counters[f.group] ?? 0) + 1; m.set(f.id, counters[f.group]) }
  return m
})()

/** Ayarlardaki içerik geçersiz kılmalarını uygular; grup sırası GROUP_ORDER, grup içi sıra `order` (yoksa paket sırası). */
export function effectiveFactors(settings: Settings): FactorDef[] {
  const ov = settings.contentOverrides
  const list = ALL_FACTORS.map((f, i) => ({ def: (ov[f.id] ? ({ ...f, ...ov[f.id] } as FactorDef) : f), i }))
  const gi = (g: string) => { const k = GROUP_ORDER.indexOf(g); return k < 0 ? GROUP_ORDER.length : k }
  const ord = (d: FactorDef) => (typeof d.order === 'number' && Number.isFinite(d.order) ? d.order : (PACKAGE_ORDER.get(d.id) ?? 0))
  return list.sort((a, b) => gi(a.def.group) - gi(b.def.group) || ord(a.def) - ord(b.def) || a.i - b.i).map((x) => x.def)
}

export function evaluateAll(caseData: CaseData, settings: Settings): Map<string, EvaluatedCard> {
  const out = new Map<string, EvaluatedCard>()
  const ctx = { caseData: caseData as unknown as Record<string, unknown>, profiles: effectiveProfiles(settings), settings: settings.engine, contentVersion: CONTENT_VERSION }
  for (const def of effectiveFactors(settings)) {
    if (def.draft && !settings.showDrafts && !def.showInReport) continue
    const kind = def.perEntity ? ENTITY_KIND_BY_FACTOR[def.perEntity] : null
    const count = kind ? Math.max(1, caseData[kind]?.length ?? 0) : 1
    for (let i = 0; i < count; i++) {
      const idx = kind ? i : null
      const entry = findEntry(caseData.factorEntries, def.id, idx)
      out.set(keyOf(def.id, idx), { def, entityIndex: idx, entry, result: evaluateFactor(def, entry, ctx) })
    }
  }
  return out
}

export function useAllResults(): Map<string, EvaluatedCard> {
  const caseData = useCaseStore((s) => s.caseData)
  const settings = useSettingsStore((s) => s.settings)
  return useMemo(() => evaluateAll(caseData, settings), [caseData, settings])
}

export function useSummary() {
  const all = useAllResults()
  const settings = useSettingsStore((s) => s.settings)
  return useMemo(() => {
    const items = [...all.values()].map((c) => ({ def: c.def, result: c.result, muteala: String(c.entry?.muteala ?? '') }))
    const groups = settings.summaryScope === 'excel' ? ['yol-cevre'] : undefined
    const s = buildSummary(items, groups)
    const etken = s.rows.filter((r) => r.durum === 'ETKEN').length
    const incelenmeli = s.rows.filter((r) => r.durum === 'İNCELENMELİ').length
    const ozel = items.filter((i) => i.result.durum === 'ÖZEL İSTEMLİ' || i.result.durum === 'İNCELEMELİ').length
    const tanimsiz = items.filter((i) => !i.result.durumDefined).length
    return { ...s, etken, incelenmeli, ozel, tanimsiz, total: items.length }
  }, [all, settings.summaryScope])
}

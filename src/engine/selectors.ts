import { useMemo } from 'react'
import { ALL_FACTORS, STATUS_PROFILE_BY_ID, CONTENT_VERSION } from '@/content'
import type { CaseData } from '@/model/case'
import { ENTITY_KIND_BY_FACTOR } from '@/model/case'
import type { FactorDef, FactorEntry, FactorResult } from './types'
import { evaluateFactor } from './factor'
import { findEntry, useCaseStore } from '@/store/caseStore'
import { useSettingsStore, type Settings } from '@/store/settingsStore'
import { buildSummary } from './summary'

export const keyOf = (factorId: string, idx: number | null | undefined) => `${factorId}#${idx ?? 0}`

export interface EvaluatedCard { def: FactorDef; entityIndex: number | null; entry: FactorEntry | undefined; result: FactorResult }

/** Ayarlardaki içerik geçersiz kılmalarını uygular. */
export function effectiveFactors(settings: Settings): FactorDef[] {
  const ov = settings.contentOverrides
  return ALL_FACTORS.map((f) => (ov[f.id] ? ({ ...f, ...ov[f.id] } as FactorDef) : f))
}

export function evaluateAll(caseData: CaseData, settings: Settings): Map<string, EvaluatedCard> {
  const out = new Map<string, EvaluatedCard>()
  const ctx = { caseData: caseData as unknown as Record<string, unknown>, profiles: STATUS_PROFILE_BY_ID, settings: settings.engine, contentVersion: CONTENT_VERSION }
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

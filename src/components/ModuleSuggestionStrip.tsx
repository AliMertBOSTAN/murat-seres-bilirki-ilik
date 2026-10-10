import { useMemo } from 'react'
import type { FactorDef, FactorEntry, FactorResult } from '@/engine/types'
import { MODULE_DEFS } from '@/modules/registry'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { StatusChip } from '@/ui/StatusChip'

export function ModuleSuggestionStrip({ def, entityIndex, result, entry }: { def: FactorDef; entityIndex: number | null; result: FactorResult; entry: FactorEntry | undefined }) {
  const caseData = useCaseStore((s) => s.caseData)
  const updateEntry = useCaseStore((s) => s.updateEntry)
  const settings = useSettingsStore((s) => s.settings)
  const suggestions = useMemo(() => MODULE_DEFS
    .filter((m) => settings.enabledModules.includes(m.manifest.id) && m.suggest && m.manifest.hooks?.some((h) => h.targetFactorId === def.id))
    .map((m) => m.suggest!({ caseData, settings, def, entityIndex, result }))
    .filter((s): s is NonNullable<typeof s> => !!s), [caseData, settings, def, entityIndex, result])
  if (suggestions.length === 0) return null
  return (
    <div className="space-y-2">
      {suggestions.map((s) => {
        const applied = entry?.moduleSuggestions?.find((x) => x.moduleId === s.moduleId)
        return (
          <div key={s.moduleId} className="rounded-lg border border-camgobegi/40 bg-camgobegi-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-lacivert">☀ {s.title} <span className="font-normal text-gri">v{s.moduleVersion}</span></span>
              {s.incelemeDurumu && <span className="flex items-center gap-1 text-[11px]">Öneri: <StatusChip value={s.incelemeDurumu} size="sm" /></span>}
            </div>
            <p className="mt-1 text-xs text-murekkep">{s.summary}</p>
            <dl className="mt-1 grid grid-cols-2 gap-x-3 text-[11px] sm:grid-cols-4">{s.details.map((d) => <div key={d.label}><dt className="text-gri">{d.label}</dt><dd className="font-semibold">{d.value}</dd></div>)}</dl>
            <div className="mt-2 flex items-center gap-2">
              {applied ? <span className="text-[11px] text-green-700">✓ Uygulandı ({new Date(applied.appliedAt ?? '').toLocaleString('tr-TR')}) — Kaynak: {s.title} v{s.moduleVersion}</span> : (
                <button className="btn-primary !py-1 text-xs" onClick={() => updateEntry(def.id, entityIndex, {
                  incelemeDurumu: s.incelemeDurumu ?? entry?.incelemeDurumu,
                  muteala: [entry?.muteala, s.muteala].filter(Boolean).join('\n'),
                  moduleSuggestions: [...(entry?.moduleSuggestions ?? []), { moduleId: s.moduleId, version: s.moduleVersion, appliedAt: new Date().toISOString(), incelemeDurumu: s.incelemeDurumu, note: s.summary }],
                })}>Uygula</button>
              )}
              <span className="text-[10px] text-gri">Bilirkişi onayı olmadan karta yazılmaz.</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

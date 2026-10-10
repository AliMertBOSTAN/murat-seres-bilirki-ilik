import type { FactorDef, FactorResult } from '@/engine/types'
import { StatusChip } from '@/ui/StatusChip'
import { STATUS_PROFILE_BY_ID } from '@/content'
import { useSettingsStore } from '@/store/settingsStore'

export function ProvenancePanel({ def, result }: { def: FactorDef; result: FactorResult }) {
  const settings = useSettingsStore((s) => s.settings)
  const profile = STATUS_PROFILE_BY_ID.get(settings.engine.statusProfileOverride ?? def.statusProfile)
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg bg-lacivert p-4 text-white">
        <div className="etiket !text-white/60">İspat zinciri</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span>Girdi <b>{result.valueText || '(boş)'}</b></span><span>→</span>
          <span>İnceleme Durumu <b>{result.incelemeDurumu || '(boş)'}</b></span><span>→</span>
          <span>Kural <b>{profile?.id}</b></span><span>⇒</span>
          <StatusChip value={result.durum} defined={result.durumDefined} />
        </div>
      </div>
      <ol className="space-y-2">
        {result.provenance.map((p, i) => (
          <li key={i} className="grid grid-cols-[1.6rem_1fr] gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-camgobegi-100 text-[11px] font-semibold text-lacivert">{i + 1}</span>
            <div>
              <div className="font-medium text-lacivert">{p.step}</div>
              <div className="text-gri">{p.detail}</div>
              {p.source && <div className="font-mono text-[11px] text-camgobegi">Excel: {p.source}</div>}
            </div>
          </li>
        ))}
      </ol>
      {profile && (
        <div>
          <div className="etiket mb-1">Durum kural tablosu — {profile.id}</div>
          <table className="w-full text-xs">
            <tbody>
              {Object.entries(profile.mapping).map(([k, v]) => (
                <tr key={k} className={k === (result.incelemeDurumu || '') || (k && result.incelemeDurumu && k.toLocaleUpperCase('tr-TR') === result.incelemeDurumu.toLocaleUpperCase('tr-TR')) ? 'bg-altin-100' : ''}>
                  <td className="border-b border-krem-200 py-1 pr-3">{k || '(boş)'}</td><td className="border-b border-krem-200 py-1"><StatusChip value={v} size="sm" /></td>
                </tr>
              ))}
              <tr><td className="py-1 pr-3 text-gri">diğer</td><td className="py-1 text-gri">{profile.else === 'FALSE' ? '⚠ tanımsız (Excel FALSE)' : profile.else || '""'}</td></tr>
            </tbody>
          </table>
          {profile.excelFormula && <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-krem p-2 font-mono text-[10px] text-gri">={profile.excelFormula}</pre>}
        </div>
      )}
      {def.kazadaDurumu.formula && <div><div className="etiket mb-1">Kazada durumu formülü</div><pre className="whitespace-pre-wrap break-all rounded bg-krem p-2 font-mono text-[10px] text-gri">={def.kazadaDurumu.formula}</pre></div>}
    </div>
  )
}

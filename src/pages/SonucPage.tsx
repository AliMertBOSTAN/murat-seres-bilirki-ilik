import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAllResults, useSummary } from '@/engine/selectors'
import { useSettingsStore } from '@/store/settingsStore'
import { GROUP_TITLES } from '@/content'
import { PageHeader, Segmented, Toggle } from '@/ui/primitives'
import { StatusChip } from '@/ui/StatusChip'
import { ENTITY_KIND_BY_FACTOR } from '@/model/case'

const ROUTE: Record<string, string> = { 'yol-cevre': '/analiz/yol-cevre', arac: '/analiz/arac', surucu: '/analiz/surucu', yolcu: '/analiz/yolcu', yaya: '/analiz/yaya' }

export function SonucPage() {
  const summary = useSummary()
  const all = useAllResults()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const [filter, setFilter] = useState<'hepsi' | 'ETKEN' | 'İNCELENMELİ' | 'ÖZEL İSTEMLİ'>('hepsi')
  const [showAll, setShowAll] = useState(false)
  const rows = showAll
    ? [...all.values()].filter((k) => k.result.durum).map((k) => ({ factorId: k.def.id, title: k.def.title, durum: k.result.durum, muteala: String(k.entry?.muteala ?? ''), group: k.def.group, entityIndex: k.entityIndex }))
    : summary.rows
  const shown = rows.filter((r) => filter === 'hepsi' || r.durum === filter)
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader sheet="sonuç1" title="Sonuç Özeti" subtitle="Excel'de FILTER formülü yalnız sayfa 3'ü özetliyordu. Burada kapsam seçilebilir; Excel uyumlu görünümde yalnız Yol ve Çevre." next={{ to: '/analiz/arac/1', label: '4. Araç' }}
        actions={<>
          <Segmented options={['excel', 'all'] as const} value={settings.summaryScope} onChange={(v) => v && update({ summaryScope: v })} labels={{ excel: 'Excel uyumlu (sayfa 3)', all: 'Tüm gruplar' }} />
          <Toggle checked={showAll} onChange={setShowAll} label={<span className="text-xs">Tüm durumları göster</span>} />
        </>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="ETKEN" value={summary.etken} color="#FF0000" />
        <Stat label="İNCELENMELİ" value={summary.incelenmeli} color="#00B0F0" />
        <Stat label="Toplam (sonuç1!A1)" value={summary.count} color="#0E2A47" />
        <Stat label="Özel istemli / tanımsız" value={summary.ozel + summary.tanimsiz} color="#8497B0" />
      </div>
      <div className="seg mb-3">{(['hepsi', 'ETKEN', 'İNCELENMELİ', 'ÖZEL İSTEMLİ'] as const).map((f) => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div>
      <div className="kart overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-krem text-left text-xs uppercase tracking-wider text-gri"><tr><th className="px-4 py-2">Grup</th><th className="px-4 py-2">Kart</th><th className="px-4 py-2">Durum</th><th className="px-4 py-2">Müteala</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={`${r.factorId}-${r.entityIndex ?? 0}`} className="border-t border-krem-200 hover:bg-krem/50">
                <td className="px-4 py-2 text-xs text-gri">{GROUP_TITLES[r.group] ?? r.group}</td>
                <td className="px-4 py-2"><Link className="text-lacivert hover:underline" to={`${ROUTE[r.group] ?? '/analiz/grup/' + r.group}${ENTITY_KIND_BY_FACTOR[r.group] ? `/${(r.entityIndex ?? 0) + 1}` : ''}#kart-${r.factorId}-${r.entityIndex ?? 0}`}>{r.title}</Link>{r.entityIndex !== null && r.entityIndex !== undefined && <span className="ml-1 text-xs text-gri">#{r.entityIndex + 1}</span>}</td>
                <td className="px-4 py-2"><StatusChip value={r.durum} size="sm" /></td>
                <td className="px-4 py-2 text-xs text-gri">{r.muteala || '—'}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gri">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="kart flex items-center gap-3 p-4"><span className="h-10 w-1.5 rounded-full" style={{ background: color }} /><div><div className="etiket">{label}</div><div className="font-display text-3xl font-semibold text-lacivert">{value}</div></div></div>
}

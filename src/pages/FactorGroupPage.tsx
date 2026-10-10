import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FACTORS_BY_GROUP, GROUP_TITLES } from '@/content'
import { useAllResults, keyOf } from '@/engine/selectors'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { FactorCard } from '@/components/FactorCard'
import { PageHeader, Badge, Toggle, Empty } from '@/ui/primitives'
import { StatusChip } from '@/ui/StatusChip'
import { ENTITY_KIND_BY_FACTOR, ENTITY_KINDS, type EntityKind } from '@/model/case'

/** "2.3. HAVA DURUMU" → "Hava Durumu" */
export function kisaBaslik(title: string): string {
  const t = title.replace(/^\s*[\d.]+\s*/, '').replace(/\s+/g, ' ').trim()
  const words = t.split(' ')
  const cased = words.map((w) => (w.length > 2 && w === w.toLocaleUpperCase('tr-TR') ? w.charAt(0) + w.slice(1).toLocaleLowerCase('tr-TR') : w)).join(' ')
  return cased.length > 34 ? cased.slice(0, 32) + '…' : cased
}

const SHEET: Record<string, string> = { 'yol-cevre': '3', arac: '4', surucu: '5', yolcu: '6', yaya: '9Y' }
const NEXT: Record<string, { to: string; label: string }> = { 'yol-cevre': { to: '/sonuc', label: 'Sonuç' }, arac: { to: '/analiz/surucu/1', label: '5. Sürücü' }, surucu: { to: '/analiz/yolcu/1', label: '6. Yolcu' }, yolcu: { to: '/analiz/yaya/1', label: '9Y. Yaya' }, yaya: { to: '/modul/kacinma', label: '19. Kaçınma' } }

export function FactorGroupPage({ group: groupProp }: { group?: string }) {
  const params = useParams()
  const navigate = useNavigate()
  const group = groupProp ?? params.group ?? 'yol-cevre'
  const c = useCaseStore((s) => s.caseData)
  const addEntity = useCaseStore((s) => s.addEntity)
  const settings = useSettingsStore((s) => s.settings)
  const all = useAllResults()
  const defs = useMemo(() => (FACTORS_BY_GROUP[group] ?? []).filter((d) => !d.draft || settings.showDrafts), [group, settings.showDrafts])
  const perEntity = defs.find((d) => d.perEntity)?.perEntity ?? null
  const kind = perEntity ? (ENTITY_KIND_BY_FACTOR[perEntity] as EntityKind) : null
  const count = kind ? Math.max(1, c[kind].length) : 1
  const n = Math.min(count, Math.max(1, Number(params.n ?? 1)))
  const idx = kind ? n - 1 : null
  const [compare, setCompare] = useState(false)
  const [filter, setFilter] = useState<'hepsi' | 'ETKEN' | 'İNCELENMELİ' | 'bos'>('hepsi')
  const [compact, setCompact] = useState(false)

  const cards = defs.map((def) => all.get(keyOf(def.id, def.perEntity ? idx : null))).filter((x): x is NonNullable<typeof x> => !!x)
  const shown = cards.filter((k) => filter === 'hepsi' ? true : filter === 'bos' ? !k.result.incelemeDurumu : k.result.durum === filter)
  const stats = { etken: cards.filter((k) => k.result.durum === 'ETKEN').length, inc: cards.filter((k) => k.result.durum === 'İNCELENMELİ').length, bos: cards.filter((k) => !k.result.incelemeDurumu).length }
  const ek = ENTITY_KINDS.find((e) => e.kind === kind)

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader sheet={SHEET[group] ?? 'Tanım'} title={GROUP_TITLES[group] ?? group} next={NEXT[group]}
        subtitle={`${defs.length} etken kartı${perEntity ? ` · ${ek?.singular} ${n} / ${count}` : ''}. Her kart tek şablondan, kütüphane verisiyle üretilir.`}
        actions={<>
          <div className="seg">{(['hepsi', 'ETKEN', 'İNCELENMELİ', 'bos'] as const).map((f) => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'hepsi' ? `Hepsi ${cards.length}` : f === 'bos' ? `Boş ${stats.bos}` : `${f} ${f === 'ETKEN' ? stats.etken : stats.inc}`}</button>)}</div>
          <Toggle checked={compact} onChange={setCompact} label={<span className="text-xs">Sıkışık</span>} />
          {kind === 'araclar' && count > 1 && <Toggle checked={compare} onChange={setCompare} label={<span className="text-xs">Yan yana (Araç 1 / Araç 2)</span>} />}
        </>} />

      {kind && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="seg">{Array.from({ length: count }).map((_, i) => <button key={i} aria-pressed={i === idx} onClick={() => navigate(`/analiz/${perEntity}/${i + 1}`)}>{i + 1}. {ek?.singular}</button>)}</div>
          <button className="btn-outline !py-1 text-xs" disabled={c[kind].length >= settings.entityLimit} onClick={() => { addEntity(kind); navigate(`/analiz/${perEntity}/${c[kind].length + 1}`) }}>+ {ek?.singular} ekle</button>
          <span className="text-xs text-gri">{c[kind][idx ?? 0] ? Object.values(c[kind][idx ?? 0]).filter((v) => typeof v === 'string' || typeof v === 'number').slice(0, 3).join(' · ') : ''}</span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {cards.map((k) => <a key={k.def.id} href={`#kart-${k.def.id}-${k.entityIndex ?? 0}`} title={`${k.def.title} — ${k.result.durum || 'durum seçilmedi'}`} className="inline-flex items-center gap-1.5 rounded-full border border-krem-200 bg-white py-0.5 pl-1 pr-2.5 text-[11px] text-lacivert hover:border-camgobegi"><StatusChip value={k.def.displayCode?.replace(/\.$/, '') || '•'} size="sm" className={k.result.durum ? '' : '!bg-krem-200 !text-gri'} defined={k.result.durumDefined} /><span className="max-w-[12rem] truncate">{kisaBaslik(k.def.title)}</span></a>)}
      </div>

      {shown.length === 0 && <Empty>Bu filtrede kart yok.</Empty>}
      <div className={compare && kind === 'araclar' ? 'grid gap-4 xl:grid-cols-2' : 'space-y-4'}>
        {shown.map((k) => (
          compare && kind === 'araclar'
            ? [0, 1].map((i) => { const x = all.get(keyOf(k.def.id, i)); return x ? <FactorCard key={`${k.def.id}-${i}`} def={x.def} entityIndex={i} entry={x.entry} result={x.result} compact /> : <div key={`${k.def.id}-${i}`} className="kart p-4 text-sm text-gri">Araç {i + 1} yok</div> })
            : <FactorCard key={k.def.id} def={k.def} entityIndex={k.entityIndex} entry={k.entry} result={k.result} compact={compact} />
        ))}
      </div>
      {group === 'arac' && <p className="mt-4 text-xs text-gri"><Badge tone="altin">Not</Badge> Excel'de Araç 2 sütunu kırık referanslar içeriyordu (il verisi çekiyordu). Burada her araç aynı şablondan doğru verilerle üretilir (tutarsızlık #1).</p>}
    </div>
  )
}

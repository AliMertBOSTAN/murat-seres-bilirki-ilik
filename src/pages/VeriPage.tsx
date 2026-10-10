import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import inputFields from '@content/core/input-fields.json'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { listItems, PARTY_LABELS } from '@/content'
import { getPath } from '@/engine/path'
import { weekdayTR, formatDateTR } from '@/engine/excel-compat'
import { Field, Select, TextInput, ComboInput, Tabs, PageHeader, Badge, Segmented } from '@/ui/primitives'
import { ENTITY_KINDS, type EntityKind } from '@/model/case'
import { ILLER, getIlceler } from '@/data/reference'

interface FieldDef { row: number; path: string; kind: string; label: string; listId: string | null; localOptions: string[] | null }
const FIELDS = inputFields.grs1 as FieldDef[]
const SECTIONS = inputFields.sections as { id: string; title: string; rows: number[] }[]
const INCELEME = listItems('inceleme-durumu')
/** Birden fazla kişi girilebilen taraf etiketleri */
const TARAF_RE = /MAĞDUR|KATILAN|VEKİL|SANIK|DAVACI|DAVALI|ŞÜPHELİ|ALACAKLI|BORÇLU/i

export function VeriPage() {
  const c = useCaseStore((s) => s.caseData)
  const setField = useCaseStore((s) => s.setField)
  const addEntity = useCaseStore((s) => s.addEntity)
  const removeEntity = useCaseStore((s) => s.removeEntity)
  const limit = useSettingsStore((s) => s.settings.entityLimit)
  const loc = useLocation()
  const [tab, setTab] = useState<string>('taraflar')
  const [entityIdx, setEntityIdx] = useState<Record<EntityKind, number>>({ araclar: 0, suruculer: 0, yayalar: 0, yolcular: 0 })

  useEffect(() => {
    const h = decodeURIComponent(loc.hash.replace('#', ''))
    if (!h) return
    const base = h.replace(/\[\d+\]/, '[]')
    const f = FIELDS.find((x) => x.path === base)
    const m = /\[(\d+)\]/.exec(h)
    if (f) {
      const sec = SECTIONS.find((s) => s.rows.includes(f.row))
      if (sec) setTab(sec.id)
      const ek = ENTITY_KINDS.find((k) => f.path.startsWith(k.kind))
      if (ek && m) setEntityIdx((p) => ({ ...p, [ek.kind]: +m[1] }))
      setTimeout(() => document.getElementById(`alan-${f.row}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    }
  }, [loc.hash])

  const labelSet = useMemo(() => {
    const sets = (PARTY_LABELS as { sets: { id: string; title: string; labels: string[] }[] }).sets
    return sets.find((s) => s.id === (c.dosya.dosyaTuru ?? 'ceza')) ?? sets[0]
  }, [c.dosya.dosyaTuru])

  const section = SECTIONS.find((s) => s.id === tab) ?? SECTIONS[0]
  const entityKind = ENTITY_KINDS.find((k) => k.kind === tab)
  const rows = FIELDS.filter((f) => section.rows.includes(f.row))

  const renderField = (f: FieldDef, path: string) => {
    const value = getPath(c, path) as string | number | undefined
    const set = (v: unknown) => setField(path, v)
    let label = f.label || path.split('.').pop() || ''
    if (f.row >= 6 && f.row <= 20) label = labelSet.labels[f.row - 6] || label
    // Taraflar: tarih alanları takvimden seçilir; taraf alanlarına "+" ile birden fazla kişi eklenebilir
    if (f.row >= 6 && f.row <= 17) {
      const source0 = `Grş 1!D${f.row}`
      if (/TARİH/i.test(label)) return <Field label={label} source={source0}><TextInput type="date" value={String(value ?? '').slice(0, 10)} onChange={set} /></Field>
      if (TARAF_RE.test(label)) {
        const ekPath = `${path}_ek`
        const ekler = (getPath(c, ekPath) as string[] | undefined) ?? []
        const setEk = (arr: string[]) => setField(ekPath, arr)
        return (
          <Field label={<span className="inline-flex items-center gap-1.5">{label}<button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-camgobegi text-[11px] font-bold leading-none text-white hover:bg-lacivert" title={`Birden fazla ${label.toLocaleLowerCase('tr-TR')} ekle`} onClick={() => setEk([...ekler, ''])}>+</button></span>} source={source0}>
            <TextInput value={value ?? ''} onChange={set} placeholder={`1. ${label.toLocaleLowerCase('tr-TR')}`} />
            {ekler.map((v, i) => (
              <div key={i} className="mt-1.5 flex gap-1">
                <TextInput value={v} onChange={(t) => setEk(ekler.map((x, j) => (j === i ? t : x)))} placeholder={`${i + 2}. ${label.toLocaleLowerCase('tr-TR')}`} />
                <button type="button" className="btn-ghost !px-2 !py-1 text-xs text-red-700" title="Kaldır" onClick={() => setEk(ekler.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </Field>
        )
      }
    }
    const col = f.kind === 'scalar' || f.kind === 'derived' ? 'D' : ['D', 'E', 'F'][Number(/\[(\d+)\]/.exec(path)?.[1] ?? 0)] ?? 'D'
    const source = `Grş 1!${col}${f.row}`
    if (f.kind === 'derived') return <Field label={label} source={source}><div className="input bg-krem">{weekdayTR(c.kazaYeri.tarih) || '—'}</div></Field>
    if (f.path === 'dosya.il') return <Field label={label} source={source}><Select options={ILLER} value={c.dosya.il ?? ''} onChange={(v) => setField('dosya.il', v)} /></Field>
    if (f.path === 'dosya.ilce') return <Field label={label} source={source}><Select options={getIlceler(c.dosya.il)} value={c.dosya.ilce ?? ''} onChange={(v) => setField('dosya.ilce', v)} /></Field>
    if (f.path === 'kazaYeri.tarih') return <Field label={label} source={source} hint={formatDateTR(c.kazaYeri.tarih)}><TextInput type="date" value={String(value ?? '').slice(0, 10)} onChange={set} /></Field>
    if (f.path === 'kazaYeri.saat') return <Field label={label} source={source}><TextInput type="time" value={String(value ?? '').slice(0, 5)} onChange={set} /></Field>
    if (/dogumTarihi|Bitis$/i.test(f.path)) return <Field label={label} source={source}><TextInput type="date" value={String(value ?? '').slice(0, 10)} onChange={set} /></Field>
    const options = f.listId ? listItems(f.listId) : f.localOptions ?? []
    if (f.listId === 'tanim-d23-d32') return <Field label={label} source={source}><Segmented options={INCELEME} value={String(value ?? '')} onChange={set} size="xs" /></Field>
    if (options.length > 0) return <Field label={label} source={`${source}${f.listId ? ' ← ' + f.listId : ''}`}><ComboInput options={options} value={value ?? ''} onChange={set} /></Field>
    return <Field label={label} source={source}><TextInput value={value ?? ''} onChange={set} type={/modelYili|motorGucu|hiz$|frenUzunlugu|azamiHiz/i.test(f.path) ? 'number' : 'text'} /></Field>
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader sheet="Grş 1" title="Ana Veri Girişi" subtitle="Her alanın etiketi Tanım kütüphanesinden gelir; taraf etiketleri dosya türüne göre değişir. Varlık (araç/sürücü/yaya/yolcu) sayısı dinamiktir." next={{ to: '/rapor/aciklamalar', label: '1. Açıklamalar' }} />
      <Tabs tabs={SECTIONS.map((s) => ({ id: s.id, label: s.title, count: ENTITY_KINDS.find((k) => k.kind === s.id) ? c[s.id as EntityKind].length : undefined }))} value={tab} onChange={setTab} />
      <div className="kart mt-4 p-5">
        {tab === 'taraflar' && <div className="mb-4 flex items-center gap-2 text-xs text-gri">Etiket seti: <Badge tone="altin">{labelSet.title}</Badge> <span>(Giriş sayfasındaki dosya türünden)</span></div>}
        {entityKind && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="etiket">{entityKind.title}</span>
            <div className="seg">
              {c[entityKind.kind].map((_, i) => <button key={i} aria-pressed={entityIdx[entityKind.kind] === i} onClick={() => setEntityIdx((p) => ({ ...p, [entityKind.kind]: i }))}>{i + 1}. {entityKind.singular}</button>)}
            </div>
            <button className="btn-outline !py-1 text-xs" disabled={c[entityKind.kind].length >= limit} onClick={() => { addEntity(entityKind.kind); setEntityIdx((p) => ({ ...p, [entityKind.kind]: c[entityKind.kind].length })) }}>+ Ekle</button>
            {c[entityKind.kind].length > 0 && <button className="btn-ghost !py-1 text-xs text-red-700" onClick={() => { removeEntity(entityKind.kind, entityIdx[entityKind.kind]); setEntityIdx((p) => ({ ...p, [entityKind.kind]: 0 })) }}>Sil</button>}
            <span className="text-[11px] text-gri">üst sınır {limit} (Ayarlar)</span>
          </div>
        )}
        {entityKind && c[entityKind.kind].length === 0 ? <p className="text-sm text-gri">Henüz {entityKind.singular.toLocaleLowerCase('tr-TR')} yok. "+ Ekle" ile başlayın.</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((f) => {
              const path = entityKind ? f.path.replace('[]', `[${entityIdx[entityKind.kind]}]`) : f.path
              return <div key={f.row} id={`alan-${f.row}`}>{renderField(f, path)}</div>
            })}
          </div>
        )}
      </div>
    </div>
  )
}

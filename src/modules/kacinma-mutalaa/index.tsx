import { useMemo } from 'react'
import type { ModuleDefinition, ModuleManifest } from '../types'
import { computeSurucuKacinma, computeKurumKacinma, KURUM_CARPANLARI } from './compute'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { PageHeader, Field, TextInput, TextArea, Select, Badge, Segmented } from '@/ui/primitives'
import { formatNumberTR } from '@/engine/excel-compat'
import { CONSTANTS } from '@/content'
import { KacinmaReportSection } from './ReportSection'

export const manifest: ModuleManifest = {
  id: 'kacinma-mutalaa', name: 'Kazadan Kaçınma ve Kusur (Sayfa 19)', version: '1.0.0', kind: 'compute',
  description: 'Sürücü hız hesabı (V = ((y×3600)/t)/1000), 5 kaçınma senaryosu puanlaması, kurum/kuruluş kaçınma çarpanları.',
  inputs: [
    { key: 'suruculer[].aldigiYol', from: 'modules.kacinma-mutalaa.suruculer[].aldigiYol', required: true, fallback: 'manual' },
    { key: 'suruculer[].yolunZamani', from: 'modules.kacinma-mutalaa.suruculer[].yolunZamani', required: true, fallback: 'manual' },
    { key: 'suruculer[].temelKusurPuani', from: 'modules.sorumluluk.surucu[].puan', required: true, fallback: 'manual' },
    { key: 'plaka[]', from: 'araclar[].plaka', required: false }, { key: 'surucuAdi[]', from: 'suruculer[].adi', required: false },
  ],
  outputs: [{ key: 'suruculer[].hizKmS', label: 'Aracın hızı', unit: 'km/s' }, { key: 'suruculer[].hizMS', label: 'Saniyede aldığı yol', unit: 'm/s' }, { key: 'suruculer[].senaryolar[].durum', label: 'Kaçınma durumu' }, { key: 'suruculer[].toplamKusur', label: 'Kusur puanı' }, { key: 'kurumlar[].kusur', label: 'Kurum kusur puanı' }],
  pages: [{ route: '/modul/kacinma', title: 'Kazadan Kaçınma', sheetName: '19' }],
  reportSections: [{ id: 'kacinma', title: 'Kazadan Kaçınma Hesaplaması (Mütalaa)', after: 'yaya' }],
  goldenTests: 'tests/golden/core-sample.test.ts',
}

interface SurucuK { aldigiYol?: number | string; yolunZamani?: number | string; temelKusurPuani?: number | string; senaryoPuanlari?: (number | null)[]; senaryoMutealalari?: string[]; muteala?: string; sonucMuteala?: string; frenIzi?: string }
interface KurumK { kurum?: string; sube?: string; zilyetlik?: string; temelKusur?: number | string; bilgiSuresi?: string; senaryoPuani?: number | null; senaryoIndex?: number; muteala?: string }
export interface KacinmaData { yolHizi?: number | string; kavsakHizi?: number | string; suruculer?: SurucuK[]; kurumlar?: KurumK[] }

const SENARYOLAR = (CONSTANTS as { kacinma: { senaryolar: string[]; kurumSenaryolar: { puan: number | string; ad: string; aciklama: string }[] } }).kacinma

function KacinmaPage() {
  const c = useCaseStore((s) => s.caseData)
  const setModuleData = useCaseStore((s) => s.setModuleData)
  const settings = useSettingsStore((s) => s.settings)
  const data = (c.modules['kacinma-mutalaa'] ?? {}) as KacinmaData
  const suruculer: SurucuK[] = data.suruculer?.length ? data.suruculer : c.suruculer.map(() => ({}))
  const kurumlar: KurumK[] = data.kurumlar ?? []
  const save = (patch: Partial<KacinmaData>) => setModuleData('kacinma-mutalaa', { ...data, suruculer, kurumlar, ...patch })
  const setS = (i: number, p: Partial<SurucuK>) => { const next = suruculer.map((s, j) => (j === i ? { ...s, ...p } : s)); save({ suruculer: next }) }
  const setK = (i: number, p: Partial<KurumK>) => { const next = kurumlar.map((k, j) => (j === i ? { ...k, ...p } : k)); save({ kurumlar: next }) }
  const results = useMemo(() => suruculer.map((s) => computeSurucuKacinma({ aldigiYol: Number(s.aldigiYol), yolunZamani: Number(s.yolunZamani), temelKusurPuani: Number(s.temelKusurPuani), senaryoPuanlari: s.senaryoPuanlari ?? [] }, { duzeltilmisCarpan: settings.duzeltmeler.kacinmaCarpan })), [suruculer, settings.duzeltmeler.kacinmaCarpan])

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader sheet="19" title="Kazadan Kaçınma ve Kusur Puanlaması (Mütalaa)" subtitle="Excel'de temel kusur puanı dış dosyadan (SRNK!AS47) geliyordu; dosya elimizde olmadığından elle girilir. ZMN5/SRNK modülleri eklenince otomatik bağlanır." next={{ to: '/modul/gunes', label: 'Güneş modülü' }} />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Field label="Yolun hızı (mahal) km" source="19!M8"><TextInput type="number" value={data.yolHizi ?? ''} onChange={(v) => save({ yolHizi: v })} /></Field>
        <Field label="Yolun kavşak hızı km" source="19!AB8"><TextInput type="number" value={data.kavsakHizi ?? ''} onChange={(v) => save({ kavsakHizi: v })} /></Field>
        <div className="sm:col-span-2 text-xs text-gri self-end">Formül: <code>V = ((Tt × y) / t) / m</code>, Tt=3600 s, m=1000. Senaryo kusuru: AR12/5 × çarpan {settings.duzeltmeler.kacinmaCarpan ? '(düzeltilmiş: puan)' : '(Excel: 1→5, 2→2, 3→3, 4→4)'}.</div>
      </div>

      {suruculer.map((s, i) => {
        const r = results[i]
        return (
          <section key={i} className="kart mb-5 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-lacivert">{i + 1}. Sürücü <span className="text-sm font-normal text-gri">{String(c.suruculer[i]?.adi ?? '')} · {String(c.araclar[i]?.plaka ?? '')}</span></h3>
              <div className="flex items-center gap-3 text-sm"><Badge tone="cam">V = {r.hizKmS === '' ? '—' : formatNumberTR(r.hizKmS, 2)} km/s</Badge><Badge tone="cam">{r.hizMS === '' ? '—' : formatNumberTR(r.hizMS, 2)} m/s</Badge><Badge tone="altin">Kusur: {formatNumberTR(r.toplamKusur, 2)}</Badge></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Aldığı yol y (m)" source="19!R10 ← ZMN5"><TextInput type="number" step="0.01" value={s.aldigiYol ?? ''} onChange={(v) => setS(i, { aldigiYol: v })} /></Field>
              <Field label="Yolun zamanı t (s)" source="19!V10 ← ZMN5"><TextInput type="number" step="0.01" value={s.yolunZamani ?? ''} onChange={(v) => setS(i, { yolunZamani: v })} /></Field>
              <Field label="Temel kusur puanı AR12" source="19!AR12 ← SRNK!AS47"><TextInput type="number" value={s.temelKusurPuani ?? ''} onChange={(v) => setS(i, { temelKusurPuani: v })} /></Field>
              <Field label="Fren izi" source="19!AN10"><TextInput value={s.frenIzi ?? ''} onChange={(v) => setS(i, { frenIzi: v })} placeholder="Fren izi yok" /></Field>
            </div>
            <Field label="Sürücü mütalaası" className="mt-3" source="19!G11"><TextArea value={s.muteala ?? ''} onChange={(v) => setS(i, { muteala: v })} /></Field>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gri"><tr><th className="py-1">SN</th><th>Kaçınma manevrası</th><th>Puan (0–5)</th><th>Durum</th><th className="text-right">Kusur</th><th>Mütalaa</th></tr></thead>
              <tbody>{SENARYOLAR.senaryolar.map((ad, k) => (
                <tr key={k} className="border-t border-krem-200 align-top">
                  <td className="py-1 pr-2">{k + 1}</td><td className="pr-2">{ad}</td>
                  <td className="pr-2"><Segmented options={['0', '1', '2', '3', '4', '5']} value={String(s.senaryoPuanlari?.[k] ?? 0)} onChange={(v) => { const p = [...(s.senaryoPuanlari ?? [0, 0, 0, 0, 0])]; p[k] = v === '' ? 0 : Number(v); setS(i, { senaryoPuanlari: p }) }} size="xs" /></td>
                  <td className="pr-2 text-xs font-semibold">{r.senaryolar[k]?.durum}</td>
                  <td className="pr-2 text-right font-mono text-xs">{formatNumberTR(Number(r.senaryolar[k]?.kusur || 0), 1)}</td>
                  <td><TextInput value={s.senaryoMutealalari?.[k] ?? ''} onChange={(v) => { const m = [...(s.senaryoMutealalari ?? ['', '', '', '', ''])]; m[k] = v; setS(i, { senaryoMutealalari: m }) }} className="!py-1 !text-xs" /></td>
                </tr>
              ))}</tbody>
            </table>
            <Field label="Sonuç mütalaası" className="mt-3" source="19!F18"><TextArea value={s.sonucMuteala ?? ''} onChange={(v) => setS(i, { sonucMuteala: v })} /></Field>
            <p className="mt-2 text-[11px] text-gri">{r.provenance.map((p) => `${p.step}: ${p.detail}`).join(' · ')}</p>
          </section>
        )
      })}

      <section className="kart p-5">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold text-lacivert">Sorumlu kurum / kuruluş kaçınmaları</h3><button className="btn-outline !py-1 text-xs" onClick={() => save({ kurumlar: [...kurumlar, { bilgiSuresi: 'Belirsiz' }] })}>+ Kurum ekle</button></div>
        {kurumlar.length === 0 && <p className="text-sm text-gri">Kurum eklenmedi (Excel: Kayseri Büyükşehir / Kocasinan Belediyesi, Müteahhit firma örnekleri).</p>}
        {kurumlar.map((k, i) => {
          const r = computeKurumKacinma({ temelKusur: Number(k.temelKusur), bilgiSuresi: k.bilgiSuresi, senaryoPuani: k.senaryoPuani ?? null }, { duzeltilmisAnlam: settings.duzeltmeler.kurumAnlam })
          return (
            <div key={i} className="mb-3 rounded-lg border border-krem-200 p-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Sorumlu kurum" source="19!J85"><TextInput value={k.kurum ?? ''} onChange={(v) => setK(i, { kurum: v })} /></Field>
                <Field label="Şube / zilyetlik" source="19!J86, B87"><TextInput value={k.sube ?? ''} onChange={(v) => setK(i, { sube: v })} /></Field>
                <Field label="Temel kusur O" source="19!O87 ← İŞRNK/BRYR"><TextInput type="number" value={k.temelKusur ?? ''} onChange={(v) => setK(i, { temelKusur: v })} /></Field>
                <Field label="Bilgi süresi" source="19!AQ86"><Select options={['Belirsiz', ...Object.keys(KURUM_CARPANLARI)]} value={k.bilgiSuresi ?? 'Belirsiz'} onChange={(v) => setK(i, { bilgiSuresi: v })} /></Field>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Select options={SENARYOLAR.kurumSenaryolar.map((s, j) => ({ value: String(j), label: `${s.puan} — ${s.ad}` }))} value={k.senaryoIndex !== undefined ? String(k.senaryoIndex) : ''} onChange={(v) => { const j = v === '' ? undefined : Number(v); setK(i, { senaryoIndex: j, senaryoPuani: j === undefined ? null : Number(SENARYOLAR.kurumSenaryolar[j].puan) || 0 }) }} placeholder="Kaçınma senaryosu" />
                <div className="flex items-center gap-2 text-sm"><Badge tone="altin">AR = {formatNumberTR(r.AR, 1)}</Badge><Badge tone={r.durum === 'KAZADAN KAÇINMA' ? 'kirmizi' : 'gri'}>{r.durum || '—'}</Badge><Badge tone="cam">Kusur {formatNumberTR(r.kusur, 1)}</Badge></div>
              </div>
              <TextArea className="mt-2" value={k.muteala ?? ''} onChange={(v) => setK(i, { muteala: v })} placeholder="Tehlike mütalaası (19!G88)" />
              <p className="mt-1 text-[11px] text-amber-800">⚠ Excel'de kurum satırlarında 0→KAÇINMA, 5→KAÇINAMAZ (sürücünün tersi) — tutarsızlık #7. {settings.duzeltmeler.kurumAnlam ? 'Düzeltilmiş anlam uygulanıyor.' : 'Excel uyumlu mod.'}</p>
            </div>
          )
        })}
      </section>
    </div>
  )
}

export const kacinmaModule: ModuleDefinition = { manifest, Page: KacinmaPage, ReportSection: KacinmaReportSection }

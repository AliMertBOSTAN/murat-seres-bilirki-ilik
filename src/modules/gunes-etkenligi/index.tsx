import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { ModuleDefinition, ModuleManifest } from '../types'
import { solarPosition, glareForVehicle, raporCumlesi, type ThetaBand } from './solar'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { PageHeader, Field, TextInput, Tabs, Badge } from '@/ui/primitives'
import { StatusChip } from '@/ui/StatusChip'
import { parseNumberTR, formatNumberTR } from '@/engine/excel-compat'
import content from '@content/modules/gunes-etkenligi/content.json'
import { KonumSecici } from './KonumSecici'
import { GunesReportSection } from './ReportSection'

export const manifest: ModuleManifest = {
  id: 'gunes-etkenligi', name: 'Güneş Etkenliği (Solar Glare)', version: '1.0.0', kind: 'compute',
  description: 'Kaza anındaki güneş konumunu (NOAA) hesaplar, sürücü görüş doğrultusuyla 3B açı farkı θ üretir, K katsayısı ile reaksiyon mesafesi kaybını standartlaştırır.',
  inputs: [
    { key: 'tarih', from: 'kazaYeri.tarih', required: true }, { key: 'saat', from: 'kazaYeri.saat', required: true },
    { key: 'utcOfset', from: 'settings.gunes.varsayilanUtcOfset', required: true, fallback: 'setting' },
    { key: 'konum', from: 'kazaYeri.konum', required: true, fallback: 'manual' },
    { key: 'heading[]', from: 'araclar[].seyirYonu', required: true, fallback: 'manual' },
    { key: 'pitch[]', from: 'suruculer[].bakisEgimi', required: false, fallback: 'setting' },
    { key: 'hiz[]', from: 'araclar[].hiz', required: false }, { key: 'reaksiyon[]', from: 'suruculer[].reaksiyonSuresi', required: false, fallback: 'setting' },
  ],
  outputs: [
    { key: 'elevasyon', label: 'Güneş elevasyon', unit: '°' }, { key: 'azimut', label: 'Güneş azimut', unit: '°' }, { key: 'arac[].theta', label: '3B açı farkı θ', unit: '°' },
    { key: 'arac[].etkiSinifi', label: 'Etki sınıfı' }, { key: 'arac[].K', label: 'Glare katsayısı K' }, { key: 'arac[].reaksiyonMesafesiNormal', label: 'Reaksiyon mesafesi (normal)', unit: 'm' },
    { key: 'arac[].reaksiyonMesafesiGlare', label: 'Reaksiyon mesafesi (glare)', unit: 'm' }, { key: 'raporCumlesi', label: 'Rapor cümlesi' },
  ],
  pages: [
    { route: '/modul/gunes', title: 'Model', sheetName: 'model' }, { route: '/modul/gunes/vaka', title: 'Vaka Girişi', sheetName: 'Vaka_Girişi' },
    { route: '/modul/gunes/hesap', title: 'Hesap', sheetName: 'Hesap' }, { route: '/modul/gunes/siniflandirma', title: 'Sınıflandırma', sheetName: 'sınıflandırma' },
    { route: '/modul/gunes/rapor', title: 'Rapor Çıktısı', sheetName: 'Rapor_cıktı' }, { route: '/modul/gunes/kurumsal', title: 'Kurumsal Model', sheetName: 'Kurumsal_Model' },
  ],
  hooks: [{ targetFactorId: 'yol-cevre.saat-dakika', suggest: 'suggestFromGlare' }, { targetFactorId: 'yol-cevre.gun-durumu', suggest: 'suggestFromGlare' }],
  settingsSchema: 'thetaBands[{max,sinif,K}], varsayilanReaksiyon=1.5, varsayilanPitch=0, varsayilanUtcOfset=3, oneriEslemesi{sinif→incelemeDurumu}',
  reportSections: [{ id: 'gunes', title: 'Güneş Etkenliği Değerlendirmesi', after: 'yol-cevre' }],
  goldenTests: 'tests/golden/gunes.test.ts',
}

export interface GunesCompute { ok: boolean; reason?: string; sun?: ReturnType<typeof solarPosition>; araclar: { index: number; heading: number | undefined; g?: ReturnType<typeof glareForVehicle>; cumle?: string }[] }

export function computeGunes(caseData: ReturnType<typeof useCaseStore.getState>['caseData'], settings: ReturnType<typeof useSettingsStore.getState>['settings']): GunesCompute {
  const m = (caseData.modules['gunes-etkenligi'] ?? {}) as { utcOfset?: number; konum?: { lat?: number; lon?: number } }
  const date = String(caseData.kazaYeri.tarih ?? '').slice(0, 10)
  const time = String(caseData.kazaYeri.saat ?? '').slice(0, 5)
  const konum = m.konum?.lat !== undefined ? m.konum : caseData.kazaYeri.konum
  if (!date || !time) return { ok: false, reason: 'Kaza tarihi ve saati (Grş 1!D27, D29) gerekli.', araclar: [] }
  if (!konum || konum.lat === undefined || konum.lon === undefined) return { ok: false, reason: 'Konum (enlem/boylam) gerekli — haritadan seçin veya elle girin.', araclar: [] }
  const sun = solarPosition({ date, time, utcOffset: m.utcOfset ?? settings.gunes.varsayilanUtcOfset, lat: Number(konum.lat), lon: Number(konum.lon) })
  const bands = settings.gunes.thetaBands as ThetaBand[]
  const araclar = caseData.araclar.map((a, i) => {
    const heading = parseNumberTR(a.seyirYonu)
    if (heading === undefined) return { index: i, heading }
    const s = caseData.suruculer[i] ?? {}
    const g = glareForVehicle(sun, { heading, pitch: parseNumberTR(s.bakisEgimi) ?? settings.gunes.varsayilanPitch, hizKmS: parseNumberTR(a.hiz) ?? 50, reaksiyonS: parseNumberTR(s.reaksiyonSuresi) ?? settings.gunes.varsayilanReaksiyon }, bands, { pitch: settings.gunes.varsayilanPitch, hiz: 50, reaksiyon: settings.gunes.varsayilanReaksiyon })
    return { index: i, heading, g, cumle: raporCumlesi(sun, g) }
  })
  return { ok: true, sun, araclar }
}

const f1 = (x: number | undefined) => (x === undefined ? '—' : formatNumberTR(x, 2))

function GunesPage() {
  const { alt } = useParams()
  const c = useCaseStore((s) => s.caseData)
  const setField = useCaseStore((s) => s.setField)
  const setModuleData = useCaseStore((s) => s.setModuleData)
  const settings = useSettingsStore((s) => s.settings)
  const tab = alt ?? 'model'
  const res = useMemo(() => computeGunes(c, settings), [c, settings])
  const m = (c.modules['gunes-etkenligi'] ?? {}) as { utcOfset?: number; konum?: { lat?: number; lon?: number } }
  const konum = (m.konum?.lat !== undefined ? m.konum : c.kazaYeri.konum) ?? undefined
  const [showExcelBug, setShowExcelBug] = useState(false)
  const tabs = manifest.pages.map((p) => ({ id: p.route.split('/').pop() === 'gunes' ? 'model' : p.route.split('/').pop()!, label: p.title }))
  const cnt = content as { model: { baslik: string; aciklama: string; kullanim: string[]; notlarKaynak: string }; kurumsalModel: string[]; hesapSatirlari: { row: number; cells: Record<string, unknown>; formulas: Record<string, string> }[]; siniflandirma: { row: number; cells: Record<string, unknown> }[] }
  const go = (id: string) => { window.history.pushState({}, '', id === 'model' ? '/modul/gunes' : `/modul/gunes/${id}`); window.dispatchEvent(new PopStateEvent('popstate')) }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader sheet="2.2 Gunes_Etkenligi_Model.xlsx" title="Güneş Etkenliği (Solar Glare)" subtitle="Eklenti modülü. Güneş konumu ortak, θ her araç/sürücü için ayrı hesaplanır. Excel'deki yerel ayar ve satır kayması hataları burada düzeltilmiştir; Excel uyumlu mod bu modülde yoktur." next={{ to: '/sonuc', label: 'Sonuç' }} />
      <Tabs tabs={tabs} value={tab} onChange={go} />
      <div className="kart mt-4 p-5">
        {tab === 'model' && (
          <div className="prose prose-sm max-w-none">
            <h3 className="font-display text-xl text-lacivert">{cnt.model.baslik}</h3>
            <p>{cnt.model.aciklama}</p>
            <h4 className="etiket mt-4">Kullanım</h4><ol className="list-decimal pl-5 text-sm">{cnt.model.kullanim.map((k, i) => <li key={i}>{k.replace(/^\d\)\s*/, '')}</li>)}</ol>
            <h4 className="etiket mt-4">Notlar / Kaynak</h4><p className="text-sm">{cnt.model.notlarKaynak}</p>
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <b>Düzeltilen Excel hataları:</b> `VALUE("41.0082")` → 410082 (yerel ayar), TST/HA/zenit/elevasyon/vektör satır kaymaları, iç çarpım yanlış üçlü, tek araç varsayımı. Ayrıntı: docs/tutarsizlik-raporu.md #20–22. Excel'in kayıtlı örnek sonucu "Tam körlük" iken doğru sonuç "Düşük/önemsiz"dir (G-1 altın testi).
              <button className="ml-2 underline" onClick={() => setShowExcelBug((v) => !v)}>{showExcelBug ? 'gizle' : 'Excel formüllerini göster'}</button>
              {showExcelBug && <table className="mt-2 w-full text-[10px]"><tbody>{cnt.hesapSatirlari.filter((r) => r.formulas.I).map((r) => <tr key={r.row}><td className="pr-2 font-mono text-gri">I{r.row}</td><td>{String(r.cells.B ?? '')}</td><td className="font-mono">={r.formulas.I}</td></tr>)}</tbody></table>}
            </div>
          </div>
        )}
        {tab === 'vaka' && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-lacivert">Vaka girişi</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tarih" source="kazaYeri.tarih (Grş 1!D27)"><TextInput type="date" value={String(c.kazaYeri.tarih ?? '').slice(0, 10)} onChange={(v) => setField('kazaYeri.tarih', v)} /></Field>
                <Field label="Saat (yerel)" source="kazaYeri.saat (Grş 1!D29)"><TextInput type="time" value={String(c.kazaYeri.saat ?? '').slice(0, 5)} onChange={(v) => setField('kazaYeri.saat', v)} /></Field>
                <Field label="UTC ofset" hint={`varsayılan ${settings.gunes.varsayilanUtcOfset}`}><TextInput type="number" value={m.utcOfset ?? settings.gunes.varsayilanUtcOfset} onChange={(v) => setModuleData('gunes-etkenligi', { ...m, utcOfset: Number(v) })} /></Field>
                <Field label="Enlem (°)"><TextInput value={konum?.lat ?? ''} onChange={(v) => setField('kazaYeri.konum', { lat: parseNumberTR(v) ?? 0, lon: konum?.lon ?? 0 })} placeholder="40,0806" /></Field>
                <Field label="Boylam (°)"><TextInput value={konum?.lon ?? ''} onChange={(v) => setField('kazaYeri.konum', { lat: konum?.lat ?? 0, lon: parseNumberTR(v) ?? 0 })} placeholder="29,5097" /></Field>
              </div>
              <div className="etiket">Araçlar (heading / hız / sürücü reaksiyon / pitch)</div>
              {c.araclar.map((a, i) => (
                <div key={i} className="grid grid-cols-5 items-end gap-2 rounded-lg bg-krem p-2 text-xs">
                  <div className="font-semibold">{i + 1}. Araç<br /><span className="font-normal text-gri">{String(a.plaka ?? '')}</span></div>
                  <Field label="Heading °"><TextInput type="number" value={a.seyirYonu as number | undefined} onChange={(v) => setField(`araclar[${i}].seyirYonu`, v === '' ? undefined : Number(v))} placeholder="0=K 90=D" /></Field>
                  <Field label="Hız km/s"><TextInput type="number" value={a.hiz as number | undefined} onChange={(v) => setField(`araclar[${i}].hiz`, v === '' ? undefined : Number(v))} placeholder="50" /></Field>
                  <Field label="t (s)"><TextInput value={(c.suruculer[i]?.reaksiyonSuresi as string) ?? ''} onChange={(v) => setField(`suruculer[${i}].reaksiyonSuresi`, v)} placeholder={String(settings.gunes.varsayilanReaksiyon)} /></Field>
                  <Field label="Pitch °"><TextInput value={(c.suruculer[i]?.bakisEgimi as string) ?? ''} onChange={(v) => setField(`suruculer[${i}].bakisEgimi`, v)} placeholder={String(settings.gunes.varsayilanPitch)} /></Field>
                </div>
              ))}
              <p className="text-[11px] text-gri">Koordinat ve seyir yönü çekirdek Excel'de yoktu; yeni alanlar (kazaYeri.konum, araclar[].seyirYonu). Sayılarda `,` ve `.` kabul edilir.</p>
            </div>
            <div>
              <div className="etiket mb-1">Konum ve yön (harita)</div>
              <KonumSecici konum={konum as { lat: number; lon: number } | undefined} headings={c.araclar.map((a) => parseNumberTR(a.seyirYonu))} sunAzimuth={res.sun?.azimuth} onKonum={(lat, lon) => setField('kazaYeri.konum', { lat, lon })} onHeading={(i, h) => setField(`araclar[${i}].seyirYonu`, h)} />
            </div>
          </div>
        )}
        {tab === 'hesap' && (
          !res.ok ? <p className="text-sm text-amber-800">⚠ {res.reason}</p> : (
            <div className="grid gap-4 lg:grid-cols-2">
              <table className="text-sm"><tbody>
                {[['Yıl içi gün N', res.sun!.N], ['Gün içi saat h', res.sun!.h], ['γ (rad)', res.sun!.gamma], ['EoT (dk)', res.sun!.eot], ['δ deklinasyon (°)', res.sun!.declDeg], ['Zaman ofseti (dk)', res.sun!.offset], ['TST (dk)', res.sun!.tst], ['HA saat açısı (°)', res.sun!.ha], ['Zenit (°)', res.sun!.zenith], ['Elevasyon (°)', res.sun!.elevation], ['Azimut (°)', res.sun!.azimuth]].map(([k, v]) => <tr key={String(k)} className="border-b border-krem-200"><td className="py-1 pr-4 text-gri">{k}</td><td className="py-1 font-mono">{typeof v === 'number' ? formatNumberTR(v, 4) : String(v)}</td></tr>)}
              </tbody></table>
              <div className="space-y-2">
                {res.araclar.map((a) => (
                  <div key={a.index} className="rounded-lg border border-krem-200 p-3 text-sm">
                    <div className="flex items-center justify-between"><b>{a.index + 1}. Araç</b>{a.g ? <Badge tone={a.g.K < 0.5 ? 'kirmizi' : a.g.K < 1 ? 'altin' : 'yesil'}>{a.g.sinif} · K={a.g.K}</Badge> : <Badge>heading yok</Badge>}</div>
                    {a.g && <dl className="mt-1 grid grid-cols-2 gap-x-3 text-xs"><dt className="text-gri">Heading</dt><dd>{a.heading}°</dd><dt className="text-gri">θ</dt><dd>{f1(a.g.theta)}°</dd><dt className="text-gri">Reaksiyon (normal)</dt><dd>{f1(a.g.reaksiyonMesafesiNormal)} m</dd><dt className="text-gri">Reaksiyon (glare)</dt><dd>{f1(a.g.reaksiyonMesafesiGlare)} m</dd><dt className="text-gri">Algı kaybı</dt><dd>×{f1(a.g.algiKaybi)}</dd></dl>}
                  </div>
                ))}
              </div>
            </div>
          )
        )}
        {tab === 'siniflandirma' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="text-sm"><thead><tr className="text-left text-xs text-gri"><th>θ (°)</th><th>Etki sınıfı</th><th>K</th><th>Öneri → İnceleme Durumu</th></tr></thead><tbody>
              {settings.gunes.thetaBands.map((b, i) => <tr key={i} className="border-b border-krem-200"><td className="py-1">{i === 0 ? 0 : settings.gunes.thetaBands[i - 1].max}–{b.max}</td><td>{b.sinif}</td><td>{b.K}</td><td><StatusChip value={settings.gunes.oneriEslemesi[b.sinif] ?? ''} size="sm" /></td></tr>)}
            </tbody></table>
            <div className="text-xs text-gri"><p>K, güneş etkisi nedeniyle algı/görüş kapasitesinin relatif çarpanıdır. Reaksiyon mesafesi (normal) = V/3,6 × t; (glare) = normal / K; algı kaybı = 1/K.</p><p className="mt-2">Bantlar ve öneri eşlemesi Ayarlar › Katsayılar'dan düzenlenir; öneri eşlemesi ürün sahibi onayı bekler (docs/acik-sorular.md #3).</p></div>
          </div>
        )}
        {tab === 'rapor' && (
          !res.ok ? <p className="text-sm text-amber-800">⚠ {res.reason}</p> : (
            <div className="belge space-y-3 text-sm">
              <table className="w-full text-[13px]"><tbody>
                <tr><td className="w-56 py-1 font-bold">Tarih/Saat (yerel)</td><td>{String(c.kazaYeri.tarih).slice(0, 10)} {String(c.kazaYeri.saat).slice(0, 5)}</td></tr>
                <tr><td className="py-1 font-bold">Konum (enlem/boylam)</td><td>{formatNumberTR(Number(konum?.lat), 4)} / {formatNumberTR(Number(konum?.lon), 4)}</td></tr>
                <tr><td className="py-1 font-bold">Güneş elevasyon (°)</td><td>{f1(res.sun!.elevation)}</td></tr>
                <tr><td className="py-1 font-bold">Güneş azimut (°)</td><td>{f1(res.sun!.azimuth)}</td></tr>
              </tbody></table>
              {res.araclar.filter((a) => a.g).map((a) => <div key={a.index} className="rounded border border-black/20 p-3"><b>{a.index + 1}. Araç (heading {a.heading}°):</b> θ={f1(a.g!.theta)}°, {a.g!.sinif}, K={a.g!.K}<p className="mt-1 italic">{a.cumle}</p></div>)}
              <p className="text-xs">Not: NOAA yaklaşık güneş konumu + 3B açı (θ) hesabı. Saha koşulları ayrıca değerlendirilmelidir.</p>
            </div>
          )
        )}
        {tab === 'kurumsal' && <div className="space-y-2 text-sm">{cnt.kurumsalModel.map((p, i) => <p key={i} className={/^\d\)/.test(p) ? 'mt-3 font-semibold text-lacivert' : ''}>{p}</p>)}</div>}
      </div>
    </div>
  )
}

export const gunesModule: ModuleDefinition = {
  manifest,
  Page: GunesPage,
  ReportSection: GunesReportSection,
  suggest: ({ caseData, settings, entityIndex }) => {
    const r = computeGunes(caseData, settings)
    if (!r.ok || !r.sun) return null
    const a = r.araclar.find((x) => x.g && (entityIndex === null || x.index === entityIndex)) ?? r.araclar.find((x) => x.g)
    if (!a?.g) return null
    const worst = r.araclar.filter((x) => x.g).sort((x, y) => x.g!.K - y.g!.K)[0]
    const g = (worst ?? a).g!
    return {
      moduleId: manifest.id, moduleVersion: manifest.version, title: 'Güneş modülü önerisi',
      incelemeDurumu: settings.gunes.oneriEslemesi[g.sinif], muteala: (worst ?? a).cumle,
      summary: (worst ?? a).cumle ?? '', details: [{ label: 'θ', value: `${f1(g.theta)}°` }, { label: 'Sınıf', value: g.sinif }, { label: 'K', value: String(g.K) }, { label: 'Elevasyon / Azimut', value: `${f1(r.sun.elevation)}° / ${f1(r.sun.azimuth)}°` }],
    }
  },
}

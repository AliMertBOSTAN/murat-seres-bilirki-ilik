import { useMemo, useState } from 'react'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useAllResults, useSummary } from '@/engine/selectors'
import { GROUP_TITLES, PARTY_LABELS, CONTENT_VERSION } from '@/content'
import { ReportHeader, ReportFooter } from '@/components/ReportHeader'
import { PageHeader, Toggle } from '@/ui/primitives'
import { StatusChip } from '@/ui/StatusChip'
import { formatDateTR, weekdayTR, formatTimeTR, eqTR } from '@/engine/excel-compat'
import { legalParagraphs, legalVariant } from './AciklamalarPage'
import { ENTITY_KIND_BY_FACTOR, ENTITY_KINDS } from '@/model/case'
import { MODULE_DEFS } from '@/modules/registry'
import { exportDocx } from '@/lib/docx'
import type { EvaluatedCard } from '@/engine/selectors'

const ORDER = ['yol-cevre', 'arac', 'surucu', 'yolcu', 'yaya', 'dorse', 'iz', 'olu-yarali', 'kaza-nedeni']
const LOGO: Record<string, string> = { 'yol-cevre': 'sb-bilirkisilik.png', surucu: 'sb-bilirkisilik.png', yaya: 'sb-bilirkisilik.png' }

export function RaporOnizlemePage() {
  const c = useCaseStore((s) => s.caseData)
  const settings = useSettingsStore((s) => s.settings)
  const all = useAllResults()
  const summary = useSummary()
  const [showProv, setShowProv] = useState(false)
  const generatedAt = useMemo(() => new Date().toISOString(), [])
  const labelSet = (PARTY_LABELS as { sets: { id: string; labels: string[] }[] }).sets.find((s) => s.id === (c.dosya.dosyaTuru ?? 'ceza'))!
  const groups = ORDER.map((g) => ({ g, cards: [...all.values()].filter((k) => k.def.group === g && (settings.reportShowDrafts || !k.def.draft) && k.def.showInReport !== false || (k.def.group === g && settings.reportShowDrafts && k.def.draft)) })).filter((x) => x.cards.length)
  const visible = (k: EvaluatedCard) => settings.reportAranmadi === 'gizle' ? !eqTR(k.result.incelemeDurumu, 'Aranmadı') : true
  const pages: { title: string; logo?: string; body: React.ReactNode }[] = []
  const title = [c.dosya.mahkemeNo, c.dosya.mahkemeAdi, c.dosya.raporTuru].filter(Boolean).join(' ')

  // Kapak
  pages.push({ title: 'Kapak', body: (
    <div className="flex h-[250mm] flex-col items-center justify-between py-10 text-center">
      <img src="/brand/sb-bilirkisilik-adaletin-guvencesi.png" alt="" className="h-60 object-contain" />
      <div><div className="text-3xl font-bold">{c.dosya.firma}</div><div className="mt-2 text-xl">{c.dosya.raporTuru}</div><div className="mt-8 text-lg">{title}</div><div className="mt-2 text-sm">Dosya No: {c.dosya.dosyaNo || '—'} · {c.dosya.suc}</div><div className="mt-1 text-sm">{[c.dosya.il, c.dosya.ilce, c.dosya.mahalle].filter(Boolean).join(' / ')}</div></div>
      <img src="/brand/tubir.png" alt="" className="h-24 object-contain" />
    </div>) })
  // Taraflar
  pages.push({ title: 'Taraflar ve Görevlendirme', body: (
    <div className="text-[12px]">
      <h2 className="my-3 text-center text-base font-bold">{title}</h2>
      <table className="w-full border-collapse"><tbody>
        {labelSet.labels.slice(0, 12).map((l, i) => { const v = c.taraflar[`slot${i + 1}`]; return v ? <tr key={i}><td className="w-56 border border-black px-2 py-0.5 font-bold">{l}</td><td className="border border-black px-2 py-0.5">{String(v)}</td></tr> : null })}
        {[['Bilirkişi Ad Soyadı', c.bilirkisi.ad], ['Uzmanlık Alanı', c.bilirkisi.uzmanlik], ['Bilirkişi Sicil No', c.bilirkisi.sicilNo], ['İnceleme Türü', c.gorevlendirme.incelemeTuru], ['Görevlendirme / Talep Dayanağı', c.gorevlendirme.dayanak], ['İnceleme Konusu', c.gorevlendirme.konu], ['Bilirkişiye Yöneltilen Sorular', c.gorevlendirme.sorular]].map(([l, v]) => v ? <tr key={String(l)}><td className="border border-black px-2 py-0.5 font-bold">{String(l)}</td><td className="border border-black px-2 py-0.5">{String(v)}</td></tr> : null)}
      </tbody></table>
    </div>) })
  // 1. Açıklamalar
  pages.push({ title: '1. Açıklamalar', body: <div><h2 className="my-3 text-center text-base font-bold">AÇIKLAMALAR</h2>{legalParagraphs(legalVariant(c.dosya.raporTuru), settings.textOverrides).map((p, i) => <p key={i} className="mb-2 indent-8 text-justify text-[12px] leading-relaxed">{p.trim()}</p>)}</div> })
  // 2. Yer zaman
  pages.push({ title: '2. Kazanın Yeri ve Zamanı', body: (
    <table className="w-full text-[12px]"><tbody>
      {[['1.2. TARİH', formatDateTR(c.kazaYeri.tarih)], ['1.3. HAFTANIN GÜNÜ', weekdayTR(c.kazaYeri.tarih)], ['1.4. SAAT/DAKİKA', formatTimeTR(c.kazaYeri.saat)], ['1.5. İL', c.dosya.il], ['1.6. İLÇE', c.dosya.ilce], ['1.7. MAH/KÖY', c.dosya.mahalle], ['1.8. ADRESİ', c.kazaYeri.adres]].map(([l, v]) => <tr key={String(l)}><td className="w-56 border border-black px-2 py-0.5 font-bold">{l}</td><td className="border border-black px-2 py-0.5">{String(v ?? '')}</td></tr>)}
    </tbody></table>) })
  // Kart grupları
  for (const { g, cards } of groups) {
    const perEntity = cards[0]?.def.perEntity
    const kind = perEntity ? ENTITY_KIND_BY_FACTOR[perEntity] : null
    const ek = ENTITY_KINDS.find((e) => e.kind === kind)
    const idxs = kind ? Array.from(new Set(cards.map((k) => k.entityIndex ?? 0))) : [null]
    for (const idx of idxs) {
      const list = cards.filter((k) => (k.entityIndex ?? 0) === (idx ?? 0) && visible(k))
      for (let i = 0; i < list.length; i += 3) {
        pages.push({ title: `${GROUP_TITLES[g]}${idx !== null ? ` — ${ek?.singular} ${idx + 1}` : ''}`, logo: LOGO[g], body: (
          <div className="text-[11px]">
            {i === 0 && <h2 className="my-2 text-center text-sm font-bold">{title}{idx !== null ? ` — ${(ek?.singular ?? '').toLocaleUpperCase('tr-TR')} ${idx + 1}` : ''}</h2>}
            {list.slice(i, i + 3).map((k) => <KartBlok key={k.def.id} k={k} kisa={settings.reportAranmadi === 'kisa' && eqTR(k.result.incelemeDurumu, 'Aranmadı')} showProv={showProv} />)}
          </div>) })
      }
    }
    // modül bölümleri
    for (const m of MODULE_DEFS) if (settings.enabledModules.includes(m.manifest.id) && m.ReportSection && m.manifest.reportSections?.some((s) => s.after === g)) {
      const Sec = m.ReportSection
      pages.push({ title: m.manifest.reportSections[0].title, body: <Sec caseData={c} settings={settings} /> })
    }
  }
  // Sonuç
  pages.push({ title: 'Sonuç', body: (
    <div className="text-[12px]">
      <h2 className="my-3 text-center text-base font-bold">SONUÇ</h2>
      <p className="mb-2">Yapılan incelemede <b>{summary.etken}</b> etken, <b>{summary.incelenmeli}</b> incelenmeli başlık tespit edilmiştir (toplam {summary.count}).</p>
      <table className="w-full border-collapse"><thead><tr><th className="border border-black px-2 py-0.5 text-left">Başlık</th><th className="border border-black px-2 py-0.5 text-left">Durum</th><th className="border border-black px-2 py-0.5 text-left">Müteala</th></tr></thead><tbody>
        {summary.rows.map((r) => <tr key={`${r.factorId}-${r.entityIndex ?? 0}`}><td className="border border-black px-2 py-0.5">{r.title}{r.entityIndex !== null && r.entityIndex !== undefined ? ` (#${r.entityIndex + 1})` : ''}</td><td className="border border-black px-2 py-0.5">{r.durum}</td><td className="border border-black px-2 py-0.5">{r.muteala}</td></tr>)}
      </tbody></table>
      <div className="mt-10 grid grid-cols-2 gap-8 text-center"><div><div className="border-t border-black pt-1">{c.bilirkisi.ad || 'Bilirkişi'}</div><div className="text-[10px]">{c.bilirkisi.uzmanlik} · Sicil {c.bilirkisi.sicilNo}</div></div><div><div className="border-t border-black pt-1">İmza</div></div></div>
      <div className="mt-8 text-[9px] text-gray-700">Bu rapor SERESLER BİLİRKİŞİLİK sistemi ile üretilmiştir. İçerik v{CONTENT_VERSION} · Ayar sürümü {settings.version} (#{c.settingsVersionHash || settings.lastHash}) · Üretim zamanı {new Date(generatedAt).toLocaleString('tr-TR')}.</div>
    </div>) })

  return (
    <div>
      <PageHeader title="Rapor Önizleme — A4 Belge Modu" subtitle={`${pages.length} sayfa. Excel sayfa sırası: Kapak → Taraflar → 1. → 2. → 3 → 4 → 5 → 6 → 9Y → modüller → Sonuç.`}
        actions={<><Toggle checked={showProv} onChange={setShowProv} label={<span className="text-xs">Kaynak notları</span>} /><button className="btn-outline" onClick={() => void exportDocx(c, pages.map((p) => p.title), summary, all, settings)}>DOCX</button><button className="btn-primary" onClick={() => window.print()}>PDF / Yazdır</button></>} />
      <div className="belge">
        {pages.map((p, i) => (
          <div key={i} className="a4">
            <ReportHeader pageNo={i + 1} total={pages.length} logo={p.logo} frozenDate={generatedAt} />
            <div className="mt-2 flex items-center justify-between text-[9px] text-gray-600"><span>{p.title}</span><span>{c.dosya.dosyaNo}</span></div>
            {p.body}
            <div className="absolute inset-x-[14mm] bottom-[8mm]"><ReportFooter /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function KartBlok({ k, kisa, showProv }: { k: EvaluatedCard; kisa: boolean; showProv: boolean }) {
  const r = k.result, d = k.def, e = k.entry
  return (
    <div className="mb-3 break-inside-avoid border border-black">
      <div className="flex items-center justify-between bg-gray-100 px-2 py-0.5"><b>{d.title}</b><span className="flex items-center gap-2">{r.ekDosyaBayragi && <span className="text-[10px]">{r.ekDosyaBayragi}</span>}<StatusChip value={r.durum} defined={r.durumDefined} size="sm" /></span></div>
      <table className="w-full"><tbody>
        <tr><td className="w-32 border-t border-black px-2 py-0.5 font-bold">{d.subTitle || 'Değer'}</td><td className="border-t border-black px-2 py-0.5">{r.valueText}</td><td className="w-40 border-t border-l border-black px-2 py-0.5 font-bold">Kazada Durumu</td><td className="border-t border-black px-2 py-0.5">{r.kazadaDurumu}</td></tr>
        <tr><td className="border-t border-black px-2 py-0.5 font-bold">İnceleme Durumu</td><td className="border-t border-black px-2 py-0.5">{r.incelemeDurumu}</td><td className="border-t border-l border-black px-2 py-0.5 font-bold">Durum</td><td className="border-t border-black px-2 py-0.5">{r.durumDefined ? r.durum : '⚠ Kural tanımsız'}</td></tr>
        {!kisa && <>
          {r.aciklama && <tr><td className="border-t border-black px-2 py-0.5 font-bold">Açıklama</td><td colSpan={3} className="border-t border-black px-2 py-0.5 text-justify">{r.aciklama}</td></tr>}
          {r.nedensellik && <tr><td className="border-t border-black px-2 py-0.5 font-bold">Nedensellik</td><td colSpan={3} className="border-t border-black px-2 py-0.5 text-justify">{r.nedensellik}</td></tr>}
          {e?.muteala && <tr><td className="border-t border-black px-2 py-0.5 font-bold">Müteala</td><td colSpan={3} className="border-t border-black px-2 py-0.5 whitespace-pre-wrap">{e.muteala}</td></tr>}
          {r.sorunAciklama && <tr><td className="border-t border-black px-2 py-0.5 font-bold">Sorun açıklama</td><td colSpan={3} className="border-t border-black px-2 py-0.5">{r.sorunAciklama}</td></tr>}
          <tr><td className="border-t border-black px-2 py-0.5 font-bold">Tespit Yöntemi</td><td className="border-t border-black px-2 py-0.5">{(e?.tespit?.yontemler ?? []).filter(Boolean).join(', ')} {e?.tespit?.delilKodu && <>· Delil Kodu <b>{e.tespit.delilKodu}</b></>} {e?.tespit?.puanlar?.filter((p) => p !== null && p !== undefined).length ? `· Puan ${e.tespit.puanlar.join('/')}` : ''} {e?.tespit?.dogrulama && `· ${e.tespit.dogrulama}`}</td><td className="border-t border-l border-black px-2 py-0.5 font-bold">Sorumlu</td><td className="border-t border-black px-2 py-0.5">{e?.sorumlu} {e?.hakimSavciTespit && <span className="text-[10px]">· {e.hakimSavciTespit}</span>}</td></tr>
        </>}
        {showProv && <tr><td colSpan={4} className="border-t border-black px-2 py-0.5 text-[9px] text-gray-600">{r.provenance.map((p) => `${p.step}: ${p.detail}${p.source ? ` [${p.source}]` : ''}`).join(' · ')}</td></tr>}
      </tbody></table>
    </div>
  )
}

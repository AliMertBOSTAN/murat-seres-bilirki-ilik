import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useAllResults, useSummary, keyOf } from '@/engine/selectors'
import { GROUP_TITLES, PARTY_LABELS, CONTENT_VERSION } from '@/content'
import { ReportHeader, ReportFooter } from '@/components/ReportHeader'
import { PageHeader, Toggle, Tabs, Badge } from '@/ui/primitives'
import { StatusChip } from '@/ui/StatusChip'
import { cn } from '@/ui/cn'
import { formatDateTR, weekdayTR, formatTimeTR, eqTR, parseNumberTR } from '@/engine/excel-compat'
import { legalParagraphs, legalVariant } from './AciklamalarPage'
import { ENTITY_KIND_BY_FACTOR, ENTITY_KINDS, type CaseData } from '@/model/case'
import { MODULE_DEFS } from '@/modules/registry'
import type { ModuleDefinition } from '@/modules/types'
import { exportDocx, bolumDahil } from '@/lib/docx'
import type { EvaluatedCard } from '@/engine/selectors'

const ORDER = ['yol-cevre', 'arac', 'surucu', 'yolcu', 'yaya', 'dorse', 'iz', 'olu-yarali', 'kaza-nedeni']
const LOGO: Record<string, string> = { 'yol-cevre': 'sb-bilirkisilik.png', surucu: 'sb-bilirkisilik.png', yaya: 'sb-bilirkisilik.png' }
/** Etken grubu → analiz sayfası rotası (varlıklı gruplarda `/n` eklenir). */
const GROUP_ROUTE: Record<string, string> = { 'yol-cevre': '/analiz/yol-cevre', arac: '/analiz/arac', surucu: '/analiz/surucu', yolcu: '/analiz/yolcu', yaya: '/analiz/yaya' }
/** Sabit rapor bölümleri (etken grupları ve modül bölümleri dinamik eklenir). */
const SABIT_BOLUMLER: { id: string; label: string }[] = [
  { id: 'kapak', label: 'Kapak' }, { id: 'taraflar', label: 'Taraflar ve Görevlendirme' }, { id: 'aciklamalar', label: '1. Açıklamalar' }, { id: 'yer-zaman', label: '2. Kazanın Yeri ve Zamanı' },
]
const modulBolumId = (m: ModuleDefinition) => `modul-${m.manifest.id}`
const kartRotasi = (k: EvaluatedCard) => `${GROUP_ROUTE[k.def.group] ?? `/analiz/grup/${k.def.group}`}${k.def.perEntity ? `/${(k.entityIndex ?? 0) + 1}` : ''}#kart-${k.def.id}-${k.entityIndex ?? 0}`
const bos = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

interface Eksik { id: string; level: 'hata' | 'uyari'; label: string; to: string }

export function RaporOnizlemePage() {
  const c = useCaseStore((s) => s.caseData)
  const setField = useCaseStore((s) => s.setField)
  const setFields = useCaseStore((s) => s.setFields)
  const settings = useSettingsStore((s) => s.settings)
  const all = useAllResults()
  const summary = useSummary()
  const [showProv, setShowProv] = useState(false)
  const [vurgula, setVurgula] = useState(true)
  const [panel, setPanel] = useState<'icerik' | 'eksikler'>('icerik')
  const generatedAt = useMemo(() => new Date().toISOString(), [])
  const labelSet = (PARTY_LABELS as { sets: { id: string; labels: string[] }[] }).sets.find((s) => s.id === (c.dosya.dosyaTuru ?? 'ceza'))!
  const groups = ORDER.map((g) => ({ g, cards: [...all.values()].filter((k) => k.def.group === g && (settings.reportShowDrafts || !k.def.draft) && k.def.showInReport !== false || (k.def.group === g && settings.reportShowDrafts && k.def.draft)) })).filter((x) => x.cards.length)
  const visible = (k: EvaluatedCard) => settings.reportAranmadi === 'gizle' ? !eqTR(k.result.incelemeDurumu, 'Aranmadı') : true
  const title = [c.dosya.mahkemeNo, c.dosya.mahkemeAdi, c.dosya.raporTuru].filter(Boolean).join(' ')

  // --- Rapor içeriği seçimi (Dosya'da saklanır: caseData.rapor) ---
  const bolumler = c.rapor?.bolumler ?? {}
  const haric = useMemo(() => new Set(c.rapor?.haricKartlar ?? []), [c.rapor?.haricKartlar])
  const dahil = (id: string) => bolumDahil(bolumler, id)
  const kartDahil = (k: EvaluatedCard) => !haric.has(keyOf(k.def.id, k.entityIndex))
  const etkinModuller = MODULE_DEFS.filter((m) => settings.enabledModules.includes(m.manifest.id) && m.ReportSection && m.manifest.reportSections?.length)
  const tumBolumIdleri = [...SABIT_BOLUMLER.map((b) => b.id), ...groups.map((x) => x.g), ...etkinModuller.map(modulBolumId), 'sonuc']
  const tumKartAnahtarlari = groups.flatMap((x) => x.cards.map((k) => keyOf(k.def.id, k.entityIndex)))
  const setHaric = (next: Set<string>) => setField('rapor.haricKartlar', [...next])
  const toggleKart = (k: EvaluatedCard, on: boolean) => { const next = new Set(haric); const key = keyOf(k.def.id, k.entityIndex); if (on) next.delete(key); else next.add(key); setHaric(next) }
  const tumunuSec = () => setFields({ 'rapor.bolumler': {}, 'rapor.haricKartlar': [] })
  const hicbiriniSecme = () => setFields({ 'rapor.bolumler': Object.fromEntries(tumBolumIdleri.map((id) => [id, false])), 'rapor.haricKartlar': tumKartAnahtarlari })

  const pages: { title: string; logo?: string; body: React.ReactNode }[] = []

  // Kapak
  if (dahil('kapak')) pages.push({ title: 'Kapak', body: (
    <div className="flex h-[250mm] flex-col items-center justify-between py-10 text-center">
      <img src="/brand/sb-bilirkisilik-adaletin-guvencesi.png" alt="" className="h-60 object-contain" />
      <div><div className="text-3xl font-bold">{c.dosya.firma}</div><div className="mt-2 text-xl">{c.dosya.raporTuru}</div><div className="mt-8 text-lg">{title}</div><div className="mt-2 text-sm">Dosya No: {c.dosya.dosyaNo || '—'} · {c.dosya.suc}</div><div className="mt-1 text-sm">{[c.dosya.il, c.dosya.ilce, c.dosya.mahalle].filter(Boolean).join(' / ')}</div></div>
      <img src="/brand/tubir.png" alt="" className="h-24 object-contain" />
    </div>) })
  // Taraflar
  if (dahil('taraflar')) pages.push({ title: 'Taraflar ve Görevlendirme', body: (
    <div className="text-[12px]">
      <h2 className="my-3 text-center text-base font-bold">{title}</h2>
      <table className="w-full border-collapse"><tbody>
        {labelSet.labels.slice(0, 12).map((l, i) => { const v = c.taraflar[`slot${i + 1}`]; return v ? <tr key={i}><td className="w-56 border border-black px-2 py-0.5 font-bold">{l}</td><td className="border border-black px-2 py-0.5">{String(v)}</td></tr> : null })}
        {[['Bilirkişi Ad Soyadı', c.bilirkisi.ad], ['Uzmanlık Alanı', c.bilirkisi.uzmanlik], ['Bilirkişi Sicil No', c.bilirkisi.sicilNo], ['İnceleme Türü', c.gorevlendirme.incelemeTuru], ['Görevlendirme / Talep Dayanağı', c.gorevlendirme.dayanak], ['İnceleme Konusu', c.gorevlendirme.konu], ['Bilirkişiye Yöneltilen Sorular', c.gorevlendirme.sorular]].map(([l, v]) => v ? <tr key={String(l)}><td className="border border-black px-2 py-0.5 font-bold">{String(l)}</td><td className="border border-black px-2 py-0.5">{String(v)}</td></tr> : null)}
      </tbody></table>
    </div>) })
  // 1. Açıklamalar
  if (dahil('aciklamalar')) pages.push({ title: '1. Açıklamalar', body: <div><h2 className="my-3 text-center text-base font-bold">AÇIKLAMALAR</h2>{legalParagraphs(legalVariant(c.dosya.raporTuru), settings.textOverrides).map((p, i) => <p key={i} className="mb-2 indent-8 text-justify text-[12px] leading-relaxed">{p.trim()}</p>)}</div> })
  // 2. Yer zaman
  if (dahil('yer-zaman')) pages.push({ title: '2. Kazanın Yeri ve Zamanı', body: (
    <table className="w-full text-[12px]"><tbody>
      {[['1.2. TARİH', formatDateTR(c.kazaYeri.tarih)], ['1.3. HAFTANIN GÜNÜ', weekdayTR(c.kazaYeri.tarih)], ['1.4. SAAT/DAKİKA', formatTimeTR(c.kazaYeri.saat)], ['1.5. İL', c.dosya.il], ['1.6. İLÇE', c.dosya.ilce], ['1.7. MAH/KÖY', c.dosya.mahalle], ['1.8. ADRESİ', c.kazaYeri.adres]].map(([l, v]) => <tr key={String(l)}><td className="w-56 border border-black px-2 py-0.5 font-bold">{l}</td><td className="border border-black px-2 py-0.5">{String(v ?? '')}</td></tr>)}
    </tbody></table>) })
  // Kart grupları (grup sırası ORDER; modül bölümleri ilgili grubun ardına gelir)
  const raporKartlari: EvaluatedCard[] = []
  for (const g of ORDER) {
    const grp = groups.find((x) => x.g === g)
    if (grp && dahil(g)) {
      const cards = grp.cards
      const perEntity = cards[0]?.def.perEntity
      const kind = perEntity ? ENTITY_KIND_BY_FACTOR[perEntity] : null
      const ek = ENTITY_KINDS.find((e) => e.kind === kind)
      const idxs = kind ? Array.from(new Set(cards.map((k) => k.entityIndex ?? 0))) : [null]
      for (const idx of idxs) {
        const list = cards.filter((k) => (k.entityIndex ?? 0) === (idx ?? 0) && visible(k) && kartDahil(k))
        raporKartlari.push(...list)
        for (let i = 0; i < list.length; i += 3) {
          pages.push({ title: `${GROUP_TITLES[g]}${idx !== null ? ` — ${ek?.singular} ${idx + 1}` : ''}`, logo: LOGO[g], body: (
            <div className="text-[11px]">
              {i === 0 && <h2 className="my-2 text-center text-sm font-bold">{title}{idx !== null ? ` — ${(ek?.singular ?? '').toLocaleUpperCase('tr-TR')} ${idx + 1}` : ''}</h2>}
              {list.slice(i, i + 3).map((k) => <KartBlok key={k.def.id} k={k} kisa={settings.reportAranmadi === 'kisa' && eqTR(k.result.incelemeDurumu, 'Aranmadı')} showProv={showProv} vurgula={vurgula} />)}
            </div>) })
        }
      }
    }
    // modül bölümleri
    for (const m of etkinModuller) if (m.ReportSection && m.manifest.reportSections?.some((s) => s.after === g) && dahil(modulBolumId(m))) {
      const Sec = m.ReportSection
      pages.push({ title: m.manifest.reportSections[0].title, body: <Sec caseData={c} settings={settings} /> })
    }
  }
  // Sonuç
  if (dahil('sonuc')) pages.push({ title: 'Sonuç', body: (
    <div className="text-[12px]">
      <h2 className="my-3 text-center text-base font-bold">SONUÇ</h2>
      <p className="mb-2">Yapılan incelemede <b>{summary.etken}</b> etken, <b>{summary.incelenmeli}</b> incelenmeli başlık tespit edilmiştir (toplam {summary.count}).</p>
      <table className="w-full border-collapse"><thead><tr><th className="border border-black px-2 py-0.5 text-left">Başlık</th><th className="border border-black px-2 py-0.5 text-left">Durum</th><th className="border border-black px-2 py-0.5 text-left">Müteala</th></tr></thead><tbody>
        {summary.rows.map((r) => <tr key={`${r.factorId}-${r.entityIndex ?? 0}`}><td className="border border-black px-2 py-0.5">{r.title}{r.entityIndex !== null && r.entityIndex !== undefined ? ` (#${r.entityIndex + 1})` : ''}</td><td className="border border-black px-2 py-0.5">{r.durum}</td><td className="border border-black px-2 py-0.5">{r.muteala}</td></tr>)}
      </tbody></table>
      <div className="mt-10 grid grid-cols-2 gap-8 text-center"><div><div className="border-t border-black pt-1">{c.bilirkisi.ad || 'Bilirkişi'}</div><div className="text-[10px]">{c.bilirkisi.uzmanlik} · Sicil {c.bilirkisi.sicilNo}</div></div><div><div className="border-t border-black pt-1">İmza</div></div></div>
      <div className="mt-8 text-[9px] text-gray-700">Bu rapor SERESLER BİLİRKİŞİLİK sistemi ile üretilmiştir. İçerik v{CONTENT_VERSION} · Ayar sürümü {settings.version} (#{c.settingsVersionHash || settings.lastHash}) · Üretim zamanı {new Date(generatedAt).toLocaleString('tr-TR')}.</div>
    </div>) })

  // --- Eksikler: rapora dahil bölümler için doldurulmamış alanlar ---
  const eksikler = eksikleriBul(c, labelSet.labels, dahil, raporKartlari, etkinModuller.filter((m) => dahil(modulBolumId(m))))
  const hataSayisi = eksikler.filter((e) => e.level === 'hata').length

  return (
    <div>
      <PageHeader title="Rapor Önizleme — A4 Belge Modu" subtitle={`${pages.length} sayfa. Excel sayfa sırası: Kapak → Taraflar → 1. → 2. → 3 → 4 → 5 → 6 → 9Y → modüller → Sonuç.`}
        actions={<><Toggle checked={vurgula} onChange={setVurgula} label={<span className="text-xs">Eksikleri vurgula</span>} /><Toggle checked={showProv} onChange={setShowProv} label={<span className="text-xs">Kaynak notları</span>} /><button className="btn-outline" onClick={() => void exportDocx(c, pages.map((p) => p.title), summary, all, settings, { bolumler, haricKartlar: haric })}>DOCX</button><button className="btn-primary" onClick={() => window.print()}>PDF / Yazdır</button></>} />
      <div className="no-print -mt-3 mb-4 flex flex-wrap items-center gap-2">
        {eksikler.length ? <Badge tone={hataSayisi ? 'kirmizi' : 'altin'} title={`${hataSayisi} zorunlu, ${eksikler.length - hataSayisi} öneri`}>{eksikler.length} eksik alan</Badge> : <Badge tone="yesil">Tüm alanlar dolu</Badge>}
        {eksikler.length > 0 && <button className="text-xs text-lacivert underline-offset-2 hover:underline" onClick={() => setPanel('eksikler')}>Eksikleri gör</button>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="no-print kart self-start p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto scroll-thin">
          <Tabs value={panel} onChange={setPanel} tabs={[{ id: 'icerik', label: 'İçerik' }, { id: 'eksikler', label: 'Eksikler', count: eksikler.length }]} />
          {panel === 'icerik' ? (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="etiket">Rapor İçeriği</span>
                <span className="flex gap-1"><button className="btn-outline !px-2 !py-0.5 text-[11px]" onClick={tumunuSec}>Tümünü seç</button><button className="btn-outline !px-2 !py-0.5 text-[11px]" onClick={hicbiriniSecme}>Hiçbirini seçme</button></span>
              </div>
              <ul className="space-y-1 text-sm">
                {SABIT_BOLUMLER.map((b) => <li key={b.id}><BolumKutusu checked={dahil(b.id)} onChange={(v) => setField(`rapor.bolumler.${b.id}`, v)} label={b.label} /></li>)}
                {ORDER.map((g) => {
                  const grp = groups.find((x) => x.g === g)
                  const moduller = etkinModuller.filter((m) => m.manifest.reportSections?.some((s) => s.after === g))
                  if (!grp && !moduller.length) return null
                  return (
                    <li key={g} className="space-y-1">
                      {grp && <GrupSecimi g={g} cards={grp.cards} dahil={dahil(g)} onGrup={(v) => setField(`rapor.bolumler.${g}`, v)} kartDahil={kartDahil} onKart={toggleKart} />}
                      {moduller.map((m) => <BolumKutusu key={m.manifest.id} checked={dahil(modulBolumId(m))} onChange={(v) => setField(`rapor.bolumler.${modulBolumId(m)}`, v)} label={<span>{m.manifest.reportSections![0].title} <Badge tone="cam" className="ml-1">modül</Badge></span>} />)}
                    </li>
                  )
                })}
                <li><BolumKutusu checked={dahil('sonuc')} onChange={(v) => setField('rapor.bolumler.sonuc', v)} label="Sonuç ve imza" /></li>
              </ul>
              <p className="mt-3 text-[11px] text-gri">Seçimler Dosya ile birlikte saklanır; DOCX ve yazdırma aynı içeriği kullanır. Hariç tutulan kart: {haric.size}.</p>
            </div>
          ) : (
            <div className="mt-3">
              {eksikler.length === 0 ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Tüm alanlar dolu.</p> : (
                <>
                  <p className="mb-2 text-[11px] text-gri">{hataSayisi} zorunlu · {eksikler.length - hataSayisi} öneri. Bağlantı ilgili alana götürür.</p>
                  <ul className="space-y-1 text-sm">
                    {eksikler.map((e) => (
                      <li key={e.id} className={cn('flex items-start gap-2 rounded-md px-2 py-1', e.level === 'hata' ? 'bg-red-50' : 'bg-altin-100/60')}>
                        <Badge tone={e.level === 'hata' ? 'kirmizi' : 'altin'} className="mt-0.5 shrink-0">{e.level === 'hata' ? 'Zorunlu' : 'Öneri'}</Badge>
                        <Link to={e.to} className="text-lacivert underline-offset-2 hover:underline">{e.label}</Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </aside>

        <div className="belge min-w-0">
          {pages.map((p, i) => (
            <div key={i} className="a4">
              <ReportHeader pageNo={i + 1} total={pages.length} logo={p.logo} frozenDate={generatedAt} />
              <div className="mt-2 flex items-center justify-between text-[9px] text-gray-600"><span>{p.title}</span><span>{c.dosya.dosyaNo}</span></div>
              {p.body}
              <div className="absolute inset-x-[14mm] bottom-[8mm]"><ReportFooter /></div>
            </div>
          ))}
          {pages.length === 0 && <div className="kart p-8 text-center text-sm text-gri">Hiçbir bölüm seçilmedi. Soldaki "Rapor İçeriği" panelinden bölüm seçin.</div>}
        </div>
      </div>
    </div>
  )
}

/** Rapora dahil bölümlerdeki boş alanları toplar; her satır ilgili sayfaya bağlanır. */
function eksikleriBul(c: CaseData, labels: string[], dahil: (id: string) => boolean, kartlar: EvaluatedCard[], moduller: ModuleDefinition[]): Eksik[] {
  const out: Eksik[] = []
  const ekle = (id: string, level: Eksik['level'], label: string, to: string, v: unknown) => { if (bos(v)) out.push({ id, level, label, to }) }
  if (dahil('kapak') || dahil('taraflar') || dahil('yer-zaman')) {
    ekle('dosya.dosyaNo', 'hata', 'Dosya no', '/dosya/giris', c.dosya.dosyaNo)
    ekle('dosya.mahkemeAdi', 'hata', 'Mahkeme adı', '/dosya/giris', c.dosya.mahkemeAdi)
    ekle('dosya.il', 'hata', 'İl', '/dosya/giris', c.dosya.il)
    ekle('dosya.ilce', 'uyari', 'İlçe', '/dosya/giris', c.dosya.ilce)
    ekle('dosya.suc', 'uyari', 'Suç / kaza türü', '/dosya/giris', c.dosya.suc)
  }
  if (dahil('yer-zaman')) {
    ekle('kazaYeri.tarih', 'hata', 'Kaza tarihi', '/dosya/veri#kazaYeri.tarih', c.kazaYeri.tarih)
    ekle('kazaYeri.saat', 'hata', 'Kaza saati', '/dosya/veri#kazaYeri.saat', c.kazaYeri.saat)
    ekle('kazaYeri.adres', 'uyari', 'Kaza adresi', '/dosya/veri#kazaYeri.adres', c.kazaYeri.adres)
  }
  if (dahil('taraflar')) {
    labels.slice(0, 6).forEach((l, i) => ekle(`taraflar.slot${i + 1}`, 'uyari', `Taraf: ${l.trim()}`, `/dosya/veri#taraflar.slot${i + 1}`, c.taraflar[`slot${i + 1}`]))
  }
  if (dahil('taraflar') || dahil('sonuc')) {
    ekle('bilirkisi.ad', 'hata', 'Bilirkişi adı', '/dosya/veri#bilirkisi.ad', c.bilirkisi.ad)
    ekle('bilirkisi.uzmanlik', 'uyari', 'Bilirkişi uzmanlık alanı', '/dosya/veri#bilirkisi.uzmanlik', c.bilirkisi.uzmanlik)
    ekle('bilirkisi.sicilNo', 'uyari', 'Bilirkişi sicil no', '/dosya/veri#bilirkisi.sicilNo', c.bilirkisi.sicilNo)
  }
  for (const k of kartlar) {
    const ad = `${k.def.displayCode ? k.def.displayCode + ' ' : ''}${k.def.title}${k.entityIndex !== null ? ` — ${ENTITY_KINDS.find((e) => e.factorKind === k.def.perEntity)?.singular ?? ''} ${k.entityIndex + 1}` : ''}`
    const key = keyOf(k.def.id, k.entityIndex), to = kartRotasi(k), e = k.entry, r = k.result
    ekle(`${key}:inceleme`, 'hata', `${ad}: İnceleme Durumu`, to, r.incelemeDurumu)
    if (r.durum === 'ETKEN' || r.durum === 'İNCELENMELİ') ekle(`${key}:muteala`, 'hata', `${ad}: Müteala (${r.durum})`, to, e?.muteala)
    if (!(e?.tespit?.yontemler ?? []).some(Boolean)) out.push({ id: `${key}:tespit`, level: 'uyari', label: `${ad}: Tespit yöntemi`, to })
    ekle(`${key}:sorumlu`, 'uyari', `${ad}: Sorumlu`, to, e?.sorumlu)
  }
  for (const m of moduller) {
    if (m.manifest.id === 'gunes-etkenligi') {
      const md = (c.modules['gunes-etkenligi'] ?? {}) as { konum?: { lat?: number; lon?: number } }
      const konum = md.konum?.lat !== undefined ? md.konum : c.kazaYeri.konum
      if (!konum || konum.lat === undefined || konum.lon === undefined) out.push({ id: 'gunes:konum', level: 'hata', label: 'Güneş modülü: kaza konumu (enlem/boylam)', to: '/modul/gunes/vaka' })
      c.araclar.forEach((a, i) => { if (parseNumberTR(a.seyirYonu) === undefined) out.push({ id: `gunes:heading${i}`, level: 'hata', label: `Güneş modülü: Araç ${i + 1} seyir yönü (heading)`, to: '/modul/gunes/vaka' }) })
    }
    if (m.manifest.id === 'kacinma-mutalaa') {
      const md = (c.modules['kacinma-mutalaa'] ?? {}) as { suruculer?: { aldigiYol?: unknown; yolunZamani?: unknown; temelKusurPuani?: unknown }[] }
      c.suruculer.forEach((_, i) => {
        const s = md.suruculer?.[i] ?? {}
        ekle(`kacinma:y${i}`, 'hata', `Kaçınma: Sürücü ${i + 1} aldığı yol (y)`, '/modul/kacinma', s.aldigiYol)
        ekle(`kacinma:t${i}`, 'hata', `Kaçınma: Sürücü ${i + 1} yolun zamanı (t)`, '/modul/kacinma', s.yolunZamani)
        ekle(`kacinma:kusur${i}`, 'hata', `Kaçınma: Sürücü ${i + 1} temel kusur puanı`, '/modul/kacinma', s.temelKusurPuani)
      })
    }
  }
  return out
}

function BolumKutusu({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
  return <label className="flex items-start gap-2 rounded px-1 py-0.5 hover:bg-krem"><input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span className={cn(!checked && 'text-gri line-through')}>{label}</span></label>
}

/** Etken grubu: grup onay kutusu + açılır kart listesi (varlık başına). */
function GrupSecimi({ g, cards, dahil, onGrup, kartDahil, onKart }: { g: string; cards: EvaluatedCard[]; dahil: boolean; onGrup: (v: boolean) => void; kartDahil: (k: EvaluatedCard) => boolean; onKart: (k: EvaluatedCard, on: boolean) => void }) {
  const secili = cards.filter(kartDahil).length
  return (
    <details className="group">
      <summary className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-krem [&::-webkit-details-marker]:hidden">
        <input type="checkbox" className="mt-1" checked={dahil} onChange={(e) => onGrup(e.target.checked)} onClick={(e) => e.stopPropagation()} />
        <span className={cn('flex-1', !dahil && 'text-gri line-through')}>{GROUP_TITLES[g] ?? g}</span>
        <span className="text-[11px] text-gri">{secili}/{cards.length} <span className="inline-block transition-transform group-open:rotate-90">▸</span></span>
      </summary>
      <ul className="ml-6 mt-1 space-y-0.5 border-l border-krem-200 pl-2 text-xs">
        {cards.map((k) => {
          const ek = ENTITY_KINDS.find((e) => e.factorKind === k.def.perEntity)
          return <li key={keyOf(k.def.id, k.entityIndex)}><BolumKutusu checked={dahil && kartDahil(k)} onChange={(v) => onKart(k, v)} label={<>{k.def.displayCode && <span className="font-mono text-gri">{k.def.displayCode} </span>}{k.def.title}{k.entityIndex !== null && <span className="text-gri"> — {ek?.singular} {k.entityIndex + 1}</span>}</>} /></li>
        })}
      </ul>
    </details>
  )
}

function KartBlok({ k, kisa, showProv, vurgula }: { k: EvaluatedCard; kisa: boolean; showProv: boolean; vurgula: boolean }) {
  const r = k.result, d = k.def, e = k.entry
  // Eksik alan vurgusu: ekranda sarı arka plan, yazdırmada arka plan kalkar ama metin kalır
  const incelemeBos = !r.incelemeDurumu
  const mutealaBos = (r.durum === 'ETKEN' || r.durum === 'İNCELENMELİ') && !e?.muteala
  const eksikSinif = 'bg-amber-100 text-amber-900 print:bg-transparent print:text-inherit'
  return (
    <div className="mb-3 break-inside-avoid border border-black">
      <div className="flex items-center justify-between bg-gray-100 px-2 py-0.5"><b>{d.title}</b><span className="flex items-center gap-2">{r.ekDosyaBayragi && <span className="text-[10px]">{r.ekDosyaBayragi}</span>}<StatusChip value={r.durum} defined={r.durumDefined} size="sm" /></span></div>
      <table className="w-full"><tbody>
        <tr><td className="w-32 border-t border-black px-2 py-0.5 font-bold">{d.subTitle || 'Değer'}</td><td className="border-t border-black px-2 py-0.5">{r.valueText}</td><td className="w-40 border-t border-l border-black px-2 py-0.5 font-bold">Kazada Durumu</td><td className="border-t border-black px-2 py-0.5">{r.kazadaDurumu}</td></tr>
        <tr><td className="border-t border-black px-2 py-0.5 font-bold">İnceleme Durumu</td><td className={cn('border-t border-black px-2 py-0.5', vurgula && incelemeBos && eksikSinif)}>{vurgula && incelemeBos ? '— doldurulmadı —' : r.incelemeDurumu}</td><td className="border-t border-l border-black px-2 py-0.5 font-bold">Durum</td><td className="border-t border-black px-2 py-0.5">{r.durumDefined ? r.durum : '⚠ Kural tanımsız'}</td></tr>
        {!kisa && <>
          {r.aciklama && <tr><td className="border-t border-black px-2 py-0.5 font-bold">Açıklama</td><td colSpan={3} className="border-t border-black px-2 py-0.5 text-justify">{r.aciklama}</td></tr>}
          {r.nedensellik && <tr><td className="border-t border-black px-2 py-0.5 font-bold">Nedensellik</td><td colSpan={3} className="border-t border-black px-2 py-0.5 text-justify">{r.nedensellik}</td></tr>}
          {e?.muteala && <tr><td className="border-t border-black px-2 py-0.5 font-bold">Müteala</td><td colSpan={3} className="border-t border-black px-2 py-0.5 whitespace-pre-wrap">{e.muteala}</td></tr>}
          {vurgula && mutealaBos && <tr><td className="border-t border-black px-2 py-0.5 font-bold">Müteala</td><td colSpan={3} className={cn('border-t border-black px-2 py-0.5', eksikSinif)}>— doldurulmadı —</td></tr>}
          {r.sorunAciklama && <tr><td className="border-t border-black px-2 py-0.5 font-bold">Sorun açıklama</td><td colSpan={3} className="border-t border-black px-2 py-0.5">{r.sorunAciklama}</td></tr>}
          <tr><td className="border-t border-black px-2 py-0.5 font-bold">Tespit Yöntemi</td><td className="border-t border-black px-2 py-0.5">{(e?.tespit?.yontemler ?? []).filter(Boolean).join(', ')} {e?.tespit?.delilKodu && <>· Delil Kodu <b>{e.tespit.delilKodu}</b></>} {e?.tespit?.puanlar?.filter((p) => p !== null && p !== undefined).length ? `· Puan ${e.tespit.puanlar.join('/')}` : ''} {e?.tespit?.dogrulama && `· ${e.tespit.dogrulama}`}</td><td className="border-t border-l border-black px-2 py-0.5 font-bold">Sorumlu</td><td className="border-t border-black px-2 py-0.5">{e?.sorumlu} {e?.hakimSavciTespit && <span className="text-[10px]">· {e.hakimSavciTespit}</span>}</td></tr>
        </>}
        {showProv && <tr><td colSpan={4} className="border-t border-black px-2 py-0.5 text-[9px] text-gray-600">{r.provenance.map((p) => `${p.step}: ${p.detail}${p.source ? ` [${p.source}]` : ''}`).join(' · ')}</td></tr>}
      </tbody></table>
    </div>
  )
}

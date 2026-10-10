import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSettingsStore, DEFAULT_SETTINGS, type Settings, type EvidenceOverrides } from '@/store/settingsStore'
import { ALL_FACTORS, FACTOR_BY_ID, GROUP_TITLES, GROUP_ORDER, LISTS, STATUS_PROFILES, STATUS_PROFILE_BY_ID, STATUS_INPUTS, CONSTANTS, EVIDENCE_CODES, LEGAL_TEXTS, REPORT_META, CONTENT_VERSION, effectiveEvidenceCodes, packageEvidenceCodes, evidenceGroupOf, effectiveProfileList, type EvidenceCode } from '@/content'
import { MODULES, MODULE_DEFS, validateRegistry } from '@/modules/registry'
import { INCONSISTENCIES } from '@/data/inconsistencies'
import { PageHeader, Tabs, Field, TextInput, TextArea, Toggle, Badge, Select, Segmented } from '@/ui/primitives'
import { StatusChip } from '@/ui/StatusChip'
import { download } from '@/lib/io'
import { INCELEME_DURUMLARI, type FactorDef } from '@/engine/types'
import { countsForSummary } from '@/engine/status'
import { PACKAGE_ORDER } from '@/engine/selectors'
import { adminLogin, pullCentralSettings, pushCentralSettings } from '@/lib/central'
import { useAuthStore } from '@/store/authStore'
import inputFields from '@content/core/input-fields.json'

const INPUT_LABELS: Record<string, string> = Object.fromEntries((inputFields.grs1 as { path: string; label: string }[]).map((f) => [f.path, f.label]))

const SECTIONS = [
  { id: 'genel', label: 'Genel' }, { id: 'bilgi-bankasi', label: 'Bilgi Bankası' }, { id: 'listeler', label: 'Listeler' }, { id: 'kurallar', label: 'Kural Profilleri' }, { id: 'katsayilar', label: 'Katsayılar ve Sabitler' },
  { id: 'referans', label: 'Referans Veriler' }, { id: 'delil', label: 'Delil Kodları' }, { id: 'hukuki', label: 'Hukuki Metinler' }, { id: 'meta', label: 'Rapor Meta ve Kimlik' },
  { id: 'numaralandirma', label: 'Numaralandırma' }, { id: 'moduller', label: 'Modüller' }, { id: 'surum', label: 'Sürüm Geçmişi' }, { id: 'tutarsizlik', label: 'Tutarsızlık Raporu' },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

export function AyarlarPage() {
  const { section } = useParams()
  const navigate = useNavigate()
  const { settings, update, commitVersion, reset, adminToken, setAdminToken, importSettings } = useSettingsStore()
  const [pass, setPass] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const tab = (SECTIONS.find((s) => s.id === section)?.id ?? 'bilgi-bankasi') as SectionId
  // Yönetici rolüyle oturum açılmışsa parola ekranı atlanır; adminToken oturum token'ından beslenir.
  const authUser = useAuthStore((s) => s.user)
  const isAdminUser = authUser?.role === 'admin'
  useEffect(() => { if (isAdminUser && !adminToken && authUser) setAdminToken(authUser.token) }, [isAdminUser, adminToken, authUser, setAdminToken])
  const unlocked = !!adminToken || isAdminUser
  const token = adminToken ?? authUser?.token ?? ''

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Ayarlar — Yönetici" subtitle="Bilgi bankası, listeler, kurallar, katsayılar ve referans veriler yalnızca yönetici tarafından değiştirilir. Bilirkişi bu alana erişmez." />
        <div className="kart p-6">
          <Field label="Yönetici parolası" hint="Demo: Netlify ortam değişkeni ADMIN_PASSCODE ile doğrulanır; çevrimdışı demo için 'seres' parolası yerel modda kabul edilir."><TextInput type="password" value={pass} onChange={setPass} onKeyDown={(e) => { if (e.key === 'Enter') void adminLogin(pass).then((t) => t ? setAdminToken(t) : setMsg('Parola hatalı.')) }} /></Field>
          <button className="btn-primary mt-3" onClick={() => void adminLogin(pass).then((t) => t ? setAdminToken(t) : setMsg('Parola hatalı.'))}>Giriş</button>
          {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
        </div>
      </div>
    )
  }

  const save = async () => { const h = await commitVersion(note || 'Ayar güncellemesi'); setNote(''); setMsg(`Sürüm kaydedildi: v${useSettingsStore.getState().settings.version} #${h}`) }
  const push = async () => { const ok = await pushCentralSettings(settings, token); setMsg(ok ? 'Merkezi ayarlar (Netlify Blobs) güncellendi.' : 'Merkezi kayıt başarısız (çevrimdışı veya yetkisiz).') }
  const pull = async () => { const s = await pullCentralSettings(); if (s) { importSettings(s); setMsg('Merkezi ayarlar alındı.') } else setMsg('Merkezi ayar bulunamadı.') }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Ayarlar — Yönetici Paneli" subtitle={`İçerik v${CONTENT_VERSION} · ayar sürümü v${settings.version} · hash #${settings.lastHash}. Üç katman: paket varsayılanı → merkezi (Netlify Blobs) → yerel.`}
        actions={<>
          <TextInput value={note} onChange={setNote} placeholder="Değişiklik notu" className="!w-56" />
          <button className="btn-primary" onClick={() => void save()}>Sürüm kaydet</button>
          <button className="btn-outline" onClick={() => void push()}>Merkeze gönder</button>
          <button className="btn-outline" onClick={() => void pull()}>Merkezden al</button>
          <button className="btn-ghost" onClick={() => download('seres-ayarlar.json', new Blob([JSON.stringify(settings, null, 1)], { type: 'application/json' }))}>Dışa aktar</button>
          <label className="btn-ghost cursor-pointer">İçe aktar<input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.text().then((t) => { try { importSettings(JSON.parse(t)); setMsg('Ayarlar içe aktarıldı.') } catch { setMsg('Geçersiz dosya.') } }) }} /></label>
          <button className="btn-ghost text-xs" onClick={() => setAdminToken(null)}>Çıkış</button>
        </>} />
      {msg && <div className="mb-3 rounded-lg bg-camgobegi-100 px-3 py-2 text-sm text-lacivert">{msg}</div>}
      <Tabs tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))} value={tab} onChange={(t) => navigate(`/ayarlar/${t}`)} />
      <div className="mt-4">
        {tab === 'genel' && <Genel settings={settings} update={update} />}
        {tab === 'bilgi-bankasi' && <BilgiBankasi settings={settings} update={update} />}
        {tab === 'listeler' && <Listeler settings={settings} update={update} />}
        {tab === 'kurallar' && <Kurallar settings={settings} update={update} />}
        {tab === 'katsayilar' && <Katsayilar settings={settings} update={update} />}
        {tab === 'referans' && <Referans />}
        {tab === 'delil' && <Delil settings={settings} update={update} />}
        {tab === 'hukuki' && <Hukuki settings={settings} update={update} />}
        {tab === 'meta' && <Meta settings={settings} update={update} />}
        {tab === 'numaralandirma' && <Numaralandirma settings={settings} update={update} />}
        {tab === 'moduller' && <Moduller settings={settings} update={update} />}
        {tab === 'surum' && <Surum settings={settings} reset={reset} />}
        {tab === 'tutarsizlik' && <Tutarsizlik settings={settings} update={update} />}
      </div>
    </div>
  )
}

type P = { settings: Settings; update: (p: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => void }

/* ───────────── Genel: motor, kapsam, rapor ve görünüm anahtarları ───────────── */

function Genel({ settings, update }: P) {
  const profiles = effectiveProfileList(settings)
  const e = settings.engine
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="kart space-y-3 p-4">
        <h3 className="font-semibold text-lacivert">Motor</h3>
        <div><div className="etiket mb-1">Metin birleştirme</div><Segmented options={['excel', 'okunur'] as const} value={e.renderMode} onChange={(v) => v && update({ engine: { ...e, renderMode: v } })} labels={{ excel: 'Excel (boşluksuz birleştirme)', okunur: 'Okunur mod' }} /><p className="mt-1 text-[11px] text-gri">Kazada Durumu ve parça metinleri Excel gibi (boşluksuz) ya da okunur biçimde birleştirilir (tutarsızlık KAZADA-BOSLUK).</p></div>
        <Field label="Durum profili ön ayarı" hint="Boş: her etken kendi profilini kullanır (Excel uyumlu, sayfa bazlı). Bir profil seçilirse tüm kartlar o profille değerlendirilir.">
          <Select options={profiles.map((p) => ({ value: p.id, label: p.id === 'birlesik' ? 'birlesik — birleştirilmiş kural (onay bekler)' : p.id }))} value={e.statusProfileOverride ?? ''} onChange={(v) => update({ engine: { ...e, statusProfileOverride: v || null } })} placeholder="— etkenin kendi profili (Excel uyumlu) —" />
        </Field>
        <Toggle checked={e.vlookupExactAlways} onChange={(v) => update({ engine: { ...e, vlookupExactAlways: v } })} label="Seçenek tablolarında daima tam eşleşme (VLOOKUP exact)" />
      </div>
      <div className="kart space-y-3 p-4">
        <h3 className="font-semibold text-lacivert">Sonuç özeti ve varlıklar</h3>
        <div><div className="etiket mb-1">Sonuç özeti kapsamı</div><Segmented options={['excel', 'all'] as const} value={settings.summaryScope} onChange={(v) => v && update({ summaryScope: v })} labels={{ excel: 'Excel uyumlu (yalnız 2. Yol ve Çevre)', all: 'Tüm gruplar' }} /><p className="mt-1 text-[11px] text-gri">ETKEN / İNCELENMELİ sayaçlarının hangi gruplardan toplandığını belirler (sonuç1 sayfası karşılığı).</p></div>
        <Field label="Varlık üst sınırı (araç / sürücü / yaya / yolcu)"><TextInput type="number" min={1} max={20} value={settings.entityLimit} onChange={(v) => update({ entityLimit: Math.max(1, Number(v) || 6) })} className="!w-24" /></Field>
      </div>
      <div className="kart space-y-3 p-4">
        <h3 className="font-semibold text-lacivert">Rapor</h3>
        <div><div className="etiket mb-1">"Aranmadı" kartları raporda</div><Segmented options={['tam', 'kisa', 'gizle'] as const} value={settings.reportAranmadi} onChange={(v) => v && update({ reportAranmadi: v })} labels={{ tam: 'Tam göster', kisa: 'Kısa satır', gizle: 'Gizle' }} /></div>
        <Toggle checked={settings.reportShowDrafts} onChange={(v) => update({ reportShowDrafts: v })} label="Taslak kartları raporda göster" />
      </div>
      <div className="kart space-y-3 p-4">
        <h3 className="font-semibold text-lacivert">Görünüm</h3>
        <Toggle checked={settings.showDrafts} onChange={(v) => update({ showDrafts: v })} label="Taslak etken gruplarını (6., 7., 10., 11., dorse, 8.11+, 9.9+) navigasyonda göster" />
        <Toggle checked={settings.showExcelRefs} onChange={(v) => update({ showExcelRefs: v })} label="Excel kaynak izlerini göster (sayfa adları, hücre referansları)" />
        <p className="text-[11px] text-gri">Numaralandırma şeması ayrı sekmede; düzeltme anahtarları Katsayılar ve Tutarsızlık Raporu sekmelerinde.</p>
      </div>
    </div>
  )
}

/* ───────────── Bilgi Bankası: rehber, etken editörü, etki alanı, değişiklik günlüğü ───────────── */

const REHBER: { alan: string; ne: string; etki: string; yer: string[] }[] = [
  { alan: 'Başlık / Alt başlık', ne: 'Etkenin adı ("2.1. GÜN DURUMU") ve değer etiketi ("Gün/Gece Durumu:").', etki: 'Kart başlığı ve değer etiketi; rapor kart başlığı; sonuç özeti satırı; menüdeki etken çipi.', yer: ['Kart', 'Rapor', 'Sonuç özeti', 'Menü'] },
  { alan: 'Görünen numara', ne: 'Numaralandırma şeması "Özel" iken kullanılan kod.', etki: 'Kart başlığı önündeki kod, rapor ve DOCX başlıkları.', yer: ['Kart', 'Rapor'] },
  { alan: 'Aranan', ne: 'Etkende neyin arandığını anlatan kısa cümle.', etki: 'Kart üst satırı (başlığın altı) ve rapor kart bloğu.', yer: ['Kart', 'Rapor'] },
  { alan: 'Değer kaynağı', ne: 'Değer Veri Girişi alanından mı (input: Grş 1 hücresi) kart üstündeki seçimden mi (cardSelect) gelir; cardSelect için seçenek listesi.', etki: 'Kart değer alanı (bağlantı ya da seçim kutusu), Kazada Durumu cümlesindeki değer, seçeneğe özel metinlerin anahtarı; Bağ haritasında girdi → kart oku.', yer: ['Kart', 'Rapor', 'Bağ haritası'] },
  { alan: 'Seçenekler', ne: 'Seçilebilir değerler ve her seçeneğe özel Açıklama / Nedensellik metni (VLOOKUP tablosu).', etki: 'Kart seçim kutusu; seçeneğe göre Açıklama ve Nedensellik gövdesi.', yer: ['Kart', 'Rapor'] },
  { alan: 'Açıklama / Nedensellik / Sorun açıklama', ne: 'Etken düzeyi sabit metinler (seçeneğe özel değilse).', etki: 'Kart gövdesi ("Açıklama ve Nedensellik", "Sorun açıklama") ve rapor kart bloğu.', yer: ['Kart', 'Rapor'] },
  { alan: 'Sonuç / Sorumlular / Tespit yöntemi metni', ne: 'Kütüphanedeki ek metin alanları (fields.sonuc, sorumlular, tespitYontemi).', etki: 'Raporda kartın ek satırları; kartta ek bloklar.', yer: ['Kart', 'Rapor'] },
  { alan: 'Önlem metni / Uygunluk metni', ne: 'Kazada Durumu cümlesinin parçaları.', etki: 'İnceleme Durumu Aranmadı/Var → uygunluk metni; aksi → değer + önlem metni ("Şafak Vakti" + "Yönetmeliğe uygun…").', yer: ['Kart', 'Rapor'] },
  { alan: 'Ek dosya kodu / metni / gizleme kuralı', ne: 'Kart üst şeridindeki "📎 Ek dosya hazırla" rozetinin metni ve hangi durumlarda gizleneceği; koşulun baktığı alan (İnceleme Durumu / Sorumlu / Değer).', etki: 'Kart üst şerit rozeti ve Ekler alanına bağlantı.', yer: ['Kart'] },
  { alan: 'Durum profili', ne: 'İnceleme Durumu → ETKEN / ETKEN DEĞİL / İNCELENMELİ eşlemesi (Kural Profilleri sekmesi).', etki: 'Kart durum çipi, rapor durumu; ETKEN ve İNCELENMELİ sayaçlarını belirler.', yer: ['Kart', 'Rapor', 'Sonuç özeti'] },
  { alan: 'Varlık türü', ne: 'Kartın hangi varlık (araç, sürücü, yolcu, yaya) için tekrarlandığı.', etki: 'Her varlık için ayrı kart ve rapor sayfası; menü sekmeleri (1. Araç, 2. Araç…).', yer: ['Kart', 'Rapor', 'Menü'] },
  { alan: 'Grup / Sıra', ne: 'Etkenin bölümü (2. Yol ve Çevre, 4. Araç…) ve grup içindeki sırası.', etki: 'Grup sayfasındaki kart sırası, rapor bölümü ve sırası.', yer: ['Kart', 'Rapor', 'Menü'] },
  { alan: 'Raporda göster', ne: 'Kart rapor ve DOCX çıktısına girer mi.', etki: 'Rapor Önizleme ve DOCX; kapalıysa kart yalnız analiz ekranında kalır.', yer: ['Rapor', 'DOCX'] },
  { alan: 'Taslak', ne: 'Excel rapor sayfalarında olmayan kütüphane başlığı.', etki: 'Yalnız "Taslakları göster" açıkken menü ve analizde; "Taslak kartları raporda göster" açıkken raporda.', yer: ['Menü', 'Kart', 'Rapor'] },
]

const FIELD_LABELS: Record<'aciklama' | 'nedensellik' | 'sorun' | 'sonuc' | 'sorumlular' | 'tespitYontemi', string> = { aciklama: 'Açıklama', nedensellik: 'Nedensellik', sorun: 'Sorun açıklama', sonuc: 'Sonuç', sorumlular: 'Sorumlular', tespitYontemi: 'Tespit yöntemi (genel metin)' }

function short(v: unknown, n = 70): string {
  if (v === undefined) return '—'
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

interface LogRow { kaynak: string; alan: string; eski: string; yeni: string; undo: () => void }

/** Tüm geçersiz kılma katmanlarını satır satır listeler. */
function buildChangeLog(settings: Settings, update: P['update']): LogRow[] {
  const rows: LogRow[] = []
  const lt = LEGAL_TEXTS as { blocks: { paragraphs: string[] }[] }
  const meta = REPORT_META as unknown as Record<string, string>
  for (const [id, ov] of Object.entries(settings.contentOverrides)) {
    const base = FACTOR_BY_ID.get(id) as unknown as Record<string, unknown> | undefined
    for (const key of Object.keys(ov)) {
      rows.push({ kaynak: 'Etken', alan: `${id} › ${key}`, eski: short(base?.[key]), yeni: short((ov as Record<string, unknown>)[key]), undo: () => update((s) => { const o = { ...s.contentOverrides }; const f = { ...o[id] } as Record<string, unknown>; delete f[key]; if (Object.keys(f).length) o[id] = f as Partial<FactorDef>; else delete o[id]; return { contentOverrides: o } }) })
    }
  }
  for (const [id, items] of Object.entries(settings.listOverrides)) {
    rows.push({ kaynak: 'Liste', alan: id, eski: short(LISTS[id]?.items.map(String).join(' | ')), yeni: short(items.join(' | ')), undo: () => update((s) => { const o = { ...s.listOverrides }; delete o[id]; return { listOverrides: o } }) })
  }
  for (const [key, text] of Object.entries(settings.textOverrides)) {
    const m = /^legal\.(\d+)\.(\d+)$/.exec(key)
    const def = m ? lt.blocks[Number(m[1]) === 0 ? 1 : 0]?.paragraphs[Number(m[2])] : undefined
    rows.push({ kaynak: 'Hukuki metin', alan: key, eski: short(def), yeni: short(text), undo: () => update((s) => { const o = { ...s.textOverrides }; delete o[key]; return { textOverrides: o } }) })
  }
  for (const [key, text] of Object.entries(settings.reportMetaOverrides)) {
    rows.push({ kaynak: 'Rapor meta', alan: key, eski: short(meta[key]), yeni: short(text), undo: () => update((s) => { const o = { ...s.reportMetaOverrides }; delete o[key]; return { reportMetaOverrides: o } }) })
  }
  const pkg = new Map(packageEvidenceCodes().map((c) => [c.kod, c]))
  const ev = settings.evidenceOverrides
  for (const a of ev.added) rows.push({ kaynak: 'Delil kodu', alan: `${a.kod} (yeni)`, eski: '—', yeni: short(`${a.kod} — ${a.ad}`), undo: () => update((s) => ({ evidenceOverrides: { ...s.evidenceOverrides, added: s.evidenceOverrides.added.filter((x) => x.kod !== a.kod) } })) })
  for (const [kod, e] of Object.entries(ev.edited)) {
    const p = pkg.get(kod)
    for (const k of Object.keys(e) as ('ad' | 'not' | 'grup')[]) rows.push({ kaynak: 'Delil kodu', alan: `${kod} › ${k}`, eski: short(p?.[k]), yeni: short(e[k]), undo: () => update((s) => { const ed = { ...s.evidenceOverrides.edited }; const f = { ...ed[kod] }; delete f[k]; if (Object.keys(f).length) ed[kod] = f; else delete ed[kod]; return { evidenceOverrides: { ...s.evidenceOverrides, edited: ed } } }) })
  }
  for (const kod of ev.removed) rows.push({ kaynak: 'Delil kodu', alan: `${kod}`, eski: 'görünür', yeni: 'gizli', undo: () => update((s) => ({ evidenceOverrides: { ...s.evidenceOverrides, removed: s.evidenceOverrides.removed.filter((x) => x !== kod) } })) })
  for (const [pid, o] of Object.entries(settings.profileOverrides)) {
    const base = STATUS_PROFILE_BY_ID.get(pid)
    if (!base) { rows.push({ kaynak: 'Kural profili', alan: `${pid} (yeni profil)`, eski: '—', yeni: `kopya: ${o.copiedFrom ?? '?'} · ${Object.keys(o.mapping ?? {}).length} anahtar`, undo: () => update((s) => { const p = { ...s.profileOverrides }; delete p[pid]; return { profileOverrides: p } }) }); continue }
    for (const [k, v] of Object.entries(o.mapping ?? {})) rows.push({ kaynak: 'Kural profili', alan: `${pid} › ${k || '(boş)'}`, eski: base.mapping[k] ?? '⚠ tanımsız', yeni: v === 'FALSE' ? '⚠ tanımsız' : v || '""', undo: () => update((s) => { const p = { ...s.profileOverrides }; const m = { ...(p[pid]?.mapping ?? {}) }; delete m[k]; const next = { ...p[pid], mapping: m }; if (!Object.keys(m).length) delete (next as { mapping?: unknown }).mapping; if (!Object.keys(next).length) delete p[pid]; else p[pid] = next; return { profileOverrides: p } }) })
    if (o.else !== undefined) rows.push({ kaynak: 'Kural profili', alan: `${pid} › aksi`, eski: base.else === 'FALSE' ? '⚠ tanımsız' : base.else || '""', yeni: o.else === 'FALSE' ? '⚠ tanımsız' : o.else || '""', undo: () => update((s) => { const p = { ...s.profileOverrides }; const next = { ...p[pid] }; delete next.else; if (!Object.keys(next).length) delete p[pid]; else p[pid] = next; return { profileOverrides: p } }) })
  }
  return rows
}

function BilgiBankasi({ settings, update }: P) {
  const [sub, setSub] = useState<'editor' | 'gunluk'>('editor')
  const [rehber, setRehber] = useState(false)
  const log = useMemo(() => buildChangeLog(settings, update), [settings, update])
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented options={['editor', 'gunluk'] as const} value={sub} onChange={(v) => v && setSub(v)} labels={{ editor: 'Etken editörü', gunluk: `Değişiklik günlüğü (${log.length})` }} />
        <button className="btn-outline !py-1 text-xs" onClick={() => setRehber((v) => !v)}>{rehber ? 'Rehberi kapat' : 'Rehber: alanlar ve etkileri'}</button>
      </div>
      {rehber && (
        <div className="kart overflow-hidden">
          <table className="w-full text-xs"><thead className="bg-krem text-left uppercase tracking-wider text-gri"><tr><th className="px-3 py-2">Alan</th><th className="px-3 py-2">Ne</th><th className="px-3 py-2">Neyi etkiler</th><th className="px-3 py-2">Nerede görünür</th></tr></thead><tbody>
            {REHBER.map((r) => <tr key={r.alan} className="border-t border-krem-200 align-top"><td className="px-3 py-2 font-medium text-lacivert">{r.alan}</td><td className="px-3 py-2 text-gri">{r.ne}</td><td className="px-3 py-2">{r.etki}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-1">{r.yer.map((y) => <Badge key={y} tone={y === 'Kart' ? 'cam' : y === 'Rapor' || y === 'DOCX' ? 'lacivert' : y === 'Sonuç özeti' ? 'altin' : 'gri'}>{y}</Badge>)}</div></td></tr>)}
          </tbody></table>
        </div>
      )}
      {sub === 'editor' ? <EtkenEditoru settings={settings} update={update} /> : <DegisiklikGunlugu rows={log} />}
    </div>
  )
}

function DegisiklikGunlugu({ rows }: { rows: LogRow[] }) {
  if (!rows.length) return <div className="kart p-6 text-sm text-gri">Yerel katmanda değişiklik yok; tüm alanlar paket varsayılanında.</div>
  return (
    <div className="kart overflow-hidden">
      <table className="w-full text-xs"><thead className="bg-krem text-left uppercase tracking-wider text-gri"><tr><th className="px-3 py-2">Kaynak</th><th className="px-3 py-2">Alan</th><th className="px-3 py-2">Varsayılan</th><th className="px-3 py-2">Yeni değer</th><th className="px-3 py-2"></th></tr></thead><tbody>
        {rows.map((r, i) => <tr key={i} className="border-t border-krem-200 align-top"><td className="px-3 py-1.5"><Badge tone="gri">{r.kaynak}</Badge></td><td className="px-3 py-1.5 font-mono">{r.alan}</td><td className="px-3 py-1.5 text-gri">{r.eski}</td><td className="px-3 py-1.5 text-lacivert">{r.yeni}</td><td className="px-3 py-1.5 text-right"><button className="btn-ghost !py-0.5 text-xs" onClick={r.undo}>Geri al</button></td></tr>)}
      </tbody></table>
    </div>
  )
}

function EtkenEditoru({ settings, update }: P) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string>('yol-cevre')
  const [sel, setSel] = useState<string | null>(null)
  const factors = useMemo(() => ALL_FACTORS.filter((f) => f.group === group && (!q || f.title.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')))), [group, q])
  const def = sel ? ALL_FACTORS.find((f) => f.id === sel) : null
  const ov = (sel && settings.contentOverrides[sel]) || {}
  const eff = def ? ({ ...def, ...ov } as FactorDef) : null
  const profiles = effectiveProfileList(settings)
  const setOv = (patch: Partial<FactorDef>) => sel && update((s) => ({ contentOverrides: { ...s.contentOverrides, [sel]: { ...s.contentOverrides[sel], ...patch } } }))
  const setText = (key: string, text: string) => eff && setOv({ fields: { ...eff.fields, [key]: { ...(eff.fields as Record<string, { kind: string }>)[key], kind: 'text', text } } as FactorDef['fields'] })
  const toggleAll = (on: boolean) => update((s) => ({ contentOverrides: { ...s.contentOverrides, ...Object.fromEntries(ALL_FACTORS.filter((f) => f.draft).map((f) => [f.id, { ...s.contentOverrides[f.id], showInReport: on }])) }, showDrafts: on }))
  const vs = eff ? (eff.valueSource as { kind: string; path?: string; cell?: string; listId?: string }) : null
  const hideWhen = eff?.ekDosya.hideWhen ?? []
  const toggleHide = (d: string) => eff && setOv({ ekDosya: { ...eff.ekDosya, hideWhen: hideWhen.includes(d) ? hideWhen.filter((x) => x !== d) : [...hideWhen, d] } })
  const kazadaOn = eff?.kazadaDurumu.branches?.[0]?.on === 'value' || eff?.kazadaDurumu.branches?.[0]?.on === 'input' ? 'value' : 'incelemeDurumu'
  const hooks = eff ? MODULE_DEFS.filter((m) => m.manifest.hooks?.some((h) => h.targetFactorId === eff.id)) : []
  const profile = eff ? profiles.find((p) => p.id === (settings.engine.statusProfileOverride ?? eff.statusProfile)) ?? profiles.find((p) => p.id === eff.statusProfile) : undefined
  const sayilanlar = profile ? Object.entries(profile.mapping).filter(([, v]) => countsForSummary(v)).map(([k, v]) => `${k || '(boş)'} → ${v}`) : []
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <aside className="kart p-3">
        <TextInput value={q} onChange={setQ} placeholder="Etken ara…" className="mb-2" />
        <Select options={GROUP_ORDER.map((g) => ({ value: g, label: GROUP_TITLES[g] ?? g }))} value={group} onChange={setGroup} placeholder="Grup" className="mb-2" />
        <div className="mb-2 flex gap-2 text-xs"><button className="btn-outline !py-0.5" onClick={() => toggleAll(true)}>Tüm taslakları aç</button><button className="btn-ghost !py-0.5" onClick={() => toggleAll(false)}>Kapat</button></div>
        <ul className="scroll-thin max-h-[60vh] space-y-0.5 overflow-y-auto text-sm">
          {factors.map((f) => <li key={f.id}><button onClick={() => setSel(f.id)} className={`w-full rounded px-2 py-1 text-left ${sel === f.id ? 'bg-camgobegi-100' : 'hover:bg-krem'}`}><span className="font-mono text-[10px] text-camgobegi">{f.displayCode}</span> {f.title.replace(/^\s*[\d.]+\s*/, '').slice(0, 40)} {f.draft && <Badge tone="altin">taslak</Badge>} {settings.contentOverrides[f.id] && <Badge tone="cam">düzenli</Badge>}</button></li>)}
        </ul>
      </aside>
      <section className="kart p-4">
        {!eff || !vs ? <p className="text-sm text-gri">Soldan bir etken seçin. Her metin alanı düzenlenebilir; değişiklikler yerel katmana yazılır, "Sürüm kaydet" ile hash alır.</p> : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold text-lacivert">{eff.title}</h3><div className="flex items-center gap-3"><Toggle checked={eff.showInReport} onChange={(v) => setOv({ showInReport: v })} label="Raporda göster" /><Toggle checked={eff.draft} onChange={(v) => setOv({ draft: v })} label="Taslak" /><Badge tone="gri">{eff.sourceRef.library.sheet}!{eff.sourceRef.library.cell}</Badge>{settings.contentOverrides[eff.id] && <button className="btn-ghost !py-0.5 text-xs" onClick={() => update((s) => { const o = { ...s.contentOverrides }; delete o[eff.id]; return { contentOverrides: o } })}>Varsayılana dön</button>}</div></div>

            {/* Etki alanı */}
            <div className="rounded-lg border border-camgobegi/40 bg-camgobegi-100/60 p-3 text-xs">
              <div className="etiket mb-1">Etki alanı</div>
              <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                <div><dt className="text-gri">Değer kaynağı</dt><dd className="font-medium">{vs.kind === 'input' ? `Veri Girişi › ${INPUT_LABELS[vs.path ?? ''] ?? vs.path}${settings.showExcelRefs && vs.cell ? ` (${vs.cell})` : ''}` : vs.kind === 'cardSelect' ? `Kart seçimi${vs.listId ? ` · liste: ${vs.listId}` : ` · ${eff.options.length} seçenek`}` : vs.kind === 'card' ? 'Alt başlık' : vs.kind}</dd></div>
                <div><dt className="text-gri">Varlık türü</dt><dd className="font-medium">{eff.perEntity ? `Her ${eff.perEntity} için ayrı kart` : 'Tek kart (dosya düzeyi)'}</dd></div>
                <div><dt className="text-gri">Öneri üreten modüller</dt><dd className="font-medium">{hooks.length ? hooks.map((m) => `${m.manifest.name}${settings.enabledModules.includes(m.manifest.id) ? '' : ' (kapalı)'}`).join(', ') : '—'}</dd></div>
                <div><dt className="text-gri">Rapor bölümü</dt><dd className="font-medium">{GROUP_TITLES[eff.group] ?? eff.group} · {eff.showInReport ? 'raporda' : 'raporda gizli'}{eff.draft ? ' · taslak' : ''}</dd></div>
                <div className="sm:col-span-2"><dt className="text-gri">Sonuç özeti</dt><dd className="font-medium">{settings.summaryScope === 'excel' && eff.group !== 'yol-cevre' ? 'Excel kapsamı (yalnız 2. Yol ve Çevre) dışında — sayılmaz.' : `Sayılır; profil ${profile?.id ?? '?'}: ${sayilanlar.join(', ') || 'hiçbir durum ETKEN/İNCELENMELİ vermez'}`}</dd></div>
              </dl>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Başlık"><TextInput value={eff.title} onChange={(v) => setOv({ title: v })} /></Field>
              <Field label="Alt başlık"><TextInput value={eff.subTitle} onChange={(v) => setOv({ subTitle: v })} /></Field>
              <Field label="Görünen numara"><TextInput value={eff.displayCode} onChange={(v) => setOv({ displayCode: v })} /></Field>
              <Field label="Durum profili"><Select options={profiles.map((p) => p.id)} value={eff.statusProfile} onChange={(v) => v && setOv({ statusProfile: v })} /></Field>
              <Field label="Grup"><Select options={GROUP_ORDER.map((g) => ({ value: g, label: GROUP_TITLES[g] ?? g }))} value={eff.group} onChange={(v) => v && setOv({ group: v })} /></Field>
              <Field label="Sıra (grup içi)" hint={`Paket sırası: ${PACKAGE_ORDER.get(eff.id) ?? '—'}. Boş bırakılırsa paket sırası; ondalık (ör. 2.5) araya sokar.`}><TextInput type="number" step="0.5" value={eff.order ?? ''} onChange={(v) => { if (v === '') { const o = { ...ov } as Partial<FactorDef>; delete o.order; update((s) => ({ contentOverrides: { ...s.contentOverrides, [eff.id]: o } })) } else setOv({ order: Number(v) }) }} /></Field>
              <Field label="Varlık türü"><Select options={[{ value: 'arac', label: 'Araç' }, { value: 'surucu', label: 'Sürücü' }, { value: 'yolcu', label: 'Yolcu' }, { value: 'yaya', label: 'Yaya' }]} value={eff.perEntity ?? ''} onChange={(v) => setOv({ perEntity: (v || null) as FactorDef['perEntity'] })} placeholder="yok (tek kart)" /></Field>
              <Field label={`Değer kaynağı: ${vs.kind === 'input' ? 'Veri Girişi alanı' : 'kart seçimi'}`} hint={vs.kind === 'cardSelect' ? 'Liste seçilirse kart seçenekleri bu listeden gelir; boşsa etkenin kendi seçenekleri.' : `Alan: ${vs.path ?? '—'}`}>
                {vs.kind === 'cardSelect' ? <Select options={Object.values(LISTS).map((l) => ({ value: l.id, label: `${l.id} (${l.items.length} öğe)` }))} value={vs.listId ?? ''} onChange={(v) => setOv({ valueSource: { ...eff.valueSource, kind: 'cardSelect', listId: v || undefined } })} placeholder="— etkenin seçenekleri —" /> : <TextInput value={vs.path ?? ''} onChange={() => { /* Veri Girişi alanı paket sürümünde tanımlıdır */ }} disabled />}
              </Field>
            </div>
            <Field label="Aranan"><TextArea value={eff.aranan} onChange={(v) => setOv({ aranan: v })} /></Field>
            {(['aciklama', 'nedensellik', 'sorun', 'sonuc', 'sorumlular', 'tespitYontemi'] as const).map((k) => {
              const src = eff.fields[k] as { kind: string; text?: string; table?: { key: string; text: string }[] } | undefined
              return (
                <div key={k}>
                  <Field label={`${FIELD_LABELS[k]} ${src?.kind === 'option' ? '(seçeneğe özel tablo)' : '(etken düzeyi metin)'}`}>
                    {src?.kind === 'option' ? <div className="rounded border border-krem-200 bg-white p-2 text-xs"><p className="mb-1 text-gri">Seçenek tablosu ({src.table?.length} satır) aşağıda, seçenekler bölümünden düzenlenir.</p></div>
                      : <TextArea value={src?.text ?? ''} onChange={(v) => setText(k, v)} className={k === 'sonuc' || k === 'sorumlular' || k === 'tespitYontemi' ? '!min-h-[48px]' : undefined} />}
                  </Field>
                </div>
              )
            })}
            <div>
              <div className="etiket mb-1">Ek dosya / önlem / uygunluk metinleri</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Ek dosya kodu"><TextInput value={eff.ekDosya.kod ?? ''} onChange={(v) => setOv({ ekDosya: { ...eff.ekDosya, kod: v, parts: [{ kind: 'text', text: v }, { kind: 'text', text: eff.ekDosya.metin ?? '' }] } })} /></Field>
                <Field label="Ek dosya metni"><TextInput value={eff.ekDosya.metin ?? ''} onChange={(v) => setOv({ ekDosya: { ...eff.ekDosya, metin: v, parts: [{ kind: 'text', text: eff.ekDosya.kod ?? '' }, { kind: 'text', text: v }] } })} /></Field>
                <div><div className="mb-1 text-xs font-semibold text-lacivert">Ek dosya koşulunun baktığı alan</div><Segmented options={['incelemeDurumu', 'sorumlu', 'value'] as const} value={((eff.ekDosya.on as string | undefined) ?? 'incelemeDurumu') as 'incelemeDurumu' | 'sorumlu' | 'value'} onChange={(v) => v && setOv({ ekDosya: { ...eff.ekDosya, kind: 'rule', on: v } })} labels={{ incelemeDurumu: 'İnceleme Durumu', sorumlu: 'Sorumlu', value: 'Değer' }} size="xs" /></div>
                <div><div className="mb-1 text-xs font-semibold text-lacivert">Ek dosya gizleme kuralı (şu durumlarda gizle)</div><div className="flex flex-wrap gap-1">{INCELEME_DURUMLARI.map((d) => <button key={d} type="button" aria-pressed={hideWhen.includes(d)} className={`rounded-md border px-2 py-0.5 text-[11px] ${hideWhen.includes(d) ? 'border-camgobegi bg-camgobegi-100 text-lacivert' : 'border-krem-200 bg-white text-gri'}`} onClick={() => toggleHide(d)}>{d}</button>)}</div></div>
              </div>
              {eff.kazadaDurumu.kind === 'rule' && (
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center gap-2"><span className="font-semibold text-lacivert">Kazada durumu koşul alanı</span><Segmented options={['incelemeDurumu', 'value'] as const} value={kazadaOn} onChange={(v) => v && setOv({ kazadaDurumu: { ...eff.kazadaDurumu, branches: (eff.kazadaDurumu.branches ?? []).map((b) => ({ ...b, on: v })) } })} labels={{ incelemeDurumu: 'İnceleme Durumu', value: 'Değer' }} size="xs" /></div>
                  {(eff.kazadaDurumu.branches ?? []).map((b, i) => <div key={i} className="flex items-center gap-2"><Badge tone="gri">{b.on} = {b.when}</Badge><TextInput value={b.parts.map((p) => p.text ?? '').join('')} onChange={(v) => { const br = [...(eff.kazadaDurumu.branches ?? [])]; br[i] = { ...b, parts: [{ kind: 'text', text: v }] }; setOv({ kazadaDurumu: { ...eff.kazadaDurumu, branches: br } }) }} className="!py-1 !text-xs" /></div>)}
                  <div className="flex items-center gap-2"><Badge tone="gri">aksi: değer + önlem</Badge><TextInput value={(eff.kazadaDurumu.else ?? []).filter((p) => p.kind === 'text').map((p) => p.text).join('')} onChange={(v) => setOv({ kazadaDurumu: { ...eff.kazadaDurumu, else: [{ kind: 'value' }, { kind: 'literal', text: settings.engine.renderMode === 'excel' ? '' : ' ' }, { kind: 'text', text: v }] } })} className="!py-1 !text-xs" /></div>
                </div>
              )}
            </div>
            <div>
              <div className="etiket mb-1">Seçenekler ({eff.options.length})</div>
              <div className="scroll-thin max-h-72 overflow-y-auto rounded border border-krem-200">
                <table className="w-full text-xs"><thead className="bg-krem"><tr><th className="px-2 py-1 text-left">Seçenek</th><th className="px-2 py-1 text-left">Açıklama</th><th className="px-2 py-1 text-left">Nedensellik</th></tr></thead><tbody>
                  {eff.options.map((o, i) => <tr key={i} className="border-t border-krem-200 align-top"><td className="px-2 py-1"><TextInput value={o.label} onChange={(v) => { const op = [...eff.options]; op[i] = { ...o, label: v }; setOv({ options: op }) }} className="!py-0.5 !text-xs" /></td><td className="px-2 py-1"><TextArea value={o.aciklama ?? ''} onChange={(v) => { const op = [...eff.options]; op[i] = { ...o, aciklama: v }; setOv({ options: op }) }} className="!min-h-[40px] !py-0.5 !text-xs" /></td><td className="px-2 py-1"><TextArea value={o.nedensellik ?? ''} onChange={(v) => { const op = [...eff.options]; op[i] = { ...o, nedensellik: v }; setOv({ options: op }) }} className="!min-h-[40px] !py-0.5 !text-xs" /></td></tr>)}
                </tbody></table>
              </div>
              <button className="btn-ghost mt-1 !py-0.5 text-xs" onClick={() => setOv({ options: [...eff.options, { label: 'Yeni seçenek' }] })}>+ Seçenek</button>
              <p className="mt-1 text-[10px] text-gri">Not: Seçenek metinleri kart motorunda VLOOKUP tablosundan (fields.*.table) okunur; burada düzenlenen seçenekler yeni paket sürümünde tabloya işlenir.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Listeler({ settings, update }: P) {
  const [sel, setSel] = useState<string>('inceleme-durumu')
  const lists = Object.values(LISTS)
  const l = LISTS[sel]
  const items = settings.listOverrides[sel] ?? l?.items.map(String) ?? []
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <aside className="kart scroll-thin max-h-[70vh] overflow-y-auto p-2 text-sm">
        {lists.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`block w-full rounded px-2 py-1 text-left ${sel === x.id ? 'bg-camgobegi-100' : 'hover:bg-krem'}`}><span className="font-mono text-[11px]">{x.id}</span><span className="block text-[10px] text-gri">{x.source} · {x.items.length} öğe · {x.usedBy.map((u) => `${u.sheet}!${u.cells}`).join(', ').slice(0, 60)}</span></button>)}
      </aside>
      <section className="kart p-4">
        {l && <>
          <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold text-lacivert">{l.id} <Badge tone="gri">{l.source}</Badge></h3>{settings.listOverrides[sel] && <button className="btn-ghost !py-0.5 text-xs" onClick={() => update((s) => { const o = { ...s.listOverrides }; delete o[sel]; return { listOverrides: o } })}>Varsayılana dön</button>}</div>
          <TextArea value={items.join('\n')} onChange={(v) => update((s) => ({ listOverrides: { ...s.listOverrides, [sel]: v.split('\n') } }))} className="!min-h-[50vh] font-mono !text-xs" />
          <p className="mt-1 text-[11px] text-gri">Her satır bir öğe. Kullanıldığı hücreler: {l.usedBy.map((u) => `${u.sheet}!${u.cells}`).join('; ') || '(adlandırılmış liste)'}</p>
        </>}
      </section>
    </div>
  )
}

/* ───────────── Kural profilleri: düzenlenebilir matris ───────────── */

function Kurallar({ settings, update }: P) {
  const outputs = ['', 'ETKEN', 'ETKEN DEĞİL', 'İNCELENMELİ', 'ÖZEL İSTEMLİ', 'İNCELEMELİ', 'FALSE']
  const profiles = effectiveProfileList(settings)
  const [err, setErr] = useState<string | null>(null)
  const setCell = (pid: string, key: string, v: string) => update((s) => ({ profileOverrides: { ...s.profileOverrides, [pid]: { ...s.profileOverrides[pid], mapping: { ...(s.profileOverrides[pid]?.mapping ?? {}), [key]: v } } } }))
  const setElse = (pid: string, v: string) => update((s) => ({ profileOverrides: { ...s.profileOverrides, [pid]: { ...s.profileOverrides[pid], else: v } } }))
  const resetProfile = (pid: string) => update((s) => { const p = { ...s.profileOverrides }; delete p[pid]; return { profileOverrides: p } })
  const copyProfile = (src: (typeof profiles)[number]) => {
    const raw = prompt('Yeni profil kimliği (küçük harf, tire):', `${src.id}-kopya`)
    if (raw === null) return
    const id = raw.trim().toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü-]+/g, '-').replace(/^-+|-+$/g, '')
    if (!id) { setErr('Profil kimliği boş olamaz.'); return }
    if (profiles.some((p) => p.id === id)) { setErr(`"${id}" zaten var.`); return }
    setErr(null)
    update((s) => ({ profileOverrides: { ...s.profileOverrides, [id]: { copiedFrom: src.id, mapping: { ...src.mapping }, else: src.else } } }))
  }
  return (
    <div className="space-y-4">
      <div className="kart flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <div className="text-xs text-gri">Her hücre İnceleme Durumu → Durum eşlemesidir. Değişiklikler yerel katmana (profileOverrides) yazılır; sarı hücreler paketten farklıdır. Motor ön ayarı (Excel uyumlu / birleşik, metin modu) <b>Genel</b> sekmesinde.</div>
        {err && <span className="text-xs text-red-700">{err}</span>}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {profiles.map((p) => {
          const base = STATUS_PROFILE_BY_ID.get(p.id)
          const ov = settings.profileOverrides[p.id]
          const isNew = !base
          return (
            <div key={p.id} className="kart p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-lacivert">{p.id} {isNew && <Badge tone="cam">yeni (kopya: {ov?.copiedFrom})</Badge>}{!isNew && ov && <Badge tone="altin">düzenli</Badge>}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gri">{p.firstSeen ? `ilk: ${p.firstSeen} · sayfalar ${p.sheets?.join(', ')}` : isNew ? 'yerel profil' : 'öneri (onay bekler)'}</span>
                  <button className="btn-ghost !py-0.5 text-xs" onClick={() => copyProfile(p)}>Yeni profil (kopyala)</button>
                  {ov && <button className="btn-ghost !py-0.5 text-xs text-red-700" onClick={() => { if (isNew ? confirm(`"${p.id}" profili silinsin mi? Bu profili kullanan etkenler kendi paket profiline düşer.`) : true) resetProfile(p.id) }}>{isNew ? 'Profili sil' : 'Varsayılana dön'}</button>}
                </div>
              </div>
              <table className="w-full text-xs"><tbody>
                {STATUS_INPUTS.map((k) => {
                  const v = p.mapping[k]
                  const cur = v === undefined ? 'FALSE' : v
                  const baseV = base ? (base.mapping[k] === undefined ? 'FALSE' : base.mapping[k]) : cur
                  const changed = cur !== baseV
                  return <tr key={k} className="border-t border-krem-200"><td className="py-1 pr-2">{k || '(boş)'}</td><td className={`py-1 ${changed ? 'bg-altin-100' : ''}`}><select className="input !py-0.5 !text-xs" value={cur} onChange={(e) => setCell(p.id, k, e.target.value)}>{outputs.map((o) => <option key={o} value={o}>{o === 'FALSE' ? '⚠ tanımsız' : o || '""'}</option>)}</select></td><td className="py-1 pl-2">{v !== undefined && v !== 'FALSE' && v !== '' ? <StatusChip value={v} size="sm" /> : v === '' ? <Badge tone="gri">""</Badge> : <Badge tone="altin">tanımsız</Badge>}</td></tr>
                })}
                <tr className="border-t border-krem-200"><td className="py-1 pr-2 text-gri">aksi (diğer)</td><td className={`py-1 ${base && (ov?.else ?? base.else) !== base.else ? 'bg-altin-100' : ''}`}><select className="input !py-0.5 !text-xs" value={p.else ?? 'FALSE'} onChange={(e) => setElse(p.id, e.target.value)}>{outputs.map((o) => <option key={o} value={o}>{o === 'FALSE' ? '⚠ tanımsız (Excel FALSE)' : o || '""'}</option>)}</select></td><td></td></tr>
              </tbody></table>
              {p.excelFormula && <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-krem p-2 font-mono text-[9px] text-gri">={p.excelFormula}</pre>}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gri">Matris, Excel'in V sütunu IF zincirlerinden otomatik çıkarıldı (content/core/rules/status-profiles.json). Paket profilleri {STATUS_PROFILES.map((p) => p.id).join(', ')}; "birleşik" profil ürün sahibi onayına tabidir (açık soru #1). Yeni profiller etken editöründeki "Durum profili" seçicisinde görünür.</p>
    </div>
  )
}

function Katsayilar({ settings, update }: P) {
  const c = CONSTANTS as { oranSabitleri: Record<string, number>; riskKatsayisi_AC12: number; siklikTablosu: { etiket: string; katsayi: number; cell: string }[]; kacinma: { puanTablosu: { durum: string; AF: number; AG: number }[]; kurumCarpanlari: { etiket: string; carpan: number }[]; senaryoCarpanlari: Record<string, number> }; onlenebilecekKazalar: { ad: string; agirlik: number }[] }
  const g = settings.gunes
  const setBand = (i: number, patch: Partial<{ max: number; sinif: string; K: number }>) => update({ gunes: { ...g, thetaBands: g.thetaBands.map((b, j) => (j === i ? { ...b, ...patch } : b)) } })
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="kart p-4"><h3 className="mb-2 font-semibold text-lacivert">Sayfa 2 — oran sabitleri ve risk</h3>
        <table className="w-full text-xs"><tbody>{Object.entries(c.oranSabitleri).map(([k, v]) => <tr key={k} className="border-t border-krem-200"><td className="py-1">{k}</td><td className="py-1 text-right font-mono">{v.toLocaleString('tr-TR')}</td></tr>)}<tr className="border-t border-krem-200"><td className="py-1">Risk katsayısı AC12</td><td className="py-1 text-right font-mono">{c.riskKatsayisi_AC12}</td></tr></tbody></table>
        <h4 className="etiket mt-3 mb-1">Sıklık tablosu (AD2:AE10)</h4>
        <table className="w-full text-xs"><tbody>{c.siklikTablosu.map((r) => <tr key={r.cell} className="border-t border-krem-200"><td className="py-1">{r.etiket}</td><td className="py-1 text-right font-mono">{r.katsayi}</td><td className="py-1 pl-2 text-gri">{r.cell}</td></tr>)}</tbody></table>
        <div className="mt-3 space-y-2 text-sm">
          <Toggle checked={settings.duzeltmeler.siklikEslemesi} onChange={(v) => update({ duzeltmeler: { ...settings.duzeltmeler, siklikEslemesi: v } })} label="Düzeltilmiş sıklık eşlemesi (5 Yıl→5 Yıllık, 10 Yıl→10 Yıllık; yaya sıklığı E64 kullanılır) — tutarsızlık #5" />
          <Toggle checked={settings.duzeltmeler.rkEtiket} onChange={(v) => update({ duzeltmeler: { ...settings.duzeltmeler, rkEtiket: v } })} label="Rk etiket formülünü kullan (D×100×10 000 000 / S×M×365) — #6 (henüz yalnız işaret)" />
        </div>
      </div>
      <div className="kart p-4"><h3 className="mb-2 font-semibold text-lacivert">Sayfa 19 — kaçınma puanlaması</h3>
        <table className="w-full text-xs"><tbody>{c.kacinma.puanTablosu.map((r) => <tr key={r.durum} className="border-t border-krem-200"><td className="py-1">{r.durum}</td><td className="py-1 text-right font-mono">AF {r.AF} · AG {r.AG}</td></tr>)}</tbody></table>
        <div className="mt-2 text-xs text-gri">Senaryo çarpanları (Excel): {Object.entries(c.kacinma.senaryoCarpanlari).map(([k, v]) => `${k}→×${v}`).join(', ')}</div>
        <div className="mt-2 text-xs text-gri">Kurum çarpanları: {c.kacinma.kurumCarpanlari.map((k) => `${k.etiket}: ${k.carpan}`).join(' · ')}</div>
        <div className="mt-3 space-y-2 text-sm">
          <Toggle checked={settings.duzeltmeler.kacinmaCarpan} onChange={(v) => update({ duzeltmeler: { ...settings.duzeltmeler, kacinmaCarpan: v } })} label="Düzeltilmiş senaryo çarpanı (AR12/5 × puan; AS=1→×1) — #7" />
          <Toggle checked={settings.duzeltmeler.kurumAnlam} onChange={(v) => update({ duzeltmeler: { ...settings.duzeltmeler, kurumAnlam: v } })} label="Kurum senaryolarında 0/5 anlamını sürücü ile aynı yap — #7" />
          <Toggle checked={settings.duzeltmeler.ekDosyaIncelemeDurumu} onChange={(v) => update({ duzeltmeler: { ...settings.duzeltmeler, ekDosyaIncelemeDurumu: v } })} label="Ek dosya bayrağı her kartta İnceleme Durumu'na baksın — #28 (yalnız işaret)" />
        </div>
        <h4 className="etiket mt-3 mb-1">Önlenebilecek kazalar ağırlıkları (2.!Z81:Z83)</h4>
        <div className="text-xs">{c.onlenebilecekKazalar.map((k) => `${k.ad}: ${k.agirlik}`).join(' · ')}</div>
      </div>
      <div className="kart p-4 lg:col-span-2"><h3 className="mb-2 font-semibold text-lacivert">Güneş modülü — θ bantları ve varsayılanlar</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Varsayılan reaksiyon süresi t (s)"><TextInput type="number" step="0.1" value={g.varsayilanReaksiyon} onChange={(v) => update({ gunes: { ...g, varsayilanReaksiyon: Number(v) } })} /></Field>
          <Field label="Varsayılan pitch (°)"><TextInput type="number" value={g.varsayilanPitch} onChange={(v) => update({ gunes: { ...g, varsayilanPitch: Number(v) } })} /></Field>
          <Field label="Varsayılan UTC ofset"><TextInput type="number" value={g.varsayilanUtcOfset} onChange={(v) => update({ gunes: { ...g, varsayilanUtcOfset: Number(v) } })} /></Field>
        </div>
        <table className="mt-3 w-full text-xs"><thead><tr className="text-left text-gri"><th>θ üst sınır</th><th>Sınıf</th><th>K</th><th>Öneri → İnceleme Durumu (onay bekler)</th></tr></thead><tbody>
          {g.thetaBands.map((b, i) => <tr key={i} className="border-t border-krem-200"><td><TextInput type="number" value={b.max} onChange={(v) => setBand(i, { max: Number(v) })} className="!w-24 !py-0.5 !text-xs" /></td><td><TextInput value={b.sinif} onChange={(v) => setBand(i, { sinif: v })} className="!py-0.5 !text-xs" /></td><td><TextInput type="number" step="0.1" value={b.K} onChange={(v) => setBand(i, { K: Number(v) })} className="!w-20 !py-0.5 !text-xs" /></td><td><Select options={STATUS_INPUTS.filter(Boolean)} value={g.oneriEslemesi[b.sinif] ?? ''} onChange={(v) => update({ gunes: { ...g, oneriEslemesi: { ...g.oneriEslemesi, [b.sinif]: v } } })} className="!py-0.5 !text-xs" /></td></tr>)}
        </tbody></table>
      </div>
    </div>
  )
}

function Referans() {
  const [info, setInfo] = useState<string | null>(null)
  const sets = [
    { id: 'il-ilce', title: 'İl → ilçe', file: 'data/reference/il-ilce.json', version: '2024', source: 'Tanım!AG3:AI997', rows: '995 satır' },
    { id: 'mahalle', title: 'İl > ilçe > mahalle', file: 'data/reference/mahalle/*.json', version: '2024', source: 'Tanım!CU3:CZ33525', rows: '33.523 satır (il başına parça, gerektiğinde yüklenir)' },
    { id: 'il-istatistik', title: 'İl istatistikleri (nüfus, taşıt, kaza)', file: 'data/reference/il-istatistik-2023.json', version: '2023/2024', source: 'Tanım!G2:AA85, BY3:CN85', rows: '82 satır' },
    { id: 'ilce-nufus', title: 'İlçe nüfusu', file: 'data/reference/ilce-nufus-2023.json', version: '2023', source: 'Tanım!DD2:DI975', rows: '973 satır' },
    { id: 'kgm', title: 'KGM trafik sayımı', file: 'data/reference/kgm-trafik-sayim.json', version: 'KGM (yıl belirtilmemiş)', source: 'Tanım!AT3:BX4099', rows: '4.097 kesim' },
    { id: 'ilce-koordinat', title: 'İlçe merkez koordinatları (güneş modülü)', file: 'data/reference/ilce-koordinat.json', version: '—', source: 'yok (açık soru #17)', rows: 'boş yuva' },
  ]
  const onUpload = async (id: string, f: File) => {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
    const { db } = await import('@/store/db')
    try { await (db as unknown as { table: (n: string) => { put: (x: unknown) => Promise<unknown> } }).table('blobs').put({ id: `ref-${id}`, caseId: 'ref', name: f.name, type: f.type, size: f.size, blob: new Blob([JSON.stringify(rows)]) }) } catch { /* yok say */ }
    setInfo(`${f.name}: ${rows.length} satır okundu, "${id}" için yerel geçersiz kılma olarak saklandı (tarayıcı). Üretimde içerik paketi sürümüne işlenir.`)
  }
  return (
    <div className="space-y-3">
      {info && <div className="rounded-lg bg-camgobegi-100 p-3 text-sm">{info}</div>}
      <div className="kart overflow-hidden"><table className="w-full text-sm"><thead className="bg-krem text-left text-xs uppercase tracking-wider text-gri"><tr><th className="px-3 py-2">Veri seti</th><th className="px-3 py-2">Sürüm / yıl</th><th className="px-3 py-2">Excel kaynağı</th><th className="px-3 py-2">Boyut</th><th className="px-3 py-2">Güncelle</th></tr></thead><tbody>
        {sets.map((s) => <tr key={s.id} className="border-t border-krem-200"><td className="px-3 py-2"><div className="font-medium">{s.title}</div><div className="font-mono text-[10px] text-gri">{s.file}</div></td><td className="px-3 py-2"><Badge tone="altin">{s.version}</Badge></td><td className="px-3 py-2 font-mono text-xs">{s.source}</td><td className="px-3 py-2 text-xs">{s.rows}</td><td className="px-3 py-2"><label className="btn-outline !py-1 text-xs cursor-pointer">CSV / XLSX yükle<input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(s.id, f) }} /></label></td></tr>)}
      </tbody></table></div>
      <p className="text-xs text-gri">Referans veriler sürüm/yıl etiketiyle saklanır. Yeni yıl verisi geldiğinde CSV/XLSX yüklenir; derleme zamanı paketine `scripts/extract` ile işlenir.</p>
    </div>
  )
}

/* ───────────── Delil kodları: ekle / düzenle / gizle ───────────── */

function Delil({ settings, update }: P) {
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ kod: '', ad: '', not: '', grup: '' })
  const [err, setErr] = useState<string | null>(null)
  const ov = settings.evidenceOverrides
  const all = useMemo(() => effectiveEvidenceCodes(settings), [settings])
  const pkg = useMemo(() => packageEvidenceCodes(), [])
  const rows = useMemo(() => { const n = q.trim().toLocaleLowerCase('tr-TR'); return n ? all.filter((c) => [c.kod, c.ad, c.not, c.grup].some((x) => x.toLocaleLowerCase('tr-TR').includes(n))) : all }, [all, q])
  const setEv = (fn: (e: EvidenceOverrides) => Partial<EvidenceOverrides>) => update((s) => ({ evidenceOverrides: { ...s.evidenceOverrides, ...fn(s.evidenceOverrides) } }))
  const editField = (c: EvidenceCode, patch: { ad?: string; not?: string; grup?: string }) => c.kaynak === 'eklendi'
    ? setEv((e) => ({ added: e.added.map((a) => (a.kod === c.kod ? { ...a, ...patch } : a)) }))
    : setEv((e) => ({ edited: { ...e.edited, [c.kod]: { ...e.edited[c.kod], ...patch } } }))
  const remove = (c: EvidenceCode) => c.kaynak === 'eklendi' ? setEv((e) => ({ added: e.added.filter((a) => a.kod !== c.kod) })) : setEv((e) => ({ removed: e.removed.includes(c.kod) ? e.removed : [...e.removed, c.kod] }))
  const restore = (kod: string) => setEv((e) => ({ removed: e.removed.filter((k) => k !== kod) }))
  const resetCode = (kod: string) => setEv((e) => { const ed = { ...e.edited }; delete ed[kod]; return { edited: ed } })
  const addNew = () => {
    const kod = form.kod.trim().toLocaleUpperCase('tr-TR').replace(/\s+/g, '-')
    if (!kod) { setErr('Kod zorunludur.'); return }
    if (!form.ad.trim()) { setErr('Ad zorunludur.'); return }
    if (ov.removed.includes(kod)) { setErr(`"${kod}" paket kodu gizlenmiş; eklemek yerine aşağıdan geri getirin.`); return }
    if (all.some((c) => c.kod === kod) || pkg.some((c) => c.kod === kod)) { setErr(`"${kod}" zaten var; kod benzersiz olmalı.`); return }
    setErr(null)
    setEv((e) => ({ added: [...e.added, { kod, ad: form.ad.trim(), not: form.not.trim() || undefined, grup: form.grup.trim() || evidenceGroupOf(kod) }] }))
    setForm({ kod: '', ad: '', not: '', grup: '' }); setShowNew(false)
  }
  const ec = EVIDENCE_CODES as { mapping: { eskiKod: string; turkceKod: string; ad: string }[] }
  const tone = (k: EvidenceCode['kaynak']) => (k === 'paket' ? 'gri' : k === 'eklendi' ? 'yesil' : 'altin')
  return (
    <div className="space-y-4">
      <div className="kart p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-lacivert">Delil kodları <span className="text-xs font-normal text-gri">(Tanım!C2000:E2080 + yerel katman) · {all.length} kod</span></h3>
          <div className="flex items-center gap-2"><TextInput value={q} onChange={setQ} placeholder="Kod, ad, not, grup ara…" className="!w-64" /><button className="btn-primary !py-1 text-xs" onClick={() => { setShowNew((v) => !v); setErr(null) }}>+ Yeni kod</button></div>
        </div>
        {showNew && (
          <div className="mb-3 rounded-lg border border-camgobegi/40 bg-camgobegi-100/50 p-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <Field label="Kod (zorunlu, büyük harf, benzersiz)"><TextInput value={form.kod} onChange={(v) => setForm({ ...form, kod: v.toLocaleUpperCase('tr-TR') })} placeholder="ÖR: YOL-12" className="font-mono" /></Field>
              <Field label="Ad (zorunlu)"><TextInput value={form.ad} onChange={(v) => setForm({ ...form, ad: v })} placeholder="Kısa açıklama" /></Field>
              <Field label="Not"><TextInput value={form.not} onChange={(v) => setForm({ ...form, not: v })} /></Field>
              <Field label="Grup / önek" hint={`Boşsa koddan türetilir (${evidenceGroupOf(form.kod.toLocaleUpperCase('tr-TR')) || '—'})`}><TextInput value={form.grup} onChange={(v) => setForm({ ...form, grup: v })} /></Field>
            </div>
            <div className="mt-2 flex items-center gap-2"><button className="btn-primary !py-1 text-xs" onClick={addNew}>Ekle</button><button className="btn-ghost !py-1 text-xs" onClick={() => { setShowNew(false); setErr(null) }}>Vazgeç</button>{err && <span className="text-xs text-red-700">{err}</span>}</div>
          </div>
        )}
        {!showNew && err && <p className="mb-2 text-xs text-red-700">{err}</p>}
        <div className="scroll-thin max-h-[60vh] overflow-y-auto">
          <table className="w-full text-xs"><thead className="sticky top-0 bg-krem text-left uppercase tracking-wider text-gri"><tr><th className="px-2 py-1">Kod</th><th className="px-2 py-1">Ad</th><th className="px-2 py-1">Not</th><th className="px-2 py-1">Grup</th><th className="px-2 py-1">Kaynak</th><th className="px-2 py-1"></th></tr></thead><tbody>
            {rows.map((c) => {
              const ed = editing === c.kod
              return (
                <tr key={c.kod} className="border-t border-krem-200 align-top">
                  <td className="px-2 py-1 font-mono font-semibold">{c.kod}</td>
                  <td className="px-2 py-1">{ed ? <TextInput value={c.ad} onChange={(v) => editField(c, { ad: v })} className="!py-0.5 !text-xs" /> : c.ad || <span className="text-gri">—</span>}</td>
                  <td className="px-2 py-1 text-gri">{ed ? <TextInput value={c.not} onChange={(v) => editField(c, { not: v })} className="!py-0.5 !text-xs" /> : <span title={c.not}>{c.not.slice(0, 60)}{c.not.length > 60 ? '…' : ''}</span>}</td>
                  <td className="px-2 py-1">{ed ? <TextInput value={c.grup} onChange={(v) => editField(c, { grup: v })} className="!w-28 !py-0.5 !text-xs" /> : <Badge tone="gri">{c.grup || '—'}</Badge>}</td>
                  <td className="px-2 py-1"><Badge tone={tone(c.kaynak)}>{c.kaynak}</Badge></td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    <button className="btn-ghost !py-0.5 text-xs" onClick={() => setEditing(ed ? null : c.kod)}>{ed ? 'Bitti' : 'Düzenle'}</button>
                    {c.kaynak === 'düzenlendi' && <button className="btn-ghost !py-0.5 text-xs" onClick={() => resetCode(c.kod)}>Varsayılana dön</button>}
                    <button className="btn-ghost !py-0.5 text-xs text-red-700" onClick={() => remove(c)} title={c.kaynak === 'eklendi' ? 'Eklenen kodu sil' : 'Paket kodunu gizle (geri getirilebilir)'}>{c.kaynak === 'eklendi' ? 'Sil' : 'Gizle'}</button>
                  </td>
                </tr>
              )
            })}
            {!rows.length && <tr><td colSpan={6} className="px-2 py-3 text-center text-gri">Eşleşen kod yok.</td></tr>}
          </tbody></table>
        </div>
        {ov.removed.length > 0 && (
          <div className="mt-3 text-xs"><span className="etiket">Gizlenen paket kodları ({ov.removed.length})</span><div className="mt-1 flex flex-wrap gap-1">{ov.removed.map((k) => <button key={k} className="rounded-full border border-krem-200 bg-white px-2 py-0.5 font-mono text-[11px] text-gri hover:border-camgobegi hover:text-lacivert" onClick={() => restore(k)} title="Geri getir">{k} ↺</button>)}</div></div>
        )}
        <p className="mt-2 text-[11px] text-gri">Kartlardaki Delil Kodu seçicisi bu listeyi kullanır. Mevcut dosyalarda seçili ancak gizlenmiş bir kod "(listede yok)" olarak korunur.</p>
      </div>
      <div className="kart p-4"><h3 className="mb-2 font-semibold text-lacivert">Eşleme: eski kod → Türkçe kod (Sayfa5)</h3><div className="scroll-thin max-h-[40vh] overflow-y-auto"><table className="w-full text-xs"><tbody>{ec.mapping.map((m) => <tr key={m.eskiKod} className="border-t border-krem-200"><td className="py-1 font-mono text-gri">{m.eskiKod}</td><td className="py-1 font-mono font-semibold">{m.turkceKod}</td><td className="py-1">{m.ad}</td></tr>)}</tbody></table></div></div>
    </div>
  )
}

function Hukuki({ settings, update }: P) {
  const lt = LEGAL_TEXTS as { variants: string[]; blocks: { paragraphs: string[] }[] }
  return (
    <div className="space-y-4">
      {lt.variants.map((v, vi) => (
        <div key={v} className="kart p-4"><h3 className="mb-2 font-semibold text-lacivert">{v}</h3>
          {lt.blocks[vi === 0 ? 1 : 0].paragraphs.map((p, i) => <TextArea key={i} className="mb-2 !min-h-[80px] !text-xs" value={settings.textOverrides[`legal.${vi}.${i}`] ?? p} onChange={(t) => update((s) => ({ textOverrides: { ...s.textOverrides, [`legal.${vi}.${i}`]: t } }))} />)}
        </div>
      ))}
    </div>
  )
}

function Meta({ settings, update }: P) {
  const m = REPORT_META as unknown as Record<string, string>
  const keys = ['firma', 'birimRapor', 'konu', 'dokNo', 'hazTarihi', 'isoBelge', 'revizyonNo', 'revizyonTarihi', 'klasorNo', 'arsivYeri', 'yenileyenRapor', 'yenileyen', 'onaylayan', 'altbilgiNotu']
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="kart grid gap-3 p-4 sm:grid-cols-2">{keys.map((k) => <Field key={k} label={k} source="Tanım!B2:C23"><TextInput value={settings.reportMetaOverrides[k] ?? m[k] ?? ''} onChange={(v) => update((s) => ({ reportMetaOverrides: { ...s.reportMetaOverrides, [k]: v } }))} /></Field>)}</div>
      <div className="kart space-y-3 p-4"><h3 className="font-semibold text-lacivert">Logolar</h3>{['logo.jpg', 'logo-kucuk.jpg', 'tubir.png'].map((f) => <div key={f} className="flex items-center gap-3 text-xs"><img src={`/brand/${f}`} alt="" className="h-14 w-14 rounded bg-white object-contain p-1" /><div><div className="font-mono">{f}</div><div className="text-gri">public/brand/ — değiştirmek için dosyayı aynı adla yenileyin</div></div></div>)}</div>
    </div>
  )
}

function Numaralandirma({ settings, update }: P) {
  return (
    <div className="kart p-4">
      <Segmented options={['v1', 'v2', 'ozel'] as const} value={settings.numberingScheme} onChange={(v) => v && update({ numberingScheme: v })} labels={{ v1: 'v1 — Tanım (araç 4.x, sürücü 5.x)', v2: 'v2 — BİLGİ HESAP (sürücü 4.x, araç 5.x)', ozel: 'Özel (Bilgi Bankası › görünen numara)' }} />
      <p className="mt-3 text-sm text-gri">Her etkenin değişmez ID'si vardır (ör. <code>yol-cevre.hava-durumu</code>). Görünen numara şemadan üretilir. Excel'deki tutarsızlıklar: iki "2.22", iki "2.22.5", 9Y'de "4.3", sürücü kartlarında numarasız 18 başlık (tutarsızlık #9).</p>
      <table className="mt-3 w-full text-xs"><thead className="text-left text-gri"><tr><th>ID</th><th>v1 (Tanım)</th><th>Başlık</th></tr></thead><tbody>{ALL_FACTORS.filter((f) => !f.draft).slice(0, 120).map((f) => <tr key={f.id} className="border-t border-krem-200"><td className="py-0.5 font-mono">{f.id}</td><td className="py-0.5 font-mono">{settings.contentOverrides[f.id]?.displayCode ?? f.displayCode ?? '—'}</td><td className="py-0.5">{f.title}</td></tr>)}</tbody></table>
    </div>
  )
}

function Moduller({ settings, update }: P) {
  const checks = validateRegistry(settings.enabledModules, new Set())
  const onPack = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()) as { id?: string; factors?: FactorDef[]; lists?: Record<string, string[]> }
      if (!j.factors && !j.lists) throw new Error('İçerik paketi factors[] veya lists{} içermeli')
      update((s) => ({ contentOverrides: { ...s.contentOverrides, ...Object.fromEntries((j.factors ?? []).map((x) => [x.id, { ...x, showInReport: true, draft: false }])) }, listOverrides: { ...s.listOverrides, ...(j.lists ?? {}) }, showDrafts: true }))
      alert(`Paket yüklendi: ${j.id ?? f.name} — ${j.factors?.length ?? 0} etken, ${Object.keys(j.lists ?? {}).length} liste.`)
    } catch (e) { alert(`Paket okunamadı: ${(e as Error).message}`) }
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3"><label className="btn-outline cursor-pointer">İçerik paketi yükle (.json)<input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPack(f) }} /></label><span className="text-xs text-gri">İçerik paketi (yalnız JSON): yeni etken grupları, listeler. Hesap modülleri kod + manifest ile derleme zamanında kaydedilir. Görünüm ve rapor anahtarları <b>Genel</b> sekmesinde.</span></div>
      {checks.map((c, i) => <div key={i} className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">{c.level}: {c.moduleId} — {c.message}</div>)}
      <div className="grid gap-3 lg:grid-cols-2">
        {MODULES.map((m) => {
          const on = settings.enabledModules.includes(m.id)
          return (
            <div key={m.id} className="kart p-4">
              <div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold text-lacivert">{m.name} <span className="font-mono text-xs text-gri">v{m.version}</span></h3><p className="text-xs text-gri">{m.description}</p></div>
                {m.status === 'gelistiriliyor' ? <Badge tone="altin">Modül geliştiriliyor</Badge> : <Toggle checked={on} onChange={(v) => update({ enabledModules: v ? [...settings.enabledModules, m.id] : settings.enabledModules.filter((x) => x !== m.id) })} label={on ? 'açık' : 'kapalı'} />}</div>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">{m.inputs.map((i) => <Badge key={i.key} tone="gri">in: {i.from}{i.fallback ? ` (${i.fallback})` : ''}</Badge>)}{m.outputs.map((o) => <Badge key={o.key} tone="cam">out: {o.key}</Badge>)}{(m.hooks ?? []).map((h) => <Badge key={h.targetFactorId} tone="altin">hook: {h.targetFactorId}</Badge>)}</div>
              {(m.dependsOn ?? []).length > 0 && <div className="mt-1 text-[10px] text-gri">Bağımlılık: {m.dependsOn!.map((d) => `${d.id}@${d.version}`).join(', ')}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Surum({ settings, reset }: { settings: Settings; reset: () => void }) {
  const [a, setA] = useState<string>(''), [b, setB] = useState<string>('')
  const diff = useMemo(() => {
    if (!a || !b) return null
    const sa = settings.history.find((h) => h.version === a), sb = settings.history.find((h) => h.version === b)
    return sa && sb ? `v${sa.version} (#${sa.hash}) → v${sb.version} (#${sb.hash}): ${sb.note}` : null
  }, [a, b, settings.history])
  return (
    <div className="space-y-3">
      <div className="kart p-4"><table className="w-full text-sm"><thead className="text-left text-xs uppercase tracking-wider text-gri"><tr><th>Sürüm</th><th>Hash</th><th>Tarih</th><th>Not</th></tr></thead><tbody>{[...settings.history].reverse().map((h) => <tr key={h.version + h.hash} className="border-t border-krem-200"><td className="py-1 font-mono">v{h.version}</td><td className="py-1 font-mono text-xs">#{h.hash}</td><td className="py-1 text-xs">{new Date(h.at).toLocaleString('tr-TR')}</td><td className="py-1">{h.note}</td></tr>)}</tbody></table></div>
      <div className="kart flex flex-wrap items-center gap-3 p-4 text-sm"><span className="etiket">Fark</span><Select options={settings.history.map((h) => h.version)} value={a} onChange={setA} placeholder="eski" className="!w-32" /><span>→</span><Select options={settings.history.map((h) => h.version)} value={b} onChange={setB} placeholder="yeni" className="!w-32" />{diff && <span className="text-xs text-gri">{diff}</span>}</div>
      <div className="kart p-4 text-sm"><p className="text-gri">Her dosya oluşturulduğu andaki ayar hash'ini dondurur; eski dosya kendi sürümüyle gösterilir ve "yeni sürüme yükselt" seçeneği sunar (Giriş sayfası sürüm kutusu).</p><button className="btn-ghost mt-2 text-red-700" onClick={() => { if (confirm('Tüm yerel ayar geçersiz kılmaları silinsin mi?')) reset() }}>Yerel ayarları paket varsayılanına döndür</button></div>
    </div>
  )
}

function Tutarsizlik({ settings, update }: P) {
  const d = settings.duzeltmeler
  const toggles: Record<string, keyof typeof d> = { 'SIKLIK-ESLEME': 'siklikEslemesi', 'KACINMA-AM122': 'kurumAnlam', 'RK-ETIKET': 'rkEtiket', 'EKDOSYA-SORUMLU': 'ekDosyaIncelemeDurumu' }
  return (
    <div className="kart overflow-hidden">
      <table className="w-full text-sm"><thead className="bg-krem text-left text-xs uppercase tracking-wider text-gri"><tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Kod</th><th className="px-3 py-2">Başlık</th><th className="px-3 py-2">Excel davranışı</th><th className="px-3 py-2">Web / ayar</th><th className="px-3 py-2">Düzeltme</th></tr></thead><tbody>
        {INCONSISTENCIES.map((r) => <tr key={r.n} className="border-t border-krem-200 align-top text-xs"><td className="px-3 py-2">{r.n}</td><td className="px-3 py-2 font-mono">{r.code}</td><td className="px-3 py-2 font-medium">{r.title}</td><td className="px-3 py-2 text-gri">{r.excel}</td><td className="px-3 py-2">{r.web}</td><td className="px-3 py-2">{toggles[r.code] ? <Toggle checked={d[toggles[r.code]]} onChange={(v) => update({ duzeltmeler: { ...d, [toggles[r.code]]: v } })} label={d[toggles[r.code]] ? 'düzeltilmiş' : 'Excel'} /> : r.code === 'DURUM-KURAL' ? <Toggle checked={!!settings.engine.statusProfileOverride} onChange={(v) => update({ engine: { ...settings.engine, statusProfileOverride: v ? 'birlesik' : null } })} label={settings.engine.statusProfileOverride ? 'birleşik' : 'Excel'} /> : r.code === 'KAZADA-BOSLUK' ? <Toggle checked={settings.engine.renderMode === 'okunur'} onChange={(v) => update({ engine: { ...settings.engine, renderMode: v ? 'okunur' : 'excel' } })} label={settings.engine.renderMode} /> : <span className="text-gri">{r.fixed ? 'webde yapısal olarak giderildi' : '—'}</span>}</td></tr>)}
      </tbody></table>
      <p className="p-3 text-xs text-gri">Kaynak: docs/tutarsizlik-raporu.md. Varsayılan: Excel uyumlu. Her anahtar ürün sahibi kararına bağlıdır. (Varsayılan ayarlar: {JSON.stringify(DEFAULT_SETTINGS.duzeltmeler)})</p>
    </div>
  )
}

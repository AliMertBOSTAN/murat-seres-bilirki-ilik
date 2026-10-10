import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSettingsStore, DEFAULT_SETTINGS, type Settings } from '@/store/settingsStore'
import { ALL_FACTORS, GROUP_TITLES, GROUP_ORDER, LISTS, STATUS_PROFILES, STATUS_INPUTS, CONSTANTS, EVIDENCE_CODES, LEGAL_TEXTS, REPORT_META, CONTENT_VERSION } from '@/content'
import { MODULES, validateRegistry } from '@/modules/registry'
import { INCONSISTENCIES } from '@/data/inconsistencies'
import { PageHeader, Tabs, Field, TextInput, TextArea, Toggle, Badge, Select, Segmented } from '@/ui/primitives'
import { StatusChip } from '@/ui/StatusChip'
import { download } from '@/lib/io'
import type { FactorDef } from '@/engine/types'
import { adminLogin, pullCentralSettings, pushCentralSettings } from '@/lib/central'
import { useAuthStore } from '@/store/authStore'

const SECTIONS = [
  { id: 'bilgi-bankasi', label: 'Bilgi Bankası' }, { id: 'listeler', label: 'Listeler' }, { id: 'kurallar', label: 'Kural Profilleri' }, { id: 'katsayilar', label: 'Katsayılar ve Sabitler' },
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
        {tab === 'bilgi-bankasi' && <BilgiBankasi settings={settings} update={update} />}
        {tab === 'listeler' && <Listeler settings={settings} update={update} />}
        {tab === 'kurallar' && <Kurallar settings={settings} update={update} />}
        {tab === 'katsayilar' && <Katsayilar settings={settings} update={update} />}
        {tab === 'referans' && <Referans />}
        {tab === 'delil' && <Delil />}
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

function BilgiBankasi({ settings, update }: P) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string>('yol-cevre')
  const [sel, setSel] = useState<string | null>(null)
  const factors = useMemo(() => ALL_FACTORS.filter((f) => f.group === group && (!q || f.title.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')))), [group, q])
  const def = sel ? ALL_FACTORS.find((f) => f.id === sel) : null
  const ov = (sel && settings.contentOverrides[sel]) || {}
  const eff = def ? ({ ...def, ...ov } as FactorDef) : null
  const setOv = (patch: Partial<FactorDef>) => sel && update((s) => ({ contentOverrides: { ...s.contentOverrides, [sel]: { ...s.contentOverrides[sel], ...patch } } }))
  const setText = (key: string, text: string) => eff && setOv({ fields: { ...eff.fields, [key]: { ...(eff.fields as Record<string, { kind: string }>)[key], kind: 'text', text } } as FactorDef['fields'] })
  const toggleAll = (on: boolean) => update((s) => ({ contentOverrides: { ...s.contentOverrides, ...Object.fromEntries(ALL_FACTORS.filter((f) => f.draft).map((f) => [f.id, { ...s.contentOverrides[f.id], showInReport: on }])) }, showDrafts: on }))
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
        {!eff ? <p className="text-sm text-gri">Soldan bir etken seçin. Her metin alanı düzenlenebilir; değişiklikler yerel katmana yazılır, "Sürüm kaydet" ile hash alır.</p> : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold text-lacivert">{eff.title}</h3><div className="flex items-center gap-3"><Toggle checked={eff.showInReport} onChange={(v) => setOv({ showInReport: v })} label="Raporda göster" /><Badge tone="gri">{eff.sourceRef.library.sheet}!{eff.sourceRef.library.cell}</Badge>{settings.contentOverrides[eff.id] && <button className="btn-ghost !py-0.5 text-xs" onClick={() => update((s) => { const o = { ...s.contentOverrides }; delete o[eff.id]; return { contentOverrides: o } })}>Varsayılana dön</button>}</div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Başlık"><TextInput value={eff.title} onChange={(v) => setOv({ title: v })} /></Field>
              <Field label="Alt başlık"><TextInput value={eff.subTitle} onChange={(v) => setOv({ subTitle: v })} /></Field>
              <Field label="Görünen numara"><TextInput value={eff.displayCode} onChange={(v) => setOv({ displayCode: v })} /></Field>
              <Field label="Durum profili"><Select options={STATUS_PROFILES.map((p) => p.id)} value={eff.statusProfile} onChange={(v) => setOv({ statusProfile: v })} /></Field>
            </div>
            <Field label="Aranan"><TextArea value={eff.aranan} onChange={(v) => setOv({ aranan: v })} /></Field>
            {(['aciklama', 'nedensellik', 'sorun'] as const).map((k) => {
              const src = eff.fields[k] as { kind: string; text?: string; table?: { key: string; text: string }[] } | undefined
              return (
                <div key={k}>
                  <Field label={`${k} ${src?.kind === 'option' ? '(seçeneğe özel tablo)' : '(etken düzeyi metin)'}`}>
                    {src?.kind === 'option' ? <div className="rounded border border-krem-200 bg-white p-2 text-xs"><p className="mb-1 text-gri">Seçenek tablosu ({src.table?.length} satır) aşağıda, seçenekler bölümünden düzenlenir.</p></div>
                      : <TextArea value={src?.text ?? ''} onChange={(v) => setText(k, v)} />}
                  </Field>
                </div>
              )
            })}
            <div>
              <div className="etiket mb-1">Ek dosya / önlem / uygunluk metinleri</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Ek dosya kodu"><TextInput value={eff.ekDosya.kod ?? ''} onChange={(v) => setOv({ ekDosya: { ...eff.ekDosya, kod: v, parts: [{ kind: 'text', text: v }, { kind: 'text', text: eff.ekDosya.metin ?? '' }] } })} /></Field>
                <Field label="Ek dosya metni"><TextInput value={eff.ekDosya.metin ?? ''} onChange={(v) => setOv({ ekDosya: { ...eff.ekDosya, metin: v, parts: [{ kind: 'text', text: eff.ekDosya.kod ?? '' }, { kind: 'text', text: v }] } })} /></Field>
              </div>
              {eff.kazadaDurumu.kind === 'rule' && (
                <div className="mt-2 space-y-1 text-xs">
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

function Kurallar({ settings, update }: P) {
  const outputs = ['', 'ETKEN', 'ETKEN DEĞİL', 'İNCELENMELİ', 'ÖZEL İSTEMLİ', 'İNCELEMELİ', 'FALSE']
  return (
    <div className="space-y-4">
      <div className="kart flex flex-wrap items-center gap-4 p-4 text-sm">
        <span className="etiket">Ön ayar</span>
        <Segmented options={['excel', 'birlesik'] as const} value={settings.engine.statusProfileOverride ? 'birlesik' : 'excel'} onChange={(v) => v && update({ engine: { ...settings.engine, statusProfileOverride: v === 'birlesik' ? 'birlesik' : null } })} labels={{ excel: 'Excel uyumlu (sayfa bazlı profiller)', birlesik: 'Birleştirilmiş kural' }} />
        <Segmented options={['excel', 'okunur'] as const} value={settings.engine.renderMode} onChange={(v) => v && update({ engine: { ...settings.engine, renderMode: v } })} labels={{ excel: 'Metin: Excel (boşluksuz birleştirme)', okunur: 'Metin: okunur mod' }} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {STATUS_PROFILES.map((p) => (
          <div key={p.id} className="kart p-4">
            <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold text-lacivert">{p.id}</h3><span className="text-[10px] text-gri">{p.firstSeen ? `ilk: ${p.firstSeen} · sayfalar ${p.sheets?.join(', ')}` : 'öneri (onay bekler)'}</span></div>
            <table className="w-full text-xs"><tbody>
              {STATUS_INPUTS.map((k) => { const v = p.mapping[k]; return <tr key={k} className="border-t border-krem-200"><td className="py-1 pr-2">{k || '(boş)'}</td><td className="py-1"><select className="input !py-0.5 !text-xs" value={v ?? 'FALSE'} onChange={() => { /* profil düzenleme: yeni paket sürümünde */ }} disabled>{outputs.map((o) => <option key={o} value={o}>{o === 'FALSE' ? '⚠ tanımsız' : o || '""'}</option>)}</select></td><td className="py-1 pl-2">{v && v !== 'FALSE' ? <StatusChip value={v} size="sm" /> : <Badge tone="altin">tanımsız</Badge>}</td></tr> })}
            </tbody></table>
            {p.excelFormula && <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-krem p-2 font-mono text-[9px] text-gri">={p.excelFormula}</pre>}
          </div>
        ))}
      </div>
      <p className="text-xs text-gri">Matris, Excel'in V sütunu IF zincirlerinden otomatik çıkarıldı (content/core/rules/status-profiles.json). Profil düzenleme içerik paketi sürümüyle yapılır; "birleştirilmiş" profil ürün sahibi onayına tabidir (açık soru #1).</p>
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

function Delil() {
  const ec = EVIDENCE_CODES as { codes: { kod: string; sira: number | null; not: string }[]; mapping: { eskiKod: string; turkceKod: string; ad: string }[] }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="kart p-4"><h3 className="mb-2 font-semibold text-lacivert">Delil kodları (Tanım!C2000:E2080)</h3><div className="scroll-thin max-h-[60vh] overflow-y-auto"><table className="w-full text-xs"><tbody>{ec.codes.map((c, i) => <tr key={i} className="border-t border-krem-200"><td className="py-1 font-mono">{c.kod}</td><td className="py-1 text-gri">{c.sira}</td><td className="py-1 text-gri">{c.not.slice(0, 80)}</td></tr>)}</tbody></table></div></div>
      <div className="kart p-4"><h3 className="mb-2 font-semibold text-lacivert">Eşleme: eski kod → Türkçe kod (Sayfa5)</h3><div className="scroll-thin max-h-[60vh] overflow-y-auto"><table className="w-full text-xs"><tbody>{ec.mapping.map((m) => <tr key={m.eskiKod} className="border-t border-krem-200"><td className="py-1 font-mono text-gri">{m.eskiKod}</td><td className="py-1 font-mono font-semibold">{m.turkceKod}</td><td className="py-1">{m.ad}</td></tr>)}</tbody></table></div></div>
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
      <div className="kart space-y-3 p-4"><h3 className="font-semibold text-lacivert">Logolar</h3>{['sb-bilirkisilik-adaletin-guvencesi.png', 'tubir.png', 'sb-bilirkisilik.png'].map((f) => <div key={f} className="flex items-center gap-3 text-xs"><img src={`/brand/${f}`} alt="" className="h-14 w-14 rounded bg-white object-contain p-1" /><div><div className="font-mono">{f}</div><div className="text-gri">public/brand/ — değiştirmek için dosyayı aynı adla yenileyin</div></div></div>)}</div>
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
      <div className="flex items-center gap-3"><label className="btn-outline cursor-pointer">İçerik paketi yükle (.json)<input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPack(f) }} /></label><span className="text-xs text-gri">İçerik paketi (yalnız JSON): yeni etken grupları, listeler. Hesap modülleri kod + manifest ile derleme zamanında kaydedilir.</span></div>
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
      <div className="kart p-4 text-sm"><Toggle checked={settings.showExcelRefs} onChange={(v) => update({ showExcelRefs: v })} label="Excel kaynak izlerini göster (sayfa adları, hücre referansları) — kullanıcıya gösterilmek istenmiyorsa kapatın" /><div className="mt-2"><Toggle checked={settings.showDrafts} onChange={(v) => update({ showDrafts: v })} label="Taslak etken gruplarını (6., 7., 10., 11., dorse, 8.11+, 9.9+) navigasyonda göster" /></div><div className="mt-2"><Toggle checked={settings.reportShowDrafts} onChange={(v) => update({ reportShowDrafts: v })} label="Taslak kartları raporda göster" /></div><div className="mt-2 flex items-center gap-3"><span>"Aranmadı" kartları raporda:</span><Segmented options={['tam', 'kisa', 'gizle'] as const} value={settings.reportAranmadi} onChange={(v) => v && update({ reportAranmadi: v })} /></div><div className="mt-2"><Field label="Varlık üst sınırı (araç/sürücü/yaya/yolcu)"><TextInput type="number" min={1} max={20} value={settings.entityLimit} onChange={(v) => update({ entityLimit: Math.max(1, Number(v) || 6) })} className="!w-24" /></Field></div></div>
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

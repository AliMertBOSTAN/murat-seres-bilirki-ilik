import { useEffect, useState } from 'react'
import { useCaseStore } from '@/store/caseStore'
import { listItems, PARTY_LABELS, REPORT_META } from '@/content'
import { ILLER, getIlceler, getMahalleler } from '@/data/reference'
import { Field, Select, TextInput, ComboInput, PageHeader, Badge } from '@/ui/primitives'
import type { DosyaTuru } from '@/model/case'
import { listCases, deleteCase, loadCaseById } from '@/store/db'
import { exportCaseJson, importCaseJson } from '@/lib/io'
import { importFromExcel } from '@/lib/excelImport'
import { useSettingsStore } from '@/store/settingsStore'

export function GirisPage() {
  const c = useCaseStore((s) => s.caseData)
  const setField = useCaseStore((s) => s.setField)
  const loadSample = useCaseStore((s) => s.loadSample)
  const newCase = useCaseStore((s) => s.newCase)
  const loadCase = useCaseStore((s) => s.loadCase)
  const setTitle = useCaseStore((s) => s.setTitle)
  const [mahalleler, setMahalleler] = useState<string[]>([])
  const [cases, setCases] = useState<{ id: string; title: string; updatedAt: string }[]>([])
  useEffect(() => { void getMahalleler(c.dosya.il, c.dosya.ilce).then(setMahalleler) }, [c.dosya.il, c.dosya.ilce])
  useEffect(() => { void listCases().then((rows) => setCases(rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt })))) }, [c.updatedAt])
  const settings = useSettingsStore((s) => s.settings)
  const setField2 = setField
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const sets = (PARTY_LABELS as { sets: { id: string; title: string }[] }).sets
  const meta = REPORT_META as unknown as Record<string, string>

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader sheet="Giriş" title="Kapak ve Dosya Kimliği" subtitle="Excel'deki Giriş sayfasının karşılığı. İl → ilçe → mahalle bağımlı listeleri Tanım'daki COUNTIF/VLOOKUP motoru yerine indeksli referans veriden gelir." next={{ to: '/dosya/veri', label: 'Veri Girişi (Grş 1)' }}
        actions={<>
          <button className="btn-primary" onClick={() => loadSample()} title="Excel'deki örnek veriyi (Bursa / İnegöl, 01.09.2025 17:45 …) tek tıkla yükle">★ Örnek dosyayı yükle</button>
          <button className="btn-outline" onClick={() => newCase()}>Yeni dosya</button>
          <button className="btn-outline" onClick={() => exportCaseJson(c)}>.seres.json</button>
          <label className="btn-outline cursor-pointer">İçe aktar<input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCaseJson(f).then((cc) => cc && loadCase(cc)) }} /></label>
          <label className="btn-outline cursor-pointer" title="EĞİTİM 001.xlsx benzeri bir dosyanın Giriş, Grş 1 ve kart girişlerini okur (content/core/excel-map.json)">Excel'den içe aktar<input type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFromExcel(f, settings.lastHash).then(({ caseData, report }) => { loadCase(caseData); setImportMsg(`${report.fields} alan, ${report.entries} kart girişi alındı.${report.warnings.length ? ' Uyarılar: ' + report.warnings.join(' ') : ''}`) }).catch((err) => setImportMsg(`Excel okunamadı: ${String(err)}`)) }} /></label>
        </>} />
      {importMsg && <div className="mb-4 rounded-lg bg-camgobegi-100 px-3 py-2 text-sm text-lacivert">{importMsg} <button className="ml-2 text-xs underline" onClick={() => setImportMsg(null)}>kapat</button></div>}
      {c.settingsVersionHash && c.settingsVersionHash !== settings.lastHash && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-altin/60 bg-altin-100 px-3 py-2 text-sm text-bronz">Bu dosya ayar sürümü <b>#{c.settingsVersionHash}</b> ile oluşturuldu; yürürlükteki sürüm <b>#{settings.lastHash}</b>. Dosya kendi dondurulmuş sürümüyle gösteriliyor.<button className="btn-outline !py-1 text-xs" onClick={() => setField2('settingsVersionHash', settings.lastHash)}>Yeni sürüme yükselt</button></div>}

      <section className="kart mb-6 overflow-hidden">
        <div className="grid items-center gap-6 bg-gradient-to-br from-kagit via-krem to-altin-100/60 p-8 md:grid-cols-[auto_1fr_auto]">
          <img src="/brand/sb-bilirkisilik-adaletin-guvencesi.png" alt="SB Bilirkişilik — Adaletin Güvencesi" className="h-44 w-auto object-contain drop-shadow" />
          <div className="text-center">
            <ComboInput options={listItems('tanim-e86-e113')} value={c.dosya.firma ?? ''} onChange={(v) => setField('dosya.firma', v)} className="!border-0 !bg-transparent text-center !font-display !text-3xl !font-semibold !text-lacivert !shadow-none" aria-label="Kurum / firma" />
            <div className="hr-altin my-2" />
            <Select options={listItems('rapor-turu')} value={c.dosya.raporTuru ?? ''} onChange={(v) => setField('dosya.raporTuru', v)} className="!border-0 !bg-transparent text-center !font-display !text-xl !text-bronz !shadow-none" aria-label="Rapor türü" />
            <div className="mt-3 text-xs text-gri">Dok.No {meta.dokNo} · Rev. {meta.revizyonNo}</div>
          </div>
          <img src="/brand/tubir.png" alt="TÜBİR" className="h-28 w-auto object-contain" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="kart p-5">
          <h2 className="mb-4 text-xl font-semibold text-lacivert">Dosya kimliği</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dosya başlığı (uygulama içi)"><TextInput value={c.title} onChange={setTitle} /></Field>
            <Field label="Personel adı" source="Giriş!M7"><ComboInput options={listItems('personel')} value={c.dosya.personel ?? ''} onChange={(v) => setField('dosya.personel', v)} /></Field>
            <Field label="İl" source="Giriş!M8 ← Tanım!G4:G85"><Select options={ILLER} value={c.dosya.il ?? ''} onChange={(v) => setField('dosya.il', v)} /></Field>
            <Field label="İlçe (bağımlı)" source="Giriş!M9 ← Tanım!AD3:AD92"><Select options={getIlceler(c.dosya.il)} value={c.dosya.ilce ?? ''} onChange={(v) => setField('dosya.ilce', v)} disabled={!c.dosya.il} /></Field>
            <Field label="Mahalle / köy (bağımlı)" source="Giriş!M10 ← Tanım!AF3:AF150" hint={mahalleler.length ? `${mahalleler.length} kayıt` : c.dosya.ilce ? 'Bu ilçe için mahalle verisi yok; elle yazın.' : undefined}><ComboInput options={mahalleler} value={c.dosya.mahalle ?? ''} onChange={(v) => setField('dosya.mahalle', v)} disabled={!c.dosya.ilce} /></Field>
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <Field label="Mahkeme no" source="Giriş!M11"><TextInput type="number" min={1} value={c.dosya.mahkemeNo ?? ''} onChange={(v) => setField('dosya.mahkemeNo', v === '' ? null : Number(v))} /></Field>
              <Field label="Mahkeme" source="Giriş!N11 ← Tanım!B46:B61"><Select options={listItems('mahkeme')} value={c.dosya.mahkemeAdi ?? ''} onChange={(v) => setField('dosya.mahkemeAdi', v)} /></Field>
            </div>
            <Field label="Dosya türü (taraf etiket seti)" source="Tanım!A64:D79" hint="Excel'de Giriş!M11 hem mahkeme numarası hem etiket seti seçiciydi (tutarsızlık #4). Burada ayrı alan.">
              <Select options={sets.map((s) => ({ value: s.id, label: s.title }))} value={c.dosya.dosyaTuru ?? 'ceza'} onChange={(v) => setField('dosya.dosyaTuru', v as DosyaTuru)} placeholder="Dosya türü" />
            </Field>
            <Field label="Dosya no" source="Giriş!M12"><TextInput value={c.dosya.dosyaNo ?? ''} onChange={(v) => setField('dosya.dosyaNo', v)} placeholder="2025/216 ESAS" /></Field>
            <Field label="Suç / kaza türü" source="Giriş!M13 ← Tanım!D60:D76"><Select options={listItems('suc-turu')} value={c.dosya.suc ?? ''} onChange={(v) => setField('dosya.suc', v)} /></Field>
          </div>
          <div className="mt-4 rounded-lg bg-krem p-3 text-sm">
            <span className="etiket">Rapor başlığı (3!B8)</span>
            <div className="font-display text-lg text-lacivert">{[c.dosya.mahkemeNo, c.dosya.mahkemeAdi, c.dosya.raporTuru].filter(Boolean).join(' ') || '—'}</div>
          </div>
        </section>
        <aside className="space-y-4">
          <section className="kart p-4">
            <h3 className="mb-2 text-base font-semibold text-lacivert">Kayıtlı dosyalar <Badge tone="gri">{cases.length}</Badge></h3>
            <ul className="space-y-1 text-sm">
              {cases.map((r) => (
                <li key={r.id} className={`flex items-center justify-between rounded px-2 py-1 ${r.id === c.id ? 'bg-camgobegi-100' : 'hover:bg-krem'}`}>
                  <button className="truncate text-left" onClick={() => { if (r.id !== c.id) void loadCaseById(r.id).then((cc) => cc && loadCase(cc)) }}>{r.title}<span className="block text-[10px] text-gri">{new Date(r.updatedAt).toLocaleString('tr-TR')}</span></button>
                  {r.id !== c.id && <button className="text-[11px] text-gri hover:text-red-600" onClick={() => void deleteCase(r.id).then(() => setCases((x) => x.filter((y) => y.id !== r.id)))}>sil</button>}
                </li>
              ))}
              {cases.length === 0 && <li className="text-gri">Henüz kayıt yok. Veriler tarayıcıda (IndexedDB) saklanır.</li>}
            </ul>
          </section>
          <section className="kart p-4 text-xs text-gri">
            <div className="etiket mb-1">Sürüm bilgisi</div>
            İçerik v{c.contentVersion} · Ayar hash <b>{c.settingsVersionHash}</b><br />Oluşturma {new Date(c.createdAt).toLocaleDateString('tr-TR')}
          </section>
        </aside>
      </div>
    </div>
  )
}

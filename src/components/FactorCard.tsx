import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FactorDef, FactorEntry, FactorResult } from '@/engine/types'
import { INCELEME_DURUMLARI } from '@/engine/types'
import { listItems, listIdForCell, effectiveEvidenceCodes, loadLibraryRows } from '@/content'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { StatusChip } from '@/ui/StatusChip'
import { Badge, ComboInput, Drawer, Segmented, Select, TextArea, TextInput } from '@/ui/primitives'
import { cn } from '@/ui/cn'
import { ProvenancePanel } from './ProvenancePanel'
import { ModuleSuggestionStrip } from './ModuleSuggestionStrip'
import { excelText } from '@/engine/excel-compat'
import inputFields from '@content/core/input-fields.json'

const INPUT_LABELS: Record<string, string> = Object.fromEntries((inputFields.grs1 as { path: string; label: string }[]).map((f) => [f.path, f.label]))

export function FactorCard({ def, entityIndex, entry, result, compact = false }: { def: FactorDef; entityIndex: number | null; entry: FactorEntry | undefined; result: FactorResult; compact?: boolean }) {
  const updateEntry = useCaseStore((s) => s.updateEntry)
  const settings = useSettingsStore((s) => s.settings)
  const [why, setWhy] = useState(false)
  const [openAciklama, setOpenAciklama] = useState(!compact)
  const [openLib, setOpenLib] = useState(false)
  const [libRows, setLibRows] = useState<{ row: number; cells: Record<string, unknown> }[] | null>(null)
  const openLibrary = () => { setOpenLib(true); if (!libRows) void loadLibraryRows(def).then(setLibRows) }
  const patch = (p: Partial<FactorEntry>) => updateEntry(def.id, entityIndex, p)
  const tespit = { yontemler: entry?.tespit?.yontemler ?? [], puanlar: entry?.tespit?.puanlar ?? [], delilKodu: entry?.tespit?.delilKodu ?? null, dogrulama: entry?.tespit?.dogrulama ?? null }
  const vs = def.valueSource as { kind: string; path?: string; cell?: string; listId?: string }
  const isInput = vs.kind === 'input'
  const inputPath = isInput && vs.path ? vs.path.replace('[]', `[${entityIndex ?? 0}]`) : null
  const valueOptions = useMemo(() => {
    // Ayarlarda değer kaynağı listesi (valueSource.listId) seçilmişse önce o kullanılır.
    if (vs.listId) return settings.listOverrides[vs.listId] ?? listItems(vs.listId)
    const fromOptions = def.options.filter((o) => !/[:：]\s*$/.test(o.label) && o.label.trim() !== def.subTitle.trim()).map((o) => o.label.trim())
    if (fromOptions.length) return Array.from(new Set(fromOptions))
    const lid = def.sourceRef.sheet ? listIdForCell(def.sourceRef.sheet, `E${(def.sourceRef.statusRow ?? 0) - 1}`) : undefined
    return listItems(lid)
  }, [def, vs.listId, settings.listOverrides])
  const yontemList = listItems('tespit-yontemi')
  const sorumluList = listItems('sorumlu')
  const hakimList = listItems('hakim-savci-tespit')
  const dogrulamaList = listItems('tespit-dogrulama')
  // Delil kodları: paket + Ayarlar › Delil Kodları katmanı (eklenen/düzenlenen/gizlenen).
  const delilList = useMemo(() => effectiveEvidenceCodes(settings).map((c) => ({ value: c.kod, label: c.ad ? `${c.kod} — ${c.ad}` : c.kod })), [settings])
  const warnings: string[] = []
  if (!result.durumDefined) warnings.push('Bu İnceleme Durumu için Excel kuralı tanımsız (FALSE).')
  const ek = def.ekDosya as { on?: string }
  if (ek.on === 'sorumlu') warnings.push('Excel: Ek dosya bayrağı Sorumlu satırına bakıyor (tutarsızlık #28).')
  const draft = def.draft
  const code = def.displayCode || ''

  return (
    <article id={`kart-${def.id}-${entityIndex ?? 0}`} className={cn('kart overflow-hidden', draft && 'border-dashed')}>
      {/* Üst şerit */}
      <header className="flex flex-wrap items-center gap-3 border-b border-krem-200 bg-white/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {code && <span className="font-mono text-xs font-semibold text-camgobegi">{code}</span>}
            <h3 className="truncate text-lg font-semibold text-lacivert" title={def.title}>{def.title.replace(/^\s*[\d.]+\s*/, '')}</h3>
            {draft && <Badge tone="altin" title="Excel rapor sayfalarında kullanılmayan kütüphane başlığı">taslak</Badge>}
            {def.perEntity && <Badge tone="gri">{def.perEntity} {(entityIndex ?? 0) + 1}</Badge>}
          </div>
          {def.aranan && <p className="mt-0.5 truncate text-xs text-gri" title={def.aranan}>{def.aranan}</p>}
        </div>
        {result.ekDosyaBayragi && (
          <button className="rounded-full border border-altin/60 bg-altin-100 px-2.5 py-1 text-[11px] font-semibold text-bronz hover:bg-altin/30" title="Kanıt / ek dosya yükleme alanı" onClick={() => document.getElementById(`ekler-${def.id}-${entityIndex ?? 0}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            📎 {result.ekDosyaBayragi.trim() || 'Ek dosya gerekli'}
          </button>
        )}
        <StatusChip value={result.durum} defined={result.durumDefined} size="lg" />
        <button className="btn-outline !py-1 text-xs" onClick={() => setWhy(true)} title="Bu sonuç hangi girdi ve kuraldan geldi?">Neden?</button>
      </header>

      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Sol: değer, inceleme, kazada durumu, metinler */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between"><span className="etiket">{def.subTitle || 'Değer'}</span>{isInput && <Badge tone="cam" title={settings.showExcelRefs ? `Kaynak: ${vs.cell}` : 'Veri Girişi sayfasından gelir'}>{settings.showExcelRefs ? "Grş 1'den" : 'Veri Girişi'}</Badge>}</div>
              {isInput ? (
                <Link to={`/dosya/veri#${inputPath}`} className="input block truncate bg-krem text-left hover:border-camgobegi" title={`${INPUT_LABELS[vs.path ?? ''] ?? vs.path} alanına git`}>{result.valueText || <span className="text-gri">— Grş 1'de doldurulmamış —</span>}</Link>
              ) : valueOptions.length ? (
                <ComboInput options={valueOptions} value={entry?.selectedValue ?? ''} onChange={(v) => patch({ selectedValue: v })} placeholder="Seçin veya yazın" />
              ) : (
                <TextInput value={entry?.selectedValue ?? ''} onChange={(v) => patch({ selectedValue: v })} placeholder="Değer" />
              )}
              {def.ekDosya.kind === 'manual' && <div className="mt-2"><span className="etiket">Alt seçim</span><TextInput value={entry?.altSecim ?? ''} onChange={(v) => patch({ altSecim: v })} placeholder={excelText(def.ekDosya.value)} /></div>}
            </div>
            <div>
              <span className="etiket mb-1 block">İnceleme Durumu</span>
              <Segmented options={INCELEME_DURUMLARI} value={(entry?.incelemeDurumu as typeof INCELEME_DURUMLARI[number]) ?? ''} onChange={(v) => patch({ incelemeDurumu: v })} size="xs" />
            </div>
          </div>

          <div className="rounded-lg border border-krem-200 bg-white px-3 py-2">
            <div className="flex items-center justify-between"><span className="etiket">Kazada Durumu</span>{result.degerDurumMetni && <span className="text-[11px] text-gri">{result.degerDurumMetni}</span>}</div>
            <p className="mt-1 text-sm">{result.kazadaDurumu || <span className="text-gri">—</span>}</p>
          </div>

          <div>
            <button className="flex w-full items-center justify-between text-left" onClick={() => setOpenAciklama((v) => !v)}>
              <span className="etiket">Açıklama ve Nedensellik <span className="ml-1 font-normal normal-case tracking-normal text-gri">(kütüphaneden{def.textLevel === 'option' ? ', seçeneğe özel' : def.textLevel === 'factor' ? ', etkene özel' : ''})</span></span>
              <span className="text-xs text-gri">{openAciklama ? '▾' : '▸'}</span>
            </button>
            {openAciklama && (
              <div className="mt-2 space-y-2 text-sm leading-relaxed">
                <TextBlock label="Açıklama" text={result.aciklama} />
                <TextBlock label="Nedensellik" text={result.nedensellik} />
                {result.extra.map((e, i) => <TextBlock key={i} label={e.label} text={e.text} />)}
              </div>
            )}
          </div>

          <div>
            <span className="etiket mb-1 block">Müteala <span className="font-normal normal-case tracking-normal text-gri">(bilirkişi)</span></span>
            <TextArea value={entry?.muteala ?? ''} onChange={(v) => patch({ muteala: v })} placeholder="Bilirkişi mütalaası…" />
            {entry?.excelMuteala && !entry.muteala && <button className="mt-1 text-[11px] text-camgobegi hover:underline" onClick={() => patch({ muteala: String(entry.excelMuteala) })}>Excel örneğindeki metni al: “{String(entry.excelMuteala).slice(0, 60)}”</button>}
          </div>

          <TextBlock label="Sorun açıklama" text={result.sorunAciklama} auto />
        </div>

        {/* Sağ: tespit, sorumlu, ekler, uyarılar */}
        <div className="space-y-4">
          <ModuleSuggestionStrip def={def} entityIndex={entityIndex} result={result} entry={entry} />
          <div className="rounded-lg border border-krem-200 bg-white p-3">
            <span className="etiket mb-2 block">Tespit Yöntemi</span>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => <Select key={i} options={yontemList.map((y) => y.trim().replace(/,$/, ''))} value={(tespit.yontemler[i] ?? '').trim().replace(/,$/, '')} onChange={(v) => { const y = [...tespit.yontemler]; y[i] = v; patch({ tespit: { ...tespit, yontemler: y } }) }} placeholder={`Yöntem ${i + 1}`} className="!px-2 !text-xs" />)}
            </div>
            <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2">
              <div>
                <span className="etiket">Delil Kodu</span>
                <Select options={delilList} value={tespit.delilKodu ?? ''} onChange={(v) => patch({ tespit: { ...tespit, delilKodu: v } })} className="!text-xs" />
              </div>
              <div>
                <span className="etiket">Puan</span>
                <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <input key={i} type="number" min={0} max={5} className="input !w-11 !px-1 text-center !text-xs" value={tespit.puanlar[i] ?? ''} onChange={(e) => { const p = [...tespit.puanlar]; p[i] = e.target.value === '' ? null : Number(e.target.value); patch({ tespit: { ...tespit, puanlar: p } }) }} />)}</div>
              </div>
            </div>
            <div className="mt-2">
              <span className="etiket">Tespit doğrulama</span>
              <Segmented options={dogrulamaList as string[]} value={tespit.dogrulama ?? ''} onChange={(v) => patch({ tespit: { ...tespit, dogrulama: v } })} size="xs" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div><span className="etiket">Sorumlu Tespiti</span><Select options={sorumluList} value={entry?.sorumlu ?? ''} onChange={(v) => patch({ sorumlu: v })} className="!text-xs" /></div>
            <div><span className="etiket">Hâkim / Savcı Tespit</span><Select options={hakimList} value={entry?.hakimSavciTespit ?? ''} onChange={(v) => patch({ hakimSavciTespit: v })} className="!text-xs" /></div>
          </div>
          <Ekler def={def} entityIndex={entityIndex} entry={entry} />
          {warnings.length > 0 && <ul className="space-y-1 text-[11px] text-amber-800">{warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul>}
          <div className="text-[10px] text-gri">
            {settings.showExcelRefs && <>Kaynak: {def.sourceRef.sheet ? `Sayfa ${def.sourceRef.sheet} satır ${def.sourceRef.titleRow}` : 'Tanım kütüphanesi'} ← {def.sourceRef.library.sheet}!{def.sourceRef.library.cell} · profil <b>{settings.engine.statusProfileOverride ?? def.statusProfile}</b>
            {(def.libraryRowCount ?? 0) > 0 && <button className="ml-2 text-camgobegi hover:underline" onClick={openLibrary}>kütüphane satırları ({def.libraryRowCount})</button>}</>}
            {!settings.showExcelRefs && <>Bilgi bankası: {def.id} · profil <b>{settings.engine.statusProfileOverride ?? def.statusProfile}</b></>}
          </div>
        </div>
      </div>

      <Drawer open={why} onClose={() => setWhy(false)} title={`Neden? — ${def.title}`}><ProvenancePanel def={def} result={result} /></Drawer>
      <Drawer open={openLib} onClose={() => setOpenLib(false)} title={`Kütüphane satırları — ${def.sourceRef.library.sheet}!${def.sourceRef.library.cell}`} width="lg">
        <table className="w-full text-xs"><tbody>
          {(libRows ?? []).map((r) => <tr key={r.row} className="border-b border-krem-200 align-top"><td className="py-1 pr-2 font-mono text-gri">{r.row}</td><td className="py-1">{Object.entries(r.cells).map(([c, v]) => <div key={c}><span className="font-mono text-camgobegi">{c}</span> {String(v)}</div>)}</td></tr>)}
        </tbody></table>
        {!libRows && <p className="text-sm text-gri">Yükleniyor…</p>}
      </Drawer>
    </article>
  )
}

function TextBlock({ label, text, auto }: { label: string; text: string; auto?: boolean }) {
  if (!text && auto) return null
  return (
    <div className="rounded-lg bg-krem/60 px-3 py-2">
      <span className="etiket">{label}{auto && <span className="ml-1 font-normal normal-case tracking-normal text-gri">(otomatik)</span>}</span>
      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{text || <span className="text-gri">—</span>}</p>
    </div>
  )
}

function Ekler({ def, entityIndex, entry }: { def: FactorDef; entityIndex: number | null; entry: FactorEntry | undefined }) {
  const updateEntry = useCaseStore((s) => s.updateEntry)
  const ekler = entry?.ekler ?? []
  const add = async (files: FileList | null) => {
    if (!files) return
    const { db } = await import('@/store/db')
    const caseId = useCaseStore.getState().caseData.id
    const next = [...ekler]
    for (const f of Array.from(files)) {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      try { await db.blobs.put({ id, caseId, name: f.name, type: f.type, size: f.size, blob: f }) } catch { /* yok say */ }
      next.push({ id, name: f.name, type: f.type, size: f.size })
    }
    updateEntry(def.id, entityIndex, { ekler: next })
  }
  return (
    <div id={`ekler-${def.id}-${entityIndex ?? 0}`} className="rounded-lg border border-dashed border-krem-200 p-3">
      <div className="flex items-center justify-between"><span className="etiket">Ekler / kanıt</span><label className="btn-ghost !py-0.5 text-xs cursor-pointer">+ Dosya<input type="file" multiple className="hidden" onChange={(e) => void add(e.target.files)} /></label></div>
      {ekler.length === 0 ? <p className="text-[11px] text-gri">Fotoğraf, kroki, tutanak… (Excel'deki "Ek dosya hazırla" karşılığı)</p> : (
        <ul className="mt-1 space-y-0.5 text-xs">{ekler.map((e) => <li key={e.id} className="flex justify-between"><span className="truncate">📄 {e.name}</span><button className="text-gri hover:text-red-600" onClick={() => updateEntry(def.id, entityIndex, { ekler: ekler.filter((x) => x.id !== e.id) })}>sil</button></li>)}</ul>
      )}
    </div>
  )
}


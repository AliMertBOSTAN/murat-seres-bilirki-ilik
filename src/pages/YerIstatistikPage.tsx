import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { CONSTANTS, ISTATISTIK_METINLERI, listItems } from '@/content'
import { computeIstatistik, type IstatistikRef, type IstatistikResult } from '@/engine/istatistik'
import { loadIstatistikRef } from '@/data/reference'
import { Field, TextInput, ComboInput, Select, PageHeader, Badge, Drawer } from '@/ui/primitives'
import { formatNumberTR, formatDateTR, weekdayTR, formatTimeTR } from '@/engine/excel-compat'

const C = CONSTANTS as { oranSabitleri: Record<string, number>; riskKatsayisi_AC12: number; siklikTablosu: { etiket: string; katsayi: number; cell: string }[]; siklikEslemesi_AD14: Record<string, string> }
const SIKLIK_SECENEK = Object.keys(C.siklikEslemesi_AD14)

export function YerIstatistikPage() {
  const c = useCaseStore((s) => s.caseData)
  const setField = useCaseStore((s) => s.setField)
  const settings = useSettingsStore((s) => s.settings)
  const [ref, setRef] = useState<(IstatistikRef & { meta: Record<string, string> }) | null>(null)
  const [why, setWhy] = useState(false)
  useEffect(() => { void loadIstatistikRef().then((r) => setRef(r as unknown as IstatistikRef & { meta: Record<string, string> })) }, [])
  const ist = c.istatistik as Record<string, unknown>
  const saat = (ist.saatler ?? {}) as Record<string, string>
  const res: IstatistikResult | null = useMemo(() => ref ? computeIstatistik({ il: c.dosya.il, ilce: c.dosya.ilce, yolKesimNo: ist.yolKesimNo as string, yon: Number(ist.yon) || 0, hareket: Number(ist.hareket) || 0, yayaKatsayi: Number(ist.yayaKatsayi) || 0, aracKatsayi: Number(ist.aracKatsayi) || 0, siklikArac: ist.siklikArac as string, siklikYaya: ist.siklikYaya as string, siklikAracCarpan: Number(ist.siklikAracCarpan) || 0, siklikYayaCarpan: Number(ist.siklikYayaCarpan) || 0 }, ref,
    { sabit1: C.oranSabitleri.sabit1_D23, sabit2: C.oranSabitleri.sabit2_G23, sabit3: C.oranSabitleri.sabit3_K23, sabit4: C.oranSabitleri.sabit4_O23, riskKatsayisi: C.riskKatsayisi_AC12, siklikTablosu: C.siklikTablosu, siklikEslemesi: C.siklikEslemesi_AD14, duzeltilmisSiklik: settings.duzeltmeler.siklikEslemesi }) : null, [c, ref, settings.duzeltmeler.siklikEslemesi, ist])
  const kesimler = useMemo(() => ref ? ref.kgm.filter((k) => k.key).map((k) => k.key as string) : listItems('yol-kesim'), [ref])
  const blocks = (ISTATISTIK_METINLERI as { blocks: { title: string; cell: string; items: { text: string; weight?: number }[] }[] }).blocks
  const secimler = (ist.metinSecimleri ?? {}) as Record<string, string[]>
  const toggle = (blockTitle: string, text: string) => { const cur = secimler[blockTitle] ?? []; setField(`istatistik.metinSecimleri.${blockTitle.replace(/[.\[\]]/g, '')}`, cur.includes(text) ? cur.filter((t) => t !== text) : [...cur, text]) }
  const risk = (v: number) => (v <= 5 ? '#92D050' : v <= 10 ? '#00B0F0' : v <= 15 ? '#FFC000' : '#FF0000')
  const n = (v: unknown) => (typeof v === 'number' ? v : null)

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader sheet="2." title="2. Kaza Yeri, Zaman, İstatistik ve Risk" subtitle="Nüfus / taşıt / km kaza oranları (Rn, Rt, Rk), KGM kesim bilgisi ve risk-sıklık zinciri Excel formülleriyle birebir hesaplanır. Referans veriler Ayarlar'dan güncellenebilir." next={{ to: '/analiz/yol-cevre', label: '3. Yol ve Çevre' }}
        actions={<button className="btn-outline" onClick={() => setWhy(true)}>Neden?</button>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="kart p-4 lg:col-span-1">
          <h3 className="mb-3 text-base font-semibold text-lacivert">1.1 Kazanın yeri ve zamanı</h3>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-gri">1.2 Tarih</dt><dd>{formatDateTR(c.kazaYeri.tarih) || '—'}</dd>
            <dt className="text-gri">1.3 Gün</dt><dd>{weekdayTR(c.kazaYeri.tarih) || '—'}</dd>
            <dt className="text-gri">1.4 Saat</dt><dd>{formatTimeTR(c.kazaYeri.saat) || '—'}</dd>
            <dt className="text-gri">1.5–1.7 Yer</dt><dd>{[c.dosya.il, c.dosya.ilce, c.dosya.mahalle].filter(Boolean).join(' / ') || '—'}</dd>
            <dt className="text-gri">1.8 Adres</dt><dd>{String(c.kazaYeri.adres ?? '—')}</dd>
          </dl>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[['olay', 'Olay saati', 'M13'], ['incelemeBaslama', 'İnceleme başlama', 'Q13'], ['ambulans', 'Ambulans geliş', 'U13'], ['ihbar', 'Kaza ihbar saati', 'Y13']].map(([k, l, cell]) => <Field key={k} label={l} source={`2.!${cell}`}><TextInput type="time" value={formatTimeTR(saat[k])} onChange={(v) => setField(`istatistik.saatler.${k}`, v)} /></Field>)}
          </div>
        </section>
        <section className="kart p-4 lg:col-span-2">
          <h3 className="mb-3 text-base font-semibold text-lacivert">İl / ilçe / yol kesimi verileri {ref && <Badge tone="gri">TÜİK {ref.meta.il} · KGM</Badge>}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Yol No / Kesim No" source="2.!J15 ← Tanım!AP2:AP53"><ComboInput options={kesimler} value={(ist.yolKesimNo as string) ?? ''} onChange={(v) => setField('istatistik.yolKesimNo', v)} placeholder="750-09.0" /></Field>
            <Field label="Yolun yönü" source="2.!U15"><Select options={[1, 2, 3, 4, 5, 6, 7].map((x) => ({ value: String(x), label: `${x} Yönlü` }))} value={String(ist.yon ?? '')} onChange={(v) => setField('istatistik.yon', Number(v))} /></Field>
            <Field label="Yolun hareketi" source="2.!X15"><Select options={Array.from({ length: 23 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} Hareketli` }))} value={String(ist.hareket ?? '')} onChange={(v) => setField('istatistik.hareket', Number(v))} /></Field>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {[['İl nüfus', res?.ilNufus, 'E14'], ['İlçe nüfus', res?.ilceNufus, 'E15'], ['İl araç', res?.ilArac, 'E16'], ['İl kaza', res?.ilKaza, 'E17'], ['Yolu kull. araç', res?.yoluKullananArac, 'O15'], ['Yol km', res?.yolKm, 'R15'], ['Yol kazası (5 yıl)', res?.yolKazasi, 'R17'], ['İlçe kazası (5 yıl)', res?.ilceKazasi, 'N17'], ['Kamyon hızı', res?.kamyonHizi, 'AC17'], ['%85 hız', res?.kamyonHiziFazla, 'AG17']].map(([l, v, cell]) => (
              <div key={String(l)} className="rounded-lg bg-krem p-2"><div className="etiket">{l}</div><div className="font-mono text-sm font-semibold text-lacivert">{v === null || v === undefined ? '—' : typeof v === 'number' ? v.toLocaleString('tr-TR') : String(v)}</div><div className="text-[9px] text-gri">2.!{cell}</div></div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {[['Rn', 'Nüfus üzerinden kaza oranı', res?.Rn, 'B24 = E17×D23/E14×100'], ['Rt', 'Taşıt sayısı üzerinden kaza oranı', res?.Rt, 'J24 = E17×D23/E16×100'], ['Rk', 'Taşıt-km üzerinden kaza oranı', res?.Rk, 'R24 = R15×D23/O15×100 (etiket farklı — #6)']].map(([k, l, v, f]) => (
          <section key={String(k)} className="kart p-4">
            <div className="flex items-baseline justify-between"><h3 className="text-base font-semibold text-lacivert">{k}</h3><span className="text-[10px] text-gri">{f}</span></div>
            <div className="text-xs text-gri">{l}</div>
            <div className="mt-2 font-display text-4xl font-semibold text-lacivert">{v === '' || v === undefined ? '—' : formatNumberTR(v as number, 4)}</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-krem-200"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ((v as number) || 0) * 10)}%`, background: risk(((v as number) || 0) * 2) }} /></div>
          </section>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="kart p-4">
          <h3 className="mb-3 text-base font-semibold text-lacivert">Risk ve olası sıklık</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Yaya katsayısı" source="2.!U17 ← Tanım!AB2:AB27"><TextInput type="number" value={n(ist.yayaKatsayi) ?? ''} onChange={(v) => setField('istatistik.yayaKatsayi', Number(v))} /></Field>
            <Field label="Araç katsayısı" source="2.!X17"><TextInput type="number" value={n(ist.aracKatsayi) ?? ''} onChange={(v) => setField('istatistik.aracKatsayi', Number(v))} /></Field>
            <Field label="Olası sıklık (araç)" source="2.!E63"><Select options={SIKLIK_SECENEK} value={(ist.siklikArac as string) ?? ''} onChange={(v) => setField('istatistik.siklikArac', v)} /></Field>
            <Field label="Çarpan J63"><TextInput type="number" step="0.01" value={n(ist.siklikAracCarpan) ?? ''} onChange={(v) => setField('istatistik.siklikAracCarpan', Number(v))} /></Field>
            <Field label="Olası sıklık (yaya)" source="2.!E64"><Select options={SIKLIK_SECENEK} value={(ist.siklikYaya as string) ?? ''} onChange={(v) => setField('istatistik.siklikYaya', v)} /></Field>
            <Field label="Çarpan J64"><TextInput type="number" step="0.01" value={n(ist.siklikYayaCarpan) ?? ''} onChange={(v) => setField('istatistik.siklikYayaCarpan', Number(v))} /></Field>
          </div>
          {res && (
            <div className="mt-3 h-44">
              <ResponsiveContainer><BarChart data={[{ k: 'AC13', v: res.AC13 }, { k: 'AC14', v: res.AC14 }, { k: 'AD14', v: res.AD14 }, { k: 'AC15', v: res.AC15 }, { k: 'AD15', v: res.AD15 }]}><XAxis dataKey="k" fontSize={11} /><YAxis fontSize={10} /><Tooltip formatter={(v) => formatNumberTR(Number(v), 5)} /><Bar dataKey="v" radius={[4, 4, 0, 0]}>{['#0E2A47', '#1FA9D6', '#C9A24A', '#1FA9D6', '#C9A24A'].map((col, i) => <Cell key={i} fill={col} />)}</Bar></BarChart></ResponsiveContainer>
            </div>
          )}
          <p className="text-[11px] text-gri">AC13 = yön × hareket × 0,0035 · AC14 = AC13 × yaya kats. · AD14 = AC14 × sıklık × J63 · AC15 = araç kats. × AC13 · AD15 = AC15 × J64. {settings.duzeltmeler.siklikEslemesi ? 'Düzeltilmiş sıklık eşlemesi.' : 'Excel eşlemesi (5 Yıl→Günlük, 10 Yıl→5 Yıllık; tutarsızlık #5).'}</p>
        </section>
        <section className="kart p-4">
          <h3 className="mb-3 text-base font-semibold text-lacivert">Metin blokları (seçilebilir)</h3>
          <div className="scroll-thin max-h-[32rem] space-y-3 overflow-y-auto pr-1">
            {blocks.map((b) => (
              <details key={b.cell} className="rounded-lg border border-krem-200 p-2" open={!!secimler[b.title.replace(/[.\[\]]/g, '')]?.length}>
                <summary className="cursor-pointer text-xs font-semibold text-lacivert">{b.title} <span className="font-normal text-gri">({b.items.length}) · 2.!{b.cell}</span></summary>
                <ul className="mt-1 space-y-0.5">{b.items.map((it) => { const key = b.title.replace(/[.\[\]]/g, ''); const on = (secimler[key] ?? []).includes(it.text); return <li key={it.text}><label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={on} onChange={() => toggle(b.title, it.text)} className="mt-0.5" /><span>{it.text}{it.weight !== undefined && <Badge tone="altin" className="ml-1">ağırlık {it.weight}</Badge>}</span></label></li> })}</ul>
              </details>
            ))}
          </div>
        </section>
      </div>
      <Drawer open={why} onClose={() => setWhy(false)} title="Neden? — Sayfa 2 hesapları">
        <ol className="space-y-2 text-sm">{res?.provenance.map((p, i) => <li key={i}><b>{p.step}:</b> {p.detail}{p.source && <div className="font-mono text-[11px] text-camgobegi">Excel: {p.source}</div>}</li>)}</ol>
      </Drawer>
    </div>
  )
}

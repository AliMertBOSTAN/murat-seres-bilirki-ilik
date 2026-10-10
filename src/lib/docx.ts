import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType } from 'docx'
import type { CaseData } from '@/model/case'
import type { EvaluatedCard } from '@/engine/selectors'
import type { Settings } from '@/store/settingsStore'
import { download } from './io'
import { GROUP_TITLES, CONTENT_VERSION } from '@/content'
import { keyOf } from '@/engine/selectors'
import { formatDateTR } from '@/engine/excel-compat'

/** Rapor içeriği seçimi: bölüm bayrakları (anahtar yoksa dahil) ve hariç tutulan kart anahtarları. */
export interface RaporSecimi { bolumler: Record<string, boolean>; haricKartlar: Set<string> }
export const bolumDahil = (bolumler: Record<string, boolean>, id: string) => bolumler[id] !== false

const cell = (t: string, bold = false, width?: number) => new TableCell({ width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined, children: [new Paragraph({ children: [new TextRun({ text: t, bold, font: 'Times New Roman', size: 20 })] })] })
const p = (t: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number } = {}) => new Paragraph({ alignment: opts.align, children: [new TextRun({ text: t, bold: opts.bold, font: 'Times New Roman', size: opts.size ?? 22 })] })

export async function exportDocx(c: CaseData, _titles: string[], summary: { rows: { title: string; durum: string; muteala: string }[]; etken: number; incelenmeli: number }, all: Map<string, EvaluatedCard>, settings: Settings, secim: RaporSecimi = { bolumler: {}, haricKartlar: new Set() }) {
  const title = [c.dosya.mahkemeNo, c.dosya.mahkemeAdi, c.dosya.raporTuru].filter(Boolean).join(' ')
  const dahil = (id: string) => bolumDahil(secim.bolumler, id)
  const children: (Paragraph | Table)[] = dahil('kapak') ? [
    p(String(c.dosya.firma ?? ''), { bold: true, align: AlignmentType.CENTER, size: 32 }), p(String(c.dosya.raporTuru ?? ''), { align: AlignmentType.CENTER, size: 26 }), p(title, { align: AlignmentType.CENTER }), p(`Dosya No: ${c.dosya.dosyaNo ?? ''} · ${[c.dosya.il, c.dosya.ilce, c.dosya.mahalle].filter(Boolean).join(' / ')} · ${formatDateTR(c.kazaYeri.tarih)}`, { align: AlignmentType.CENTER }), p(''),
  ] : []
  let lastGroup = ''
  for (const k of all.values()) {
    if (k.def.draft && !settings.reportShowDrafts) continue
    // Rapor içeriği seçimi: bölüm kapalıysa veya kart hariç tutulduysa atla
    if (!dahil(k.def.group) || secim.haricKartlar.has(keyOf(k.def.id, k.entityIndex))) continue
    if (k.def.group !== lastGroup) { children.push(new Paragraph({ text: GROUP_TITLES[k.def.group] ?? k.def.group, heading: HeadingLevel.HEADING_1 })); lastGroup = k.def.group }
    const r = k.result, e = k.entry
    children.push(new Paragraph({ text: `${k.def.title}${k.entityIndex !== null ? ` (#${k.entityIndex + 1})` : ''}`, heading: HeadingLevel.HEADING_2 }))
    const rows: [string, string][] = [[k.def.subTitle || 'Değer', r.valueText], ['İnceleme Durumu', r.incelemeDurumu], ['Durum', r.durumDefined ? r.durum : 'Kural tanımsız'], ['Kazada Durumu', r.kazadaDurumu], ['Açıklama', r.aciklama], ['Nedensellik', r.nedensellik], ['Müteala', e?.muteala ?? ''], ['Sorun açıklama', r.sorunAciklama],
      ['Tespit Yöntemi', [(e?.tespit?.yontemler ?? []).filter(Boolean).join(', '), e?.tespit?.delilKodu ? `Delil Kodu ${e.tespit.delilKodu}` : '', e?.tespit?.dogrulama ?? ''].filter(Boolean).join(' · ')], ['Sorumlu', [e?.sorumlu, e?.hakimSavciTespit].filter(Boolean).join(' · ')]]
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows.filter(([, v]) => v).map(([l, v]) => new TableRow({ children: [cell(l, true, 25), cell(v, false, 75)] })) }))
  }
  if (dahil('sonuc')) {
    children.push(new Paragraph({ text: 'SONUÇ', heading: HeadingLevel.HEADING_1 }), p(`${summary.etken} etken, ${summary.incelenmeli} incelenmeli başlık tespit edilmiştir.`))
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell('Başlık', true), cell('Durum', true), cell('Müteala', true)] }), ...summary.rows.map((r) => new TableRow({ children: [cell(r.title), cell(r.durum), cell(r.muteala)] }))] }))
  }
  children.push(p(''), p(`İçerik v${CONTENT_VERSION} · Ayar sürümü ${settings.version} (#${c.settingsVersionHash || settings.lastHash}) · ${new Date().toLocaleString('tr-TR')}`, { size: 16 }))
  const doc = new Document({ sections: [{ children }] })
  download(`${(c.dosya.dosyaNo || 'rapor').toString().replace(/[^\w.-]+/g, '_')}.docx`, await Packer.toBlob(doc))
}

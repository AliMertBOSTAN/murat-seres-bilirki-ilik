/** Kontrol paneli: eksik zorunlu girdi, tanımsız kural, kopuk referans, modül önerisi bekleyen kart, tutarlılık kuralları. */
import type { CaseData } from '@/model/case'
import type { Settings } from '@/store/settingsStore'
import type { EvaluatedCard } from './selectors'
import { FACTOR_BY_ID } from '@/content'
import { eqTR, hourOf } from './excel-compat'

export interface Check { kind: 'eksik' | 'tanımsız' | 'kopuk' | 'öneri' | 'tutarlılık'; level: 'hata' | 'uyari' | 'bilgi'; message: string; link?: string; durum?: string }

export interface ConsistencyRule { id: string; title: string; when: { path: string; op: 'eq' | 'neq' | 'contains' | 'empty' | 'notEmpty' | 'gt' | 'lt'; value?: string | number }[]; message: string; level?: 'hata' | 'uyari' | 'bilgi' }

/** Ayarlar'dan eklenebilen basit JSON koşulları (varsayılanlar). */
export const DEFAULT_RULES: ConsistencyRule[] = [
  { id: 'gece-ogle', title: 'Gün durumu Gece ama saat öğlen', when: [{ path: 'yolCevre.gunDurumu', op: 'contains', value: 'Gece' }, { path: 'kazaYeri.saat', op: 'gt', value: '10:00' }, { path: 'kazaYeri.saat', op: 'lt', value: '17:00' }], message: 'Gün durumu "Gece" seçili ama kaza saati gündüz (10:00–17:00).', level: 'uyari' },
  { id: 'tek-aracli', title: 'Araç sayısı ile kaza türü', when: [{ path: 'kaza.aracSayisinaGore', op: 'contains', value: 'Tek Araçlı' }, { path: 'araclar.length', op: 'gt', value: 1 }], message: '10.2 "Tek araçlı kaza" seçili ama dosyada birden fazla araç var.', level: 'uyari' },
  { id: 'alkol-psiko', title: 'Alkol sıfır ama psiko-fiziksel şüphe var', when: [{ path: 'suruculer[0].alkol', op: 'contains', value: 'Sıfır' }, { path: 'suruculer[0].psikoFizikselSuphe', op: 'eq', value: 'VAR' }], message: '1. sürücü alkol "Sıfır" ama psiko-fiziksel şüphe "VAR".', level: 'bilgi' },
]

function read(c: CaseData, path: string): unknown {
  if (path.endsWith('.length')) { const arr = read(c, path.slice(0, -7)); return Array.isArray(arr) ? arr.length : 0 }
  return path.split('.').reduce<unknown>((o, p) => { const m = /^(\w+)\[(\d+)\]$/.exec(p); if (o === null || o === undefined) return undefined; if (m) return (o as Record<string, unknown[]>)[m[1]]?.[+m[2]]; return (o as Record<string, unknown>)[p] }, c)
}

function test(v: unknown, op: ConsistencyRule['when'][number]['op'], value?: string | number): boolean {
  const s = String(v ?? '')
  switch (op) {
    case 'eq': return eqTR(s, value)
    case 'neq': return !eqTR(s, value)
    case 'contains': return s.toLocaleUpperCase('tr-TR').includes(String(value ?? '').toLocaleUpperCase('tr-TR'))
    case 'empty': return s.trim() === ''
    case 'notEmpty': return s.trim() !== ''
    case 'gt': return typeof value === 'number' ? Number(v) > value : s > String(value)
    case 'lt': return typeof value === 'number' ? Number(v) < value : s > '' && s < String(value)
  }
}

export function runConsistencyChecks(c: CaseData, all: Map<string, EvaluatedCard>, settings: Settings, rules: ConsistencyRule[] = DEFAULT_RULES): Check[] {
  const out: Check[] = []
  if (!c.kazaYeri.tarih) out.push({ kind: 'eksik', level: 'hata', message: 'Kaza tarihi (Grş 1!D27) girilmemiş.', link: '/dosya/veri#kazaYeri.tarih' })
  if (!c.kazaYeri.saat) out.push({ kind: 'eksik', level: 'uyari', message: 'Kaza saati (Grş 1!D29) girilmemiş.', link: '/dosya/veri#kazaYeri.saat' })
  if (!c.dosya.il) out.push({ kind: 'eksik', level: 'hata', message: 'İl seçilmemiş (Giriş!M8).', link: '/dosya/giris' })
  for (const k of all.values()) {
    if (!k.result.durumDefined) out.push({ kind: 'tanımsız', level: 'uyari', message: `${k.def.title}: "${k.result.incelemeDurumu}" için ${k.def.statusProfile} profilinde kural yok (Excel FALSE).`, durum: k.result.durum, link: `#kart-${k.def.id}` })
    const vs = k.def.valueSource as { kind: string }
    if (vs.kind === 'input' && !k.result.valueText && k.result.incelemeDurumu && !eqTR(k.result.incelemeDurumu, 'Aranmadı')) out.push({ kind: 'eksik', level: 'uyari', message: `${k.def.title}: İnceleme Durumu seçilmiş ama Grş 1 değeri boş.`, link: '/dosya/veri' })
  }
  for (const e of c.factorEntries) if (!FACTOR_BY_ID.has(e.factorId)) out.push({ kind: 'kopuk', level: 'hata', message: `Dosya kütüphanede olmayan bir etkene bağlı: ${e.factorId} (#REF benzeri).` })
  if (settings.enabledModules.includes('gunes-etkenligi')) {
    const saatKart = [...all.values()].find((k) => k.def.id === 'yol-cevre.saat-dakika')
    if (saatKart && eqTR(saatKart.result.incelemeDurumu, 'Aranmadı') && c.kazaYeri.konum && eqTR(String(c.yolCevre.havaDurumu ?? ''), 'Açık ve Güneşli')) out.push({ kind: 'öneri', level: 'bilgi', message: 'Hava "Açık ve Güneşli" ve güneş modülü aktif; 1.4 SAAT/DAKİKA kartı "Aranmadı". Güneş önerisini inceleyin.', link: '/analiz/yol-cevre#kart-yol-cevre.saat-dakika-0' })
    if (!c.kazaYeri.konum) out.push({ kind: 'eksik', level: 'bilgi', message: 'Güneş modülü için konum (enlem/boylam) girilmemiş.', link: '/modul/gunes/vaka' })
  }
  for (const r of rules) {
    const ok = r.when.every((w) => test(w.path === 'kazaYeri.saat' ? String(hourOf(read(c, w.path))).padStart(2, '0') + ':00' : read(c, w.path), w.op, w.value))
    if (ok) out.push({ kind: 'tutarlılık', level: r.level ?? 'uyari', message: r.message })
  }
  return out
}

import type { FactorEntry } from '@/engine/types'

export type EntityKind = 'araclar' | 'suruculer' | 'yayalar' | 'yolcular'
export type DosyaTuru = 'ceza' | 'hukuk' | 'savcilik' | 'icra'
export type Entity = Record<string, unknown>

export interface CaseData {
  id: string
  title: string
  createdAt: string
  updatedAt?: string
  settingsVersionHash: string
  contentVersion: string
  dosya: { firma?: string; raporTuru?: string; personel?: string; il?: string; ilce?: string; mahalle?: string; mahkemeNo?: number | null; mahkemeAdi?: string; dosyaTuru?: DosyaTuru; dosyaNo?: string; suc?: string; [k: string]: unknown }
  taraflar: Record<string, unknown>
  bilirkisi: { ad?: string; uzmanlik?: string; sicilNo?: string | number; [k: string]: unknown }
  gorevlendirme: Record<string, unknown>
  kazaYeri: { tarih?: string; saat?: string; mahalle?: string; adres?: string; yerlesim?: string; azamiHiz?: number | string; azamiHizOnerisi?: number | string; konum?: { lat: number; lon: number } | null; [k: string]: unknown }
  yolCevre: Record<string, unknown>
  guzergah: Record<string, unknown>
  yolEkipman: Record<string, unknown>
  kaza: Record<string, unknown>
  araclar: Entity[]
  suruculer: Entity[]
  yayalar: Entity[]
  yolcular: Entity[]
  istatistik: Record<string, unknown>
  modules: Record<string, unknown>
  factorEntries: FactorEntry[]
  ekler?: { id: string; name: string; type: string; size: number; factorId?: string }[]
  /** Rapor içeriği seçimi: bölüm bayrakları (anahtar yoksa dahil) ve hariç tutulan kart anahtarları (`${factorId}#${entityIndex ?? 0}`). */
  rapor?: RaporSecimi
  [k: string]: unknown
}

export interface RaporSecimi { bolumler: Record<string, boolean>; haricKartlar: string[] }

export const ENTITY_KINDS: { kind: EntityKind; factorKind: 'arac' | 'surucu' | 'yaya' | 'yolcu'; title: string; singular: string }[] = [
  { kind: 'araclar', factorKind: 'arac', title: 'Araçlar', singular: 'Araç' },
  { kind: 'suruculer', factorKind: 'surucu', title: 'Sürücüler', singular: 'Sürücü' },
  { kind: 'yayalar', factorKind: 'yaya', title: 'Yayalar', singular: 'Yaya' },
  { kind: 'yolcular', factorKind: 'yolcu', title: 'Yolcular', singular: 'Yolcu' },
]
export const ENTITY_KIND_BY_FACTOR: Record<string, EntityKind> = { arac: 'araclar', surucu: 'suruculer', yaya: 'yayalar', yolcu: 'yolcular' }

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function newCase(contentVersion: string, settingsHash: string): CaseData {
  const now = new Date().toISOString()
  return {
    id: newId(), title: 'Yeni dosya', createdAt: now, updatedAt: now, settingsVersionHash: settingsHash, contentVersion,
    dosya: { firma: 'SERESLER BİLİRKİŞİLİK', raporTuru: 'BİLİRKİŞİ RAPORUDUR', dosyaTuru: 'ceza', mahkemeNo: null },
    taraflar: {}, bilirkisi: {}, gorevlendirme: {}, kazaYeri: {}, yolCevre: {}, guzergah: {}, yolEkipman: {}, kaza: {},
    araclar: [{}], suruculer: [{}], yayalar: [], yolcular: [], istatistik: { saatler: {}, metinSecimleri: {} }, modules: {}, factorEntries: [], ekler: [], rapor: { bolumler: {}, haricKartlar: [] },
  }
}

/** Eksik bölümleri varsayılanlarla tamamlar (eski dosyalar, içe aktarma, örnek dosya). */
export function normalizeCase(c: Partial<CaseData>): CaseData {
  const base = newCase(c.contentVersion ?? '1.0.0', c.settingsVersionHash ?? '')
  const out = { ...base, ...c } as CaseData
  for (const k of ['dosya', 'taraflar', 'bilirkisi', 'gorevlendirme', 'kazaYeri', 'yolCevre', 'guzergah', 'yolEkipman', 'kaza', 'istatistik', 'modules'] as const) {
    if (!out[k] || typeof out[k] !== 'object') (out as Record<string, unknown>)[k] = {}
  }
  for (const k of ['araclar', 'suruculer', 'yayalar', 'yolcular', 'factorEntries', 'ekler'] as const) {
    if (!Array.isArray(out[k])) (out as Record<string, unknown>)[k] = []
  }
  const ist = out.istatistik as Record<string, unknown>
  if (!ist.saatler || typeof ist.saatler !== 'object') ist.saatler = {}
  if (!ist.metinSecimleri || typeof ist.metinSecimleri !== 'object') ist.metinSecimleri = {}
  if (!out.rapor || typeof out.rapor !== 'object') out.rapor = { bolumler: {}, haricKartlar: [] }
  if (!out.rapor.bolumler || typeof out.rapor.bolumler !== 'object') out.rapor.bolumler = {}
  if (!Array.isArray(out.rapor.haricKartlar)) out.rapor.haricKartlar = []
  for (const e of out.factorEntries) { if (!e.tespit) e.tespit = { yontemler: [], puanlar: [] }; if (!Array.isArray(e.tespit.puanlar)) e.tespit.puanlar = []; if (!Array.isArray(e.tespit.yontemler)) e.tespit.yontemler = [] }
  return out
}

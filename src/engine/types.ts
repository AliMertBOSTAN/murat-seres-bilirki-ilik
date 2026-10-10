/** Faz 0 çıkarımının ürettiği içerik tipleri ve motor çıktıları. */

export type IncelemeDurumu = '' | 'Yeterli' | 'Yetersiz' | 'Var' | 'Yok' | 'Yapıldı' | 'Aranmadı' | 'Belirsiz' | 'Davranış'
export const INCELEME_DURUMLARI: IncelemeDurumu[] = ['Yeterli', 'Yetersiz', 'Var', 'Yok', 'Yapıldı', 'Aranmadı', 'Belirsiz', 'Davranış']

export type Durum = 'ETKEN' | 'ETKEN DEĞİL' | 'İNCELENMELİ' | 'ÖZEL İSTEMLİ' | 'İNCELEMELİ' | '' | '⚠ Kural tanımsız' | string

export interface Part {
  kind: 'value' | 'text' | 'literal' | 'blank' | 'hourOf' | 'incelemeDurumu' | 'subTitle' | 'error' | 'durum' | string
  text?: string
  path?: string
  source?: string
  of?: Part[]
  value?: string
  cell?: string
}

export interface LookupTableRow { key: string; text: string; row?: number }

export type Source =
  | { kind: 'option'; keyFrom: ValueSource; table: LookupTableRow[]; range?: string; column?: number; exact?: boolean; excelCell?: string }
  | { kind: 'text'; text: string; source?: string; excelCell?: string; table?: LookupTableRow[] }
  | { kind: 'conditional'; on: string; branches: { when: string; then: Source }[]; else: Source; excelCell?: string }
  | { kind: 'parts'; parts: Part[]; excelCell?: string }
  | { kind: 'literal'; text: string; excelCell?: string }
  | { kind: 'empty'; excelCell?: string }
  | { kind: 'value'; excelCell?: string }
  | { kind: 'incelemeDurumu'; excelCell?: string }
  | { kind: 'durum'; excelCell?: string }
  | { kind: string; [k: string]: unknown }

export type ValueSource =
  | { kind: 'input'; path: string; entityKind?: string; entityIndex?: number | null; cell?: string }
  | { kind: 'cardSelect'; listId?: string }
  | { kind: 'card'; field: string }
  | { kind: 'formula'; formula: string }
  | { kind: string; [k: string]: unknown }

export interface KazadaRule {
  kind: 'rule' | 'none'
  branches?: { when: string; on?: string; onCell?: string; parts: Part[] }[]
  else?: Part[]
  formula?: string
}

export interface EkDosyaRule {
  kind: 'rule' | 'manual'
  hideWhen?: string[]
  on?: 'incelemeDurumu' | 'value' | 'sorumlu' | 'other' | string
  onCell?: string
  parts?: Part[]
  kod?: string
  metin?: string
  value?: unknown
  formula?: string
}

export interface FactorOption { label: string; nedensellik?: string; aciklama?: string; sorun?: string; sonuc?: string; row?: number }

export interface LibraryRow { row: number; cells: Record<string, unknown> }

export interface FactorDef {
  id: string
  group: string
  displayCode: string
  title: string
  subTitle: string
  aranan: string
  perEntity: 'arac' | 'surucu' | 'yolcu' | 'yaya' | null
  sourceRef: { sheet: string | null; titleRow?: number; statusRow?: number; library: { sheet?: string; cell?: string; literal?: boolean }; layout?: string }
  valueSource: ValueSource
  degerDurum?: Part[] | { literal: string } | null
  statusProfile: string
  ekDosya: EkDosyaRule
  kazadaDurumu: KazadaRule
  textLevel: 'option' | 'factor' | 'mixed'
  fields: Partial<Record<'aciklama' | 'nedensellik' | 'sorun' | 'sonuc' | 'sorumlular' | 'tespitYontemi', Source>>
  options: FactorOption[]
  extraBlocks: { label: string; row?: number; source?: Source | null; sampleValue?: unknown }[]
  texts?: Record<string, string>
  showInReport: boolean
  /** Grup içi sıra (Ayarlar); yoksa paket sırası kullanılır. */
  order?: number
  draft: boolean
  libraryRows?: LibraryRow[]
  libraryRowCount?: number
  excelSample?: {
    value?: unknown; scale?: unknown; incelemeDurumu?: unknown; muteala?: unknown
    tespit?: { yontemler: unknown[]; delilKodu?: unknown; puanlar: unknown[]; dogrulama?: unknown } | null
    sorumlu?: { sorumlu?: unknown; hakimSavci?: unknown } | null
  } | null
}

export interface StatusProfile {
  id: string
  mapping: Record<string, string>
  else: string
  rawKeys?: Record<string, string>
  excelFormula?: string
  firstSeen?: string
  sheets?: string[]
}

export interface Tespit {
  yontemler: string[]
  delilKodu?: string | null
  puanlar: (number | null | undefined)[]
  dogrulama?: string | null
}

export interface FactorEntry {
  factorId: string
  entityIndex?: number | null
  selectedValue?: string | number | null
  incelemeDurumu?: IncelemeDurumu | string
  muteala?: string
  tespit?: Tespit
  sorumlu?: string | null
  hakimSavciTespit?: string | null
  altSecim?: string | null
  ekler?: { id: string; name: string; type: string; size: number }[]
  moduleSuggestions?: { moduleId: string; version: string; appliedAt?: string; incelemeDurumu?: string; note?: string }[]
  excelMuteala?: string | null
}

export interface ProvenanceStep {
  step: string
  detail: string
  source?: string
}

export interface FactorResult {
  factorId: string
  entityIndex: number | null
  value: unknown
  valueText: string
  incelemeDurumu: string
  durum: Durum
  durumDefined: boolean
  ekDosyaBayragi: string
  degerDurumMetni: string
  kazadaDurumu: string
  aciklama: string
  nedensellik: string
  sorunAciklama: string
  extra: { label: string; text: string }[]
  provenance: ProvenanceStep[]
}

export type RenderMode = 'excel' | 'okunur'

export interface EngineSettings {
  renderMode: RenderMode
  statusProfileOverride?: string | null // 'birlesik' → tüm kartlarda birleşik profil
  vlookupExactAlways: boolean
}

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = { renderMode: 'excel', statusProfileOverride: null, vlookupExactAlways: true }

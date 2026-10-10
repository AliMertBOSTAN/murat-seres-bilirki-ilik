import type { StatusProfile } from './types'
import { trUpper } from './excel-compat'

/** İnceleme durumu metnini profil anahtarına (Yeterli, Yetersiz, …) normalize eder. */
const CANON: Record<string, string> = { '': '', 'YETERLİ': 'Yeterli', 'YETERSİZ': 'Yetersiz', 'ARANMADI': 'Aranmadı', 'YOK': 'Yok', 'DAVRANIŞ': 'Davranış', 'VAR': 'Var', 'BELİRSİZ': 'Belirsiz', 'YAPILDI': 'Yapıldı' }

export function canonInput(v: unknown): string {
  const k = trUpper(String(v ?? '').trim())
  return CANON[k] ?? String(v ?? '').trim()
}

export interface StatusDecision { durum: string; defined: boolean; matchedKey: string | null }

/** V sütunu IF zincirinin veri odaklı karşılığı. */
export function decideStatus(profile: StatusProfile, incelemeDurumu: unknown): StatusDecision {
  const key = canonInput(incelemeDurumu)
  if (Object.prototype.hasOwnProperty.call(profile.mapping, key)) return { durum: profile.mapping[key], defined: true, matchedKey: key }
  const els = profile.else
  if (els === 'FALSE' || els === undefined || els === null) return { durum: '⚠ Kural tanımsız', defined: false, matchedKey: null }
  return { durum: els, defined: true, matchedKey: null }
}

/** Excel'in sayacı: ETKEN + İNCELENMELİ. */
export function countsForSummary(durum: string): boolean {
  const d = String(durum).trim()
  return d === 'ETKEN' || d === 'İNCELENMELİ'
}

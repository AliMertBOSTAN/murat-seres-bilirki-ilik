import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EngineSettings, FactorDef } from '@/engine/types'
import { CONTENT_VERSION } from '@/content'

export interface SettingsVersion { version: string; note: string; at: string; hash: string }

export interface Settings {
  engine: EngineSettings
  summaryScope: 'excel' | 'all'
  showDrafts: boolean
  showExcelRefs: boolean
  entityLimit: number
  enabledModules: string[]
  reportAranmadi: 'tam' | 'kisa' | 'gizle'
  reportShowDrafts: boolean
  numberingScheme: 'v1' | 'v2' | 'ozel'
  duzeltmeler: { siklikEslemesi: boolean; kacinmaCarpan: boolean; kurumAnlam: boolean; rkEtiket: boolean; ekDosyaIncelemeDurumu: boolean }
  gunes: { thetaBands: { max: number; sinif: string; K: number }[]; varsayilanReaksiyon: number; varsayilanPitch: number; varsayilanUtcOfset: number; oneriEslemesi: Record<string, string> }
  contentOverrides: Record<string, Partial<FactorDef>>
  listOverrides: Record<string, string[]>
  textOverrides: Record<string, string>
  reportMetaOverrides: Record<string, string>
  version: string
  history: SettingsVersion[]
  lastHash: string
}

export const DEFAULT_SETTINGS: Settings = {
  engine: { renderMode: 'excel', statusProfileOverride: null, vlookupExactAlways: true },
  summaryScope: 'all', showDrafts: false, showExcelRefs: true, entityLimit: 6, enabledModules: ['gunes-etkenligi', 'kacinma-mutalaa'],
  reportAranmadi: 'tam', reportShowDrafts: false, numberingScheme: 'v1',
  duzeltmeler: { siklikEslemesi: false, kacinmaCarpan: false, kurumAnlam: false, rkEtiket: false, ekDosyaIncelemeDurumu: false },
  gunes: { thetaBands: [{ max: 5, sinif: 'Tam körlük', K: 0.1 }, { max: 10, sinif: 'Çok yüksek', K: 0.4 }, { max: 20, sinif: 'Yüksek', K: 0.6 }, { max: 45, sinif: 'Orta', K: 0.8 }, { max: 180, sinif: 'Düşük/önemsiz', K: 1 }],
    varsayilanReaksiyon: 1.5, varsayilanPitch: 0, varsayilanUtcOfset: 3, oneriEslemesi: { 'Tam körlük': 'Yetersiz', 'Çok yüksek': 'Yetersiz', 'Yüksek': 'Belirsiz', 'Orta': 'Yeterli', 'Düşük/önemsiz': 'Yeterli' } },
  contentOverrides: {}, listOverrides: {}, textOverrides: {}, reportMetaOverrides: {},
  version: `${CONTENT_VERSION}`, history: [{ version: CONTENT_VERSION, note: 'Paketle gelen varsayılan içerik (Faz 0 çıkarımı)', at: '2026-10-10T00:00:00Z', hash: 'paket' }], lastHash: 'paket',
}

export async function hashSettings(s: Settings): Promise<string> {
  const { history: _h, lastHash: _l, ...rest } = s
  const text = JSON.stringify(rest)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(16)
}

interface SettingsStore {
  settings: Settings
  adminToken: string | null
  update: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => void
  commitVersion: (note: string) => Promise<string>
  reset: () => void
  setAdminToken: (t: string | null) => void
  importSettings: (s: Settings) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      adminToken: null,
      update: (patch) => set((st) => ({ settings: { ...st.settings, ...(typeof patch === 'function' ? patch(st.settings) : patch) } })),
      commitVersion: async (note) => {
        const s = get().settings
        const [maj, min, pat] = s.version.split('.').map(Number)
        const version = `${maj}.${min}.${(pat || 0) + 1}`
        const next = { ...s, version }
        const hash = await hashSettings(next)
        set({ settings: { ...next, lastHash: hash, history: [...s.history, { version, note, at: new Date().toISOString(), hash }] } })
        return hash
      },
      reset: () => set({ settings: DEFAULT_SETTINGS }),
      setAdminToken: (t) => set({ adminToken: t }),
      importSettings: (s) => set({ settings: s }),
    }),
    { name: 'seres-settings', partialize: (s) => ({ settings: s.settings }) },
  ),
)

export const useSettings = () => useSettingsStore((s) => s.settings)

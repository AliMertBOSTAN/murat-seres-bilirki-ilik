import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { CaseData, EntityKind } from '@/model/case'
import { newCase, newId, normalizeCase } from '@/model/case'
import type { FactorEntry } from '@/engine/types'
import { getPath, setPath } from '@/engine/path'
import { CONTENT_VERSION, SAMPLE_CASE } from '@/content'
import { saveCase } from './db'
import { useSettingsStore } from './settingsStore'

interface CaseStore {
  caseData: CaseData
  saving: boolean
  setField: (path: string, value: unknown) => void
  setFields: (patch: Record<string, unknown>) => void
  updateEntry: (factorId: string, entityIndex: number | null, patch: Partial<FactorEntry>) => void
  addEntity: (kind: EntityKind) => void
  removeEntity: (kind: EntityKind, index: number) => void
  setModuleData: (moduleId: string, data: unknown) => void
  loadCase: (c: CaseData) => void
  loadSample: () => void
  newCase: () => void
  setTitle: (t: string) => void
}

export function findEntry(entries: FactorEntry[], factorId: string, entityIndex: number | null | undefined): FactorEntry | undefined {
  return entries.find((e) => e.factorId === factorId && (e.entityIndex ?? 0) === (entityIndex ?? 0))
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
function schedulePersist(c: CaseData) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { void saveCase(c) }, 400)
}

function sampleCase(): CaseData {
  const s = normalizeCase(JSON.parse(JSON.stringify(SAMPLE_CASE)) as Partial<CaseData>)
  s.id = 'ornek-excel'
  s.title = 'Örnek dosya (EĞİTİM 001)'
  s.contentVersion = CONTENT_VERSION
  s.settingsVersionHash = useSettingsStore.getState().settings.lastHash
  s.updatedAt = new Date().toISOString()
  // Giriş!M11 = 3 hem mahkeme no hem etiket seti idi (§3.4): örnekte Ağır Ceza → dosyaTuru 'ceza'
  s.dosya.dosyaTuru = 'ceza'
  s.dosya.mahkemeNo = 3
  s.dosya.dosyaNo = s.dosya.dosyaNo || '2025/216 ESAS'
  s.kazaYeri.tarih = String(s.kazaYeri.tarih ?? '').slice(0, 10)
  s.kazaYeri.saat = String(s.kazaYeri.saat ?? '').slice(0, 5)
  s.kazaYeri.konum = { lat: 40.0806, lon: 29.5097 }
  s.araclar = (s.araclar ?? []).map((a, i) => ({ ...a, seyirYonu: i === 0 ? 270 : 90 }))
  s.ekler = []
  return s
}

export const useCaseStore = create<CaseStore>()(
  immer((set) => ({
    caseData: newCase(CONTENT_VERSION, useSettingsStore.getState().settings.lastHash),
    saving: false,
    setField: (path, value) => set((st) => {
      setPath(st.caseData as unknown as Record<string, unknown>, path, value)
      // İl değişince ilçe/mahalle sıfırlanır (bağımlı liste)
      if (path === 'dosya.il') { st.caseData.dosya.ilce = ''; st.caseData.dosya.mahalle = '' }
      if (path === 'dosya.ilce') st.caseData.dosya.mahalle = ''
      st.caseData.updatedAt = new Date().toISOString()
      schedulePersist(st.caseData as CaseData)
    }),
    setFields: (patch) => set((st) => {
      for (const [p, v] of Object.entries(patch)) setPath(st.caseData as unknown as Record<string, unknown>, p, v)
      st.caseData.updatedAt = new Date().toISOString()
      schedulePersist(st.caseData as CaseData)
    }),
    updateEntry: (factorId, entityIndex, patch) => set((st) => {
      let e = findEntry(st.caseData.factorEntries, factorId, entityIndex)
      if (!e) { e = { factorId, entityIndex: entityIndex ?? null, incelemeDurumu: '', muteala: '', tespit: { yontemler: [], puanlar: [] } }; st.caseData.factorEntries.push(e) }
      Object.assign(e, patch)
      st.caseData.updatedAt = new Date().toISOString()
      schedulePersist(st.caseData as CaseData)
    }),
    addEntity: (kind) => set((st) => {
      const limit = useSettingsStore.getState().settings.entityLimit
      if (st.caseData[kind].length >= limit) return
      st.caseData[kind].push({})
      schedulePersist(st.caseData as CaseData)
    }),
    removeEntity: (kind, index) => set((st) => {
      st.caseData[kind].splice(index, 1)
      const fk: Record<EntityKind, string> = { araclar: 'arac', suruculer: 'surucu', yayalar: 'yaya', yolcular: 'yolcu' }
      st.caseData.factorEntries = st.caseData.factorEntries.filter((e) => !(e.factorId.startsWith(fk[kind] + '.') && (e.entityIndex ?? 0) === index))
      schedulePersist(st.caseData as CaseData)
    }),
    setModuleData: (moduleId, data) => set((st) => { st.caseData.modules[moduleId] = data; schedulePersist(st.caseData as CaseData) }),
    loadCase: (c) => set((st) => { st.caseData = normalizeCase(c); localStorage.setItem('seres-last-case', c.id); void saveCase(st.caseData as CaseData) }),
    loadSample: () => set((st) => { st.caseData = sampleCase(); localStorage.setItem('seres-last-case', st.caseData.id); void saveCase(st.caseData as CaseData) }),
    newCase: () => set((st) => { st.caseData = newCase(CONTENT_VERSION, useSettingsStore.getState().settings.lastHash); st.caseData.id = newId(); localStorage.setItem('seres-last-case', st.caseData.id); void saveCase(st.caseData as CaseData) }),
    setTitle: (t) => set((st) => { st.caseData.title = t; schedulePersist(st.caseData as CaseData) }),
  })),
)

export const useCase = () => useCaseStore((s) => s.caseData)
export const readCaseValue = (c: CaseData, path: string) => getPath(c, path)

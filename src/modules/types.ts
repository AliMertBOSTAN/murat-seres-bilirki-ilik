import type { ComponentType } from 'react'
import type { CaseData } from '@/model/case'
import type { Settings } from '@/store/settingsStore'
import type { FactorDef, FactorResult } from '@/engine/types'

export interface ModuleManifest {
  id: string
  name: string
  version: string
  kind: 'content' | 'compute'
  description: string
  icon?: string
  author?: string
  status?: 'hazir' | 'gelistiriliyor'
  dependsOn?: { id: string; version: string }[]
  inputs: { key: string; from: string; required: boolean; fallback?: 'manual' | 'setting' }[]
  outputs: { key: string; label: string; unit?: string }[]
  pages: { route: string; title: string; sheetName?: string }[]
  factors?: string[]
  hooks?: { targetFactorId: string; suggest: string }[]
  settingsSchema?: string
  reportSections?: { id: string; title: string; after: string }[]
  goldenTests?: string
}

export interface ModuleSuggestion {
  moduleId: string; moduleVersion: string; title: string
  incelemeDurumu?: string; muteala?: string; summary: string
  details: { label: string; value: string }[]
}

export interface ModuleDefinition {
  manifest: ModuleManifest
  Page: ComponentType
  /** Hedef kart için öneri üretir (bilirkişi onayı olmadan karta yazılmaz). */
  suggest?: (ctx: { caseData: CaseData; settings: Settings; def: FactorDef; entityIndex: number | null; result: FactorResult }) => ModuleSuggestion | null
  /** Rapor bölümü (A4 belge modunda). */
  ReportSection?: ComponentType<{ caseData: CaseData; settings: Settings }>
}

import type { ModuleDefinition, ModuleManifest } from './types'
import { gunesModule } from './gunes-etkenligi'
import { kacinmaModule } from './kacinma-mutalaa'

function skeleton(id: string, name: string, description: string, sheets: string[], after = 'sonuc'): ModuleDefinition {
  const manifest: ModuleManifest = { id, name, version: '0.0.0', kind: 'compute', description, status: 'excel-bekleniyor', inputs: [], outputs: [], pages: [{ route: `/modul/${id}`, title: name, sheetName: sheets.join(', ') }], reportSections: [{ id, title: name, after }] }
  return { manifest, Page: () => null }
}

/** Derleme zamanı kayıt defteri. Sıra: navigasyon sırası. */
export const MODULE_DEFS: ModuleDefinition[] = [
  kacinmaModule,
  gunesModule,
  skeleton('istatistik-risk', 'İstatistik ve Risk (ayrı modül)', 'Sayfa 2. risk/sıklık hesabı ayrı eklenti olarak', ['2.']),
  skeleton('ayna', 'Ayna Görüş Analizi', 'Dış dosya: AYNA', ['AYNA']),
  skeleton('zaman-mesafe', 'Zaman–Mesafe (ZMN5)', 'Dış dosya: Trafik Kazası Bilirkişiliği 001.xlsb › ZMN5', ['ZMN5']),
  skeleton('sorumluluk', 'Sorumluluk Puanlaması (SRNK)', 'Dış dosya: SRNK, İŞRNK, BRYR', ['SRNK']),
  skeleton('kavsak', 'Kavşak Analizi (KVŞ)', 'Dış dosya: KVŞ', ['KVŞ']),
  skeleton('iz-analizi', 'İz Analizi (6., 7., 10. bölümler)', 'Tanım kütüphanesindeki taslak etkenlerden', ['Tanım']),
]
export const MODULES = MODULE_DEFS.map((m) => ({ ...m.manifest, status: m.manifest.status ?? 'hazir' }))
export const MODULE_BY_ID = new Map(MODULE_DEFS.map((m) => [m.manifest.id, m]))

export interface RegistryCheck { level: 'hata' | 'uyari'; moduleId: string; message: string }

/** Yükleme zamanı denetimleri: sahipsiz girdi, döngü, sürüm uyumsuzluğu. */
export function validateRegistry(enabled: string[], knownPaths: Set<string>): RegistryCheck[] {
  const out: RegistryCheck[] = []
  const producers = new Map<string, string>()
  for (const m of MODULE_DEFS) if (enabled.includes(m.manifest.id)) for (const o of m.manifest.outputs) producers.set(`modules.${m.manifest.id}.${o.key}`, m.manifest.id)
  for (const m of MODULE_DEFS) {
    if (!enabled.includes(m.manifest.id)) continue
    for (const i of m.manifest.inputs) {
      const base = i.from.replace(/\[\]/g, '[0]').replace(/\[\d+\]/g, '[0]')
      const owned = knownPaths.has(base) || producers.has(i.from) || i.from.startsWith('settings.')
      if (!owned && i.required && !i.fallback) out.push({ level: 'hata', moduleId: m.manifest.id, message: `Sahipsiz zorunlu girdi: ${i.from}` })
      else if (!owned && !i.fallback) out.push({ level: 'uyari', moduleId: m.manifest.id, message: `Girdi için üretici yok (elle giriş): ${i.from}` })
    }
    for (const d of m.manifest.dependsOn ?? []) {
      const dep = MODULE_BY_ID.get(d.id)
      if (!dep) out.push({ level: 'hata', moduleId: m.manifest.id, message: `Bağımlılık yok: ${d.id}` })
      else if (!enabled.includes(d.id)) out.push({ level: 'uyari', moduleId: m.manifest.id, message: `Bağımlı modül kapalı: ${d.id}` })
      else if (dep.manifest.version.split('.')[0] !== d.version.replace(/[^\d.]/g, '').split('.')[0]) out.push({ level: 'uyari', moduleId: m.manifest.id, message: `Sürüm uyumsuzluğu: ${d.id} ${dep.manifest.version} ≠ ${d.version}` })
    }
  }
  // döngü: A → B → A (çıktı/girdi üzerinden)
  for (const a of MODULE_DEFS) for (const b of MODULE_DEFS) {
    if (a === b || !enabled.includes(a.manifest.id) || !enabled.includes(b.manifest.id)) continue
    const aReadsB = a.manifest.inputs.some((i) => i.from.startsWith(`modules.${b.manifest.id}.`))
    const bReadsA = b.manifest.inputs.some((i) => i.from.startsWith(`modules.${a.manifest.id}.`))
    if (aReadsB && bReadsA) out.push({ level: 'hata', moduleId: a.manifest.id, message: `Döngü: ${a.manifest.id} ⇄ ${b.manifest.id}` })
  }
  return out
}

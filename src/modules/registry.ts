import type { ModuleDefinition, ModuleManifest } from './types'
import { gunesModule } from './gunes-etkenligi'
import { kacinmaModule } from './kacinma-mutalaa'

function skeleton(id: string, name: string, description: string, after = 'sonuc'): ModuleDefinition {
  const manifest: ModuleManifest = { id, name, version: '0.0.0', kind: 'compute', description, status: 'gelistiriliyor', inputs: [], outputs: [], pages: [{ route: `/modul/${id}`, title: name }], reportSections: [{ id, title: name, after }] }
  return { manifest, Page: () => null }
}

/** Derleme zamanı kayıt defteri. Sıra: navigasyon sırası. */
export const MODULE_DEFS: ModuleDefinition[] = [
  kacinmaModule,
  gunesModule,
  skeleton('istatistik-risk', 'İstatistik ve Risk Modülü', 'Yol kesimi, nüfus ve taşıt verilerinden risk ve olası sıklık değerlendirmesi (bağımsız eklenti olarak).'),
  skeleton('ayna', 'Ayna Görüş Analizi', 'Araç aynalarının görüş alanı ve kör nokta değerlendirmesi.'),
  skeleton('zaman-mesafe', 'Zaman–Mesafe Analizi', 'Araçların zaman–mesafe diyagramı, görüş mesafesi ve reaksiyon süresi hesapları.'),
  skeleton('sorumluluk', 'Sorumluluk Puanlaması', 'Sürücü, araç sahibi ve kurumlar için temel kusur puanlaması.'),
  skeleton('kavsak', 'Kavşak Analizi', 'Kavşak geometrisi, geçiş önceliği ve sinyalizasyon değerlendirmesi.'),
  skeleton('iz-analizi', 'İz Analizi', 'Araç yükü, lastik, kayma, sürüklenme ve fren izleri ile ölü/yaralıya ait izlerin değerlendirilmesi.'),
]
export const MODULES = MODULE_DEFS.map((m) => ({ ...m.manifest, status: m.manifest.status ?? 'hazir' }))
export const MODUL_DURUM_ETIKETI: Record<string, string> = { hazir: 'hazır', gelistiriliyor: 'Modül geliştiriliyor' }
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

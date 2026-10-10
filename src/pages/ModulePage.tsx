import type { ModuleDefinition } from '@/modules/types'
import { useSettingsStore } from '@/store/settingsStore'
import { PageHeader, Badge, Empty } from '@/ui/primitives'
import { Link } from 'react-router-dom'

export function ModulePage({ module }: { module: ModuleDefinition | undefined }) {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  if (!module) return <Empty>Modül bulunamadı.</Empty>
  const m = module.manifest
  if (m.status === 'excel-bekleniyor') {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader sheet={m.pages[0]?.sheetName} title={m.name} subtitle={m.description} />
        <div className="kart p-8 text-center">
          <Badge tone="altin">Excel bekleniyor</Badge>
          <p className="mt-3 text-sm text-gri">Bu modülün iskeleti hazır (manifest, rota, rapor bölümü). İlgili Excel dosyası verildiğinde Faz 0 analiz yöntemi aynen uygulanır ve aynı sözleşmeyle (inputs / outputs / hooks) modüle çevrilir.</p>
          <pre className="mt-4 overflow-x-auto rounded bg-krem p-3 text-left text-[11px]">{JSON.stringify(m, null, 1)}</pre>
        </div>
      </div>
    )
  }
  if (!settings.enabledModules.includes(m.id)) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader sheet={m.pages[0]?.sheetName} title={m.name} subtitle={m.description} />
        <div className="kart p-8 text-center text-sm text-gri">
          <p>Bu modül Ayarlar'dan kapatılmış. Yazdığı alanlar pasif görünür, kart önerileri kalkar; veri silinmez.</p>
          <button className="btn-primary mt-3" onClick={() => update({ enabledModules: [...settings.enabledModules, m.id] })}>Modülü aç</button>
          <Link to="/ayarlar/moduller" className="btn-ghost mt-3">Ayarlar › Modüller</Link>
        </div>
      </div>
    )
  }
  const Page = module.Page
  return <Page />
}

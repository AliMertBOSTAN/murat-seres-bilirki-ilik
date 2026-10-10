import type { ModuleDefinition } from '@/modules/types'
import { useSettingsStore } from '@/store/settingsStore'
import { PageHeader, Badge, Empty } from '@/ui/primitives'
import { Link } from 'react-router-dom'

export function ModulePage({ module }: { module: ModuleDefinition | undefined }) {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  if (!module) return <Empty>Modül bulunamadı.</Empty>
  const m = module.manifest
  if (m.status === 'gelistiriliyor') {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title={m.name} subtitle={m.description} />
        <div className="kart p-10 text-center">
          <Badge tone="altin">Modül geliştiriliyor</Badge>
          <h2 className="mt-4 text-2xl font-semibold text-lacivert">{m.name}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gri">Bu modül hazırlık aşamasında. Yayına alındığında sol menüde etkinleşecek, kartlara öneri üretecek ve rapora kendi bölümünü ekleyecek. Mevcut dosyalarınız etkilenmez.</p>
          <div className="mx-auto mt-6 h-1.5 w-64 overflow-hidden rounded-full bg-krem-200"><div className="h-full w-1/3 animate-pulse rounded-full bg-altin" /></div>
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

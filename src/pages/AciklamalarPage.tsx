import { LEGAL_TEXTS } from '@/content'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { PageHeader, Badge } from '@/ui/primitives'
import { ReportHeader } from '@/components/ReportHeader'

export function legalVariant(raporTuru: string | undefined): number {
  const rt = String(raporTuru ?? '')
  return /UZMAN/i.test(rt) ? 0 : /İTİRAZ/i.test(rt) ? 1 : 2
}

export function legalParagraphs(variant: number, overrides: Record<string, string>): string[] {
  const lt = LEGAL_TEXTS as { blocks: { paragraphs: string[] }[] }
  const block = lt.blocks[variant === 0 ? 1 : 0]
  return block.paragraphs.map((p, i) => overrides[`legal.${variant}.${i}`] ?? p)
}

export function AciklamalarPage() {
  const c = useCaseStore((s) => s.caseData)
  const settings = useSettingsStore((s) => s.settings)
  const lt = LEGAL_TEXTS as { variants: string[] }
  const variant = legalVariant(c.dosya.raporTuru)
  const paragraphs = legalParagraphs(variant, settings.textOverrides)
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader sheet="1." title="1. Açıklamalar" subtitle="Yargıtay 15. HD 10.11.2016, 2015/5127 E. – 2016/4635 K.; HMK 27, Anayasa 36, AİHS 6 atıflı dayanak metni. Varyant rapor türünden seçilir, metinler Ayarlar › Hukuki Metinler'den düzenlenir." next={{ to: '/analiz/yer-istatistik', label: '2. Yer ve İstatistik' }} />
      <div className="a4 belge !min-h-0">
        <ReportHeader pageNo={1} />
        <h2 className="mt-6 text-center text-lg font-bold">AÇIKLAMALAR</h2>
        <div className="mb-2 text-right text-[10px]"><Badge tone="altin">{lt.variants[variant]}</Badge></div>
        {paragraphs.map((p, i) => <p key={i} className="mb-3 indent-8 text-justify text-[13px] leading-relaxed">{p.trim()}</p>)}
      </div>
    </div>
  )
}

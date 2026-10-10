import { REPORT_META } from '@/content'
import { useCaseStore } from '@/store/caseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { formatDateTR } from '@/engine/excel-compat'

/** Excel rapor sayfalarının ISO tipi başlık bloğu (satır 2–6) ve altbilgisi. */
export function ReportHeader({ pageNo, total, logo = 'logo.jpg', frozenDate }: { pageNo: number; total?: number; logo?: string; frozenDate?: string }) {
  const c = useCaseStore((s) => s.caseData)
  const ov = useSettingsStore((s) => s.settings.reportMetaOverrides)
  const m = { ...(REPORT_META as unknown as Record<string, string>), ...ov }
  const today = frozenDate ? new Date(frozenDate) : new Date()
  const cell = 'border border-black px-1 py-0.5'
  return (
    <table className="w-full border-collapse text-[9px] leading-tight">
      <tbody>
        <tr>
          <td rowSpan={4} className={`${cell} w-[16%] text-center`}><img src={`/brand/${logo}`} alt="" className="mx-auto h-16 object-contain" /></td>
          <td rowSpan={2} colSpan={2} className={`${cell} w-[44%] text-center`}><div className="text-[13px] font-bold">{c.dosya.firma}</div><div className="text-[11px]">{c.dosya.raporTuru}</div></td>
          <td className={`${cell} font-semibold`}>Dok.No:</td><td className={cell}>{m.dokNo}</td><td className={`${cell} font-semibold`}>İso Belge</td><td className={cell}>{m.isoBelge}</td>
        </tr>
        <tr><td className={`${cell} font-semibold`}>Sayfa No:</td><td className={cell}>{pageNo} / {total ?? '…'}</td><td className={`${cell} font-semibold`}>Bağ.Ol.Ay-Gün</td><td className={cell}>{formatDateTR(today)}</td></tr>
        <tr><td className={`${cell} font-semibold`}>Birim :</td><td className={cell}>{m.birimRapor}</td><td className={`${cell} font-semibold`}>Haz.Tarihi:</td><td className={cell}>{formatDateTR(m.hazTarihi)}</td><td className={`${cell} font-semibold`}>Yıl</td><td className={cell}>{today.getFullYear()}</td></tr>
        <tr><td className={`${cell} font-semibold`}>Konu</td><td className={cell}>{m.konu}</td><td className={`${cell} font-semibold`}>Revizyon No</td><td className={cell}>{m.revizyonNo}</td><td className={`${cell} font-semibold`}>Klasör No :</td><td className={cell}>{m.klasorNo}</td></tr>
        <tr><td className={`${cell} font-semibold`}>Yenileyen</td><td className={cell} colSpan={2}>{m.yenileyenRapor}</td><td className={`${cell} font-semibold`}>Rvzyn Tarihi</td><td className={cell}>{formatDateTR(m.revizyonTarihi)}</td><td className={`${cell} font-semibold`}>Arşiv Yeri :</td><td className={cell}>{m.arsivYeri}</td></tr>
      </tbody>
    </table>
  )
}

export function ReportFooter() {
  const m = REPORT_META as unknown as Record<string, string>
  return (
    <div className="mt-6 border-t border-black pt-1 text-[9px]">
      <div className="grid grid-cols-4 gap-2"><span>Yenileyen: {m.yenileyen}</span><span>Onaylayan: {m.onaylayan}</span><span>Yenilenme Tarihi:</span><span>Onaylanma Tarihi:</span></div>
      <div className="mt-1 text-center font-bold">{m.altbilgiNotu}</div>
    </div>
  )
}

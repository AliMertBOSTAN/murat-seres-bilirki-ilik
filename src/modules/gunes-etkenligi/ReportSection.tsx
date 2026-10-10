import type { CaseData } from '@/model/case'
import type { Settings } from '@/store/settingsStore'
import { computeGunes } from './index'
import { formatNumberTR } from '@/engine/excel-compat'

export function GunesReportSection({ caseData, settings }: { caseData: CaseData; settings: Settings }) {
  const r = computeGunes(caseData, settings)
  return (
    <div className="text-[12px]">
      <h2 className="my-3 text-center text-base font-bold">GÜNEŞ ETKENLİĞİ DEĞERLENDİRMESİ</h2>
      {!r.ok ? <p>{r.reason}</p> : (
        <>
          <table className="w-full border-collapse"><tbody>
            <tr><td className="w-56 border border-black px-2 py-0.5 font-bold">Tarih / saat</td><td className="border border-black px-2 py-0.5">{String(caseData.kazaYeri.tarih).slice(0, 10)} {String(caseData.kazaYeri.saat).slice(0, 5)}</td></tr>
            <tr><td className="border border-black px-2 py-0.5 font-bold">Güneş elevasyon / azimut</td><td className="border border-black px-2 py-0.5">{formatNumberTR(r.sun!.elevation, 2)}° / {formatNumberTR(r.sun!.azimuth, 2)}°</td></tr>
          </tbody></table>
          {r.araclar.filter((a) => a.g).map((a) => (
            <div key={a.index} className="mt-2 border border-black px-2 py-1"><b>{a.index + 1}. Araç</b> (heading {a.heading}°): θ = {formatNumberTR(a.g!.theta, 2)}°, {a.g!.sinif}, K = {a.g!.K}; reaksiyon mesafesi {formatNumberTR(a.g!.reaksiyonMesafesiNormal, 2)} m → glare {formatNumberTR(a.g!.reaksiyonMesafesiGlare, 2)} m.<div className="italic">{a.cumle}</div></div>
          ))}
          <p className="mt-2 text-[10px]">Kaynak: Güneş Etkenliği modülü v1.0.0 (NOAA yaklaşık algoritması). Saha koşulları ayrıca değerlendirilmelidir.</p>
        </>
      )}
    </div>
  )
}

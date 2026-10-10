import type { CaseData } from '@/model/case'
import type { Settings } from '@/store/settingsStore'
import { computeSurucuKacinma, computeKurumKacinma } from './compute'
import { formatNumberTR } from '@/engine/excel-compat'
import { CONSTANTS } from '@/content'
import type { KacinmaData } from './index'

export function KacinmaReportSection({ caseData, settings }: { caseData: CaseData; settings: Settings }) {
  const d = (caseData.modules['kacinma-mutalaa'] ?? {}) as KacinmaData
  const sen = (CONSTANTS as { kacinma: { senaryolar: string[] } }).kacinma.senaryolar
  return (
    <div className="text-[12px]">
      <h2 className="my-3 text-center text-base font-bold">SÜRÜCÜ KAZADAN KAÇINMA HESAPLAMASI (MÜTALAA)</h2>
      {(d.suruculer ?? []).map((s, i) => {
        const r = computeSurucuKacinma({ aldigiYol: Number(s.aldigiYol), yolunZamani: Number(s.yolunZamani), temelKusurPuani: Number(s.temelKusurPuani), senaryoPuanlari: s.senaryoPuanlari ?? [] }, { duzeltilmisCarpan: settings.duzeltmeler.kacinmaCarpan })
        return (
          <div key={i} className="mb-3 border border-black p-2">
            <b>{i + 1}. Sürücü</b> {String(caseData.suruculer[i]?.adi ?? '')} · {String(caseData.araclar[i]?.plaka ?? '')} — y = {s.aldigiYol} m, t = {s.yolunZamani} s → V = {r.hizKmS === '' ? '—' : formatNumberTR(r.hizKmS, 2)} km/s ({r.hizMS === '' ? '—' : formatNumberTR(r.hizMS, 2)} m/s)
            {s.muteala && <p className="mt-1 indent-6 text-justify">{s.muteala}</p>}
            <table className="mt-1 w-full border-collapse"><tbody>{sen.map((ad, k) => <tr key={k}><td className="border border-black px-1">{k + 1}- {ad}</td><td className="border border-black px-1">{r.senaryolar[k]?.durum}</td><td className="border border-black px-1 text-right">{formatNumberTR(Number(r.senaryolar[k]?.kusur || 0), 0)}</td><td className="border border-black px-1">{s.senaryoMutealalari?.[k]}</td></tr>)}</tbody></table>
            <div className="mt-1"><b>Kusur puanı:</b> {formatNumberTR(r.toplamKusur, 0)}</div>
            {s.sonucMuteala && <p className="mt-1 indent-6 text-justify">{s.sonucMuteala}</p>}
          </div>
        )
      })}
      {(d.kurumlar ?? []).map((k, i) => { const r = computeKurumKacinma({ temelKusur: Number(k.temelKusur), bilgiSuresi: k.bilgiSuresi, senaryoPuani: k.senaryoPuani ?? null }, { duzeltilmisAnlam: settings.duzeltmeler.kurumAnlam }); return <div key={i} className="mb-2 border border-black p-2"><b>Sorumlu kurum:</b> {k.kurum} / {k.sube} — bilgi süresi {k.bilgiSuresi}, kusur {formatNumberTR(r.kusur, 0)} ({r.durum}){k.muteala && <p className="mt-1 indent-6 text-justify">{k.muteala}</p>}</div> })}
    </div>
  )
}

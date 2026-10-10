/**
 * Güneş konumu (NOAA yaklaşık algoritması) ve glare 3B açı farkı θ.
 * Excel'deki satır kayması ve yerel ayar hataları burada DÜZELTİLMİŞTİR (tutarsızlık #20–22).
 */
const D2R = Math.PI / 180, R2D = 180 / Math.PI

export interface SolarInput { date: string /* YYYY-MM-DD */; time: string /* HH:MM */; utcOffset: number; lat: number; lon: number }
export interface SolarPosition { N: number; h: number; gamma: number; eot: number; declDeg: number; offset: number; tst: number; ha: number; zenith: number; elevation: number; azimuth: number }

export function dayOfYear(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const start = Date.UTC(y, 0, 1), cur = Date.UTC(y, m - 1, d)
  return Math.round((cur - start) / 86400000) + 1
}

export function solarPosition(i: SolarInput): SolarPosition {
  const N = dayOfYear(i.date)
  const [hh, mm] = i.time.split(':').map(Number)
  const h = hh + (mm || 0) / 60
  const gamma = (2 * Math.PI / 365) * (N - 1 + (h - 12) / 24)
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma))
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma)
  const offset = eot + 4 * i.lon - 60 * i.utcOffset
  const tst = (((h * 60 + offset) % 1440) + 1440) % 1440
  const ha = tst / 4 - 180
  const phi = i.lat * D2R
  const cosZ = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha * D2R)
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZ))) * R2D
  const elevation = 90 - zenith
  const az = (Math.atan2(Math.sin(ha * D2R), Math.cos(ha * D2R) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) * R2D + 180) % 360
  return { N, h, gamma, eot, declDeg: decl * R2D, offset, tst, ha, zenith, elevation, azimuth: (az + 360) % 360 }
}

export function thetaDeg(sun: { elevation: number; azimuth: number }, heading: number, pitch = 0): number {
  const el = sun.elevation * D2R, az = sun.azimuth * D2R, hd = heading * D2R, p = pitch * D2R
  const s = [Math.cos(el) * Math.sin(az), Math.cos(el) * Math.cos(az), Math.sin(el)]
  const v = [Math.cos(p) * Math.sin(hd), Math.cos(p) * Math.cos(hd), Math.sin(p)]
  const dot = s[0] * v[0] + s[1] * v[1] + s[2] * v[2]
  return Math.acos(Math.max(-1, Math.min(1, dot))) * R2D
}

export interface ThetaBand { max: number; sinif: string; K: number }
export const DEFAULT_BANDS: ThetaBand[] = [
  { max: 5, sinif: 'Tam körlük', K: 0.1 }, { max: 10, sinif: 'Çok yüksek', K: 0.4 }, { max: 20, sinif: 'Yüksek', K: 0.6 }, { max: 45, sinif: 'Orta', K: 0.8 }, { max: 180, sinif: 'Düşük/önemsiz', K: 1 },
]

export function classify(theta: number, bands: ThetaBand[] = DEFAULT_BANDS): ThetaBand {
  for (const b of bands) if (theta < b.max) return b
  return bands[bands.length - 1]
}

export interface GlareVehicleInput { heading: number; pitch?: number; hizKmS?: number; reaksiyonS?: number }
export interface GlareVehicleResult { theta: number; sinif: string; K: number; reaksiyonMesafesiNormal: number; reaksiyonMesafesiGlare: number; algiKaybi: number }

export function glareForVehicle(sun: SolarPosition, v: GlareVehicleInput, bands = DEFAULT_BANDS, defaults = { pitch: 0, hiz: 50, reaksiyon: 1.5 }): GlareVehicleResult {
  const theta = thetaDeg(sun, v.heading, v.pitch ?? defaults.pitch)
  const b = classify(theta, bands)
  const hiz = v.hizKmS ?? defaults.hiz, t = v.reaksiyonS ?? defaults.reaksiyon
  const normal = (hiz / 3.6) * t
  return { theta, sinif: b.sinif, K: b.K, reaksiyonMesafesiNormal: normal, reaksiyonMesafesiGlare: normal / b.K, algiKaybi: 1 / b.K }
}

export function raporCumlesi(sun: SolarPosition, g: GlareVehicleResult): string {
  const f = (x: number) => x.toFixed(1).replace('.', ',')
  return `Kaza anında güneş elevasyon ${f(sun.elevation)}°, azimut ${f(sun.azimuth)}° olup sürücü görüş doğrultusu ile güneş arasındaki 3B açı farkı θ=${f(g.theta)}° hesaplanmıştır. Bu değer ${g.sinif} sınıfında değerlendirilmiştir (K=${String(g.K).replace('.', ',')}).`
}

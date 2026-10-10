import type { CaseData } from '@/model/case'

export function download(name: string, blob: Blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
export function exportCaseJson(c: CaseData) {
  download(`${(c.dosya.dosyaNo || c.title || 'dosya').toString().replace(/[^\w.-]+/g, '_')}.seres.json`, new Blob([JSON.stringify({ format: 'seres-case', version: 1, case: c }, null, 1)], { type: 'application/json' }))
}
export async function importCaseJson(file: File): Promise<CaseData | null> {
  try {
    const j = JSON.parse(await file.text())
    const c = (j.case ?? j) as CaseData
    if (!c.dosya || !Array.isArray(c.factorEntries)) throw new Error('biçim')
    c.id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    return c
  } catch { alert('Dosya okunamadı: geçerli bir .seres.json değil.'); return null }
}

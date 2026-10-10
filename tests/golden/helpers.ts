import expected from '../../tests/golden/expected.json'

export interface ExpectedCell { sheet: string; cell: string; formula: string; cached: unknown }
const cells = expected.cells as ExpectedCell[]
const index = new Map<string, ExpectedCell>()
for (const c of cells) index.set(`${c.sheet}!${c.cell}`, c)

export function cached(sheet: string, cell: string): unknown {
  return index.get(`${sheet}!${cell}`)?.cached
}
export function hasCell(sheet: string, cell: string): boolean { return index.has(`${sheet}!${cell}`) }
export function formula(sheet: string, cell: string): string | undefined { return index.get(`${sheet}!${cell}`)?.formula }
export const ALL_EXPECTED = cells

/** Excel'in boş/0/FALSE değerlerini metin karşılaştırması için normalize eder. */
export function normText(v: unknown): string {
  if (v === null || v === undefined || v === 0 || v === false) return ''
  return String(v)
}

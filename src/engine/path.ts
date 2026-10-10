/** "araclar[1].cinsi" biçimindeki yollar için okuma/yazma. */
export function getPath(obj: unknown, path: string): unknown {
  if (!path) return undefined
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined
    const m = /^(\w+)\[(\d+)\]$/.exec(p)
    if (m) {
      const arr = (cur as Record<string, unknown>)[m[1]]
      cur = Array.isArray(arr) ? arr[+m[2]] : undefined
    } else cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let cur: Record<string, unknown> = obj
  parts.forEach((p, i) => {
    const last = i === parts.length - 1
    const m = /^(\w+)\[(\d+)\]$/.exec(p)
    if (m) {
      let arr = cur[m[1]] as unknown[]
      if (!Array.isArray(arr)) { arr = []; cur[m[1]] = arr }
      const idx = +m[2]
      while (arr.length <= idx) arr.push({})
      if (last) arr[idx] = value
      else cur = arr[idx] as Record<string, unknown>
    } else if (last) cur[p] = value
    else {
      if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {}
      cur = cur[p] as Record<string, unknown>
    }
  })
}

/** "araclar[].cinsi" → "araclar[2].cinsi" */
export function withEntity(path: string, index: number | null | undefined): string {
  return path.replace('[]', `[${index ?? 0}]`)
}

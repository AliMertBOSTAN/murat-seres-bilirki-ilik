/** Bağımlılık grafiği: girdi → kart → özet → rapor; modül → kart önerisi. */
import type { FactorDef } from './types'
import { withEntity } from './path'

export interface GNode { id: string; label: string; kind: 'input' | 'factor' | 'summary' | 'report' | 'module' | 'reference' | 'setting'; group?: string; data?: Record<string, unknown> }
export interface GEdge { id: string; source: string; target: string; label?: string }

export function buildGraph(defs: FactorDef[], opts: { modules?: { id: string; name: string; inputs: string[]; targets: string[] }[]; entityCounts?: Record<string, number> } = {}) {
  const nodes = new Map<string, GNode>()
  const edges: GEdge[] = []
  const add = (n: GNode) => { if (!nodes.has(n.id)) nodes.set(n.id, n) }
  add({ id: 'summary', label: 'Sonuç özeti (sonuç1)', kind: 'summary' })
  add({ id: 'report', label: 'Rapor', kind: 'report' })
  add({ id: 'setting:profiles', label: 'Durum kural profilleri', kind: 'setting' })
  edges.push({ id: 'e:sum-rep', source: 'summary', target: 'report' })
  for (const def of defs) {
    if (def.draft && !def.showInReport) continue
    const fid = `factor:${def.id}`
    add({ id: fid, label: def.title, kind: 'factor', group: def.group, data: { statusProfile: def.statusProfile } })
    edges.push({ id: `e:${fid}-sum`, source: fid, target: 'summary' })
    edges.push({ id: `e:prof-${fid}`, source: 'setting:profiles', target: fid, label: def.statusProfile })
    const vs = def.valueSource as { kind: string; path?: string }
    if (vs.kind === 'input' && vs.path) {
      const p = withEntity(vs.path, 0).replace(/\[\d+\]/, '[]')
      const iid = `input:${p}`
      add({ id: iid, label: p, kind: 'input', group: p.split('.')[0] })
      edges.push({ id: `e:${iid}-${fid}`, source: iid, target: fid })
    }
    add({ id: `input:entry.${def.id}`, label: `İnceleme / Müteala / Tespit`, kind: 'input', group: 'kart' })
    edges.push({ id: `e:entry-${fid}`, source: `input:entry.${def.id}`, target: fid })
  }
  for (const m of opts.modules ?? []) {
    const mid = `module:${m.id}`
    add({ id: mid, label: m.name, kind: 'module' })
    for (const i of m.inputs) { const iid = `input:${i}`; add({ id: iid, label: i, kind: 'input', group: i.split('.')[0] }); edges.push({ id: `e:${iid}-${mid}`, source: iid, target: mid }) }
    for (const t of m.targets) { const fid = `factor:${t}`; if (nodes.has(fid)) edges.push({ id: `e:${mid}-${fid}`, source: mid, target: fid, label: 'öneri' }) }
    edges.push({ id: `e:${mid}-report`, source: mid, target: 'report' })
  }
  return { nodes: [...nodes.values()], edges }
}

/** Sahipsiz girdi / döngü denetimi (modül kayıt defteri için). */
export function validateGraph(g: { nodes: GNode[]; edges: GEdge[] }): { orphanInputs: string[]; cycles: string[][] } {
  const targets = new Set(g.edges.map((e) => e.target))
  const sources = new Set(g.edges.map((e) => e.source))
  const orphanInputs = g.nodes.filter((n) => n.kind === 'input' && !sources.has(n.id) && !targets.has(n.id)).map((n) => n.id)
  const adj = new Map<string, string[]>()
  for (const e of g.edges) adj.set(e.source, [...(adj.get(e.source) ?? []), e.target])
  const cycles: string[][] = []
  const state = new Map<string, number>()
  const stack: string[] = []
  const dfs = (n: string) => {
    state.set(n, 1); stack.push(n)
    for (const m of adj.get(n) ?? []) {
      if (state.get(m) === 1) cycles.push([...stack.slice(stack.indexOf(m)), m])
      else if (!state.get(m)) dfs(m)
    }
    stack.pop(); state.set(n, 2)
  }
  for (const n of g.nodes) if (!state.get(n.id)) dfs(n.id)
  return { orphanInputs, cycles }
}

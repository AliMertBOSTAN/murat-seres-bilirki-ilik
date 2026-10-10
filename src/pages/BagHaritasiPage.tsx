import { useMemo, useState } from 'react'
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { buildGraph, validateGraph } from '@/engine/graph'
import { effectiveFactors, useAllResults } from '@/engine/selectors'
import { useSettingsStore } from '@/store/settingsStore'
import { useCaseStore } from '@/store/caseStore'
import { MODULE_DEFS, validateRegistry } from '@/modules/registry'
import { PageHeader, Tabs, Badge } from '@/ui/primitives'
import { runConsistencyChecks } from '@/engine/checks'
import { StatusChip } from '@/ui/StatusChip'
import inputFields from '@content/core/input-fields.json'

export function BagHaritasiPage() {
  const settings = useSettingsStore((s) => s.settings)
  const c = useCaseStore((s) => s.caseData)
  const all = useAllResults()
  const [tab, setTab] = useState<'harita' | 'kontroller'>('harita')
  const [group, setGroup] = useState<string>('yol-cevre')
  const graph = useMemo(() => buildGraph(effectiveFactors(settings).filter((f) => f.group === group), { modules: MODULE_DEFS.filter((m) => settings.enabledModules.includes(m.manifest.id) && m.manifest.status !== 'excel-bekleniyor').map((m) => ({ id: m.manifest.id, name: m.manifest.name, inputs: m.manifest.inputs.map((i) => i.from), targets: (m.manifest.hooks ?? []).map((h) => h.targetFactorId) })) }), [settings, group])
  const { nodes, edges } = useMemo(() => {
    const cols: Record<string, number> = { input: 0, module: 1, setting: 1, factor: 2, summary: 3, report: 4 }
    const counts: Record<number, number> = {}
    const nodes: Node[] = graph.nodes.map((n) => {
      const col = cols[n.kind] ?? 2
      const row = counts[col] = (counts[col] ?? 0) + 1
      const res = n.kind === 'factor' ? [...all.values()].find((k) => `factor:${k.def.id}` === n.id) : undefined
      const color = n.kind === 'input' ? '#F4EEE4' : n.kind === 'module' ? '#e3f5fb' : n.kind === 'setting' ? '#f6edd6' : n.kind === 'factor' ? '#fff' : '#0E2A47'
      return { id: n.id, position: { x: col * 330, y: row * 46 }, sourcePosition: Position.Right, targetPosition: Position.Left,
        data: { label: <div className="text-[10px] leading-tight"><div className="font-semibold">{n.label.slice(0, 48)}</div>{res && <div className="mt-0.5 flex items-center gap-1 text-[9px]"><span className="h-2 w-2 rounded-full" style={{ background: res.result.durum === 'ETKEN' ? '#FF0000' : res.result.durum === 'İNCELENMELİ' ? '#00B0F0' : res.result.durum ? '#92D050' : '#ddd' }} />{res.result.durum || 'boş'} · {res.result.incelemeDurumu || '—'}</div>}</div> },
        style: { background: color, color: n.kind === 'summary' || n.kind === 'report' ? '#fff' : '#1d2430', border: '1px solid rgba(14,42,71,.2)', borderRadius: 8, padding: '4px 8px', width: 240 } }
    })
    const edges: Edge[] = graph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, animated: e.source.startsWith('module:'), style: { stroke: e.source.startsWith('setting') ? '#C9A24A' : '#1FA9D6', strokeWidth: 1 }, labelStyle: { fontSize: 9 } }))
    return { nodes, edges }
  }, [graph, all])
  const validation = useMemo(() => validateGraph(graph), [graph])
  const registry = useMemo(() => validateRegistry(settings.enabledModules, new Set([...(inputFields.grs1 as { path: string }[]).map((f) => f.path.replace('[]', '[0]')), 'kazaYeri.konum', 'araclar[0].seyirYonu', 'araclar[0].hiz', 'suruculer[0].bakisEgimi', 'suruculer[0].reaksiyonSuresi'])), [settings.enabledModules])
  const checks = useMemo(() => runConsistencyChecks(c, all, settings), [c, all, settings])

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Bağ Haritası ve Kontroller" subtitle="Veri akışı: girdi → etken kartı → sonuç özeti → rapor; modüller kartlara öneri üretir. Kontroller sekmesi eksik girdileri, tanımsız kuralları, kopuk referansları ve tutarlılık kurallarını listeler." />
      <Tabs tabs={[{ id: 'harita', label: 'Bağ Haritası' }, { id: 'kontroller', label: 'Kontroller', count: checks.length + registry.length }]} value={tab} onChange={setTab} />
      {tab === 'harita' && (
        <div className="mt-4">
          <div className="mb-2 seg">{['yol-cevre', 'arac', 'surucu', 'yolcu', 'yaya'].map((g) => <button key={g} aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</button>)}</div>
          <div className="kart h-[70vh] overflow-hidden">
            <ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.1} nodesDraggable={false}><Background color="#e8dfd0" /><Controls /><MiniMap pannable zoomable /></ReactFlow>
          </div>
          <p className="mt-2 text-xs text-gri">Düğümler: krem = girdi (Grş 1 / kart), beyaz = etken kartı, camgöbeği = modül, altın = kural profili. Döngü: {validation.cycles.length} · sahipsiz girdi: {validation.orphanInputs.length}</p>
        </div>
      )}
      {tab === 'kontroller' && (
        <div className="mt-4 space-y-3">
          {registry.map((r, i) => <div key={i} className="kart flex items-center gap-3 p-3 text-sm"><Badge tone={r.level === 'hata' ? 'kirmizi' : 'altin'}>{r.level}</Badge><span className="text-gri">{r.moduleId}</span><span>{r.message}</span></div>)}
          {checks.length === 0 && registry.length === 0 && <div className="kart p-6 text-center text-sm text-gri">Sorun bulunmadı.</div>}
          {checks.map((k, i) => (
            <div key={i} className="kart flex flex-wrap items-center gap-3 p-3 text-sm">
              <Badge tone={k.level === 'hata' ? 'kirmizi' : k.level === 'uyari' ? 'altin' : 'gri'}>{k.kind}</Badge>
              <span className="flex-1">{k.message}</span>
              {k.durum && <StatusChip value={k.durum} size="sm" />}
              {k.link && <a href={k.link} className="text-xs text-camgobegi hover:underline">git →</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

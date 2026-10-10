/**
 * Etken Kartı motoru: FactorDef (içerik) + FactorEntry (kullanıcı) + Case (girdiler) → FactorResult.
 * Her adım provenance'a yazılır ("Neden bu sonuç?" paneli).
 */
import type { FactorDef, FactorEntry, FactorResult, Part, Source, StatusProfile, ValueSource, EngineSettings, ProvenanceStep } from './types'
import { DEFAULT_ENGINE_SETTINGS } from './types'
import { eqTR, excelText, hourOf, vlookupExact, vlookupApprox } from './excel-compat'
import { getPath, withEntity } from './path'
import { decideStatus } from './status'

export interface EvalContext {
  caseData: Record<string, unknown>
  profiles: Map<string, StatusProfile>
  settings?: EngineSettings
  contentVersion?: string
}

export function resolveValue(def: FactorDef, entry: FactorEntry | undefined, ctx: EvalContext, prov: ProvenanceStep[]): unknown {
  const vs: ValueSource = def.valueSource
  if (vs.kind === 'input' && typeof vs.path === 'string') {
    const path = withEntity(vs.path, entry?.entityIndex ?? 0)
    const v = getPath(ctx.caseData, path)
    prov.push({ step: 'Girdi', detail: `${path} = ${excelText(v) || '(boş)'}`, source: String(vs.cell ?? '') })
    return v
  }
  if (vs.kind === 'card' && vs.field === 'subTitle') return def.subTitle
  const v = entry?.selectedValue ?? ''
  prov.push({ step: 'Kart seçimi', detail: `Değer = ${excelText(v) || '(boş)'}`, source: def.sourceRef.sheet ? `${def.sourceRef.sheet}!E${(def.sourceRef.statusRow ?? 0) - 1}` : undefined })
  return v
}

function joinParts(texts: string[], mode: 'excel' | 'okunur'): string {
  if (mode === 'excel') return texts.join('')
  return texts.map((t) => t.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function renderParts(parts: Part[] | undefined, env: { value: unknown; incelemeDurumu: string; durum: string; subTitle: string }, mode: 'excel' | 'okunur', prov?: ProvenanceStep[]): string {
  if (!parts) return ''
  const out: string[] = []
  for (const p of parts) {
    switch (p.kind) {
      case 'value': out.push(excelText(env.value)); break
      case 'text': out.push(p.text ?? ''); if (prov && p.source) prov.push({ step: 'Kütüphane metni', detail: (p.text ?? '').slice(0, 80), source: p.source }); break
      case 'literal': out.push(p.text ?? ''); break
      case 'blank': break
      case 'hourOf': out.push(excelText(hourOf(env.value))); break
      case 'incelemeDurumu': out.push(env.incelemeDurumu); break
      case 'durum': out.push(env.durum); break
      case 'subTitle': out.push(p.text ?? env.subTitle); break
      case 'error': out.push(p.value ?? '#REF!'); break
      default: out.push(p.text ?? '')
    }
  }
  return joinParts(out, mode)
}

function resolveSource(src: Source | undefined, env: { value: unknown; incelemeDurumu: string; durum: string; subTitle: string }, settings: EngineSettings, prov: ProvenanceStep[], label: string): string {
  if (!src) return ''
  switch (src.kind) {
    case 'text': {
      prov.push({ step: label, detail: 'Etken düzeyi sabit metin', source: String(src.source ?? '') })
      return String(src.text ?? '')
    }
    case 'literal': return String(src.text ?? '')
    case 'empty': return ''
    case 'value': return excelText(env.value)
    case 'incelemeDurumu': return env.incelemeDurumu
    case 'durum': return env.durum
    case 'parts': return renderParts(src.parts as Part[], env, settings.renderMode, prov)
    case 'option': {
      const key = env.value
      if (key === '' || key === null || key === undefined) { prov.push({ step: label, detail: 'Değer boş → ""' }); return '' }
      const table = src.table as { key: string; text: string; row?: number }[]
      const exact = settings.vlookupExactAlways || src.exact !== false
      const row = exact ? vlookupExact(key, table) : vlookupApprox(key, table)
      if (!row) { prov.push({ step: label, detail: `"${excelText(key)}" seçeneği tabloda yok (#N/A)`, source: String(src.range ?? '') }); return '' }
      prov.push({ step: label, detail: `Seçeneğe özel metin: "${excelText(key)}" → ${src.range ?? ''} sütun ${src.column ?? ''} (satır ${row.row ?? '?'})`, source: String(src.range ?? '') })
      return row.text
    }
    case 'conditional': {
      const subject = src.on === 'durum' ? env.durum : src.on === 'incelemeDurumu' ? env.incelemeDurumu : src.on === 'value' || src.on === 'input' ? excelText(env.value) : src.on === 'blank' ? '' : env.durum
      for (const b of src.branches as { when: string; then: Source }[]) {
        if (eqTR(subject, b.when)) {
          prov.push({ step: label, detail: `${src.on} = "${b.when}" dalı`, source: undefined })
          return resolveSource(b.then, env, settings, prov, label)
        }
      }
      prov.push({ step: label, detail: `${src.on} = "${subject}" → aksi dal` })
      return resolveSource(src.else as Source, env, settings, prov, label)
    }
    default: return typeof (src as { text?: string }).text === 'string' ? String((src as { text?: string }).text) : ''
  }
}

export function evaluateFactor(def: FactorDef, entry: FactorEntry | undefined, ctx: EvalContext): FactorResult {
  const settings = ctx.settings ?? DEFAULT_ENGINE_SETTINGS
  const prov: ProvenanceStep[] = []
  const value = resolveValue(def, entry, ctx, prov)
  const incelemeDurumu = String(entry?.incelemeDurumu ?? '')
  prov.push({ step: 'İnceleme Durumu', detail: incelemeDurumu || '(boş)', source: def.sourceRef.sheet ? `${def.sourceRef.sheet}!E${def.sourceRef.statusRow}` : undefined })

  const profileId = settings.statusProfileOverride ?? def.statusProfile
  const profile = ctx.profiles.get(profileId) ?? ctx.profiles.get(def.statusProfile)
  let durum = '', durumDefined = true
  if (profile) {
    const d = decideStatus(profile, incelemeDurumu)
    durum = d.durum; durumDefined = d.defined
    prov.push({ step: 'Kural', detail: `${profile.id} profili: "${d.matchedKey ?? incelemeDurumu}" ⇒ ${durum}${d.defined ? '' : ' (Excel: FALSE)'}`, source: def.sourceRef.sheet ? `${def.sourceRef.sheet}!V${def.sourceRef.statusRow}` : profile.firstSeen })
  }
  const env = { value, incelemeDurumu, durum, subTitle: def.subTitle }

  // Ek dosya bayrağı
  let ekDosya = ''
  if (def.ekDosya.kind === 'rule') {
    const on = (def.ekDosya as { on?: string }).on ?? 'incelemeDurumu'
    const subject = on === 'sorumlu' ? String(entry?.sorumlu ?? '') : on === 'value' ? excelText(value) : on === 'other' ? '' : incelemeDurumu
    const hidden = (def.ekDosya.hideWhen ?? []).some((h) => eqTR(subject, h))
    ekDosya = hidden ? '' : (def.ekDosya.parts ? renderParts(def.ekDosya.parts, env, settings.renderMode) : `${def.ekDosya.kod ?? ''}${def.ekDosya.metin ?? ''}`)
    prov.push({ step: 'Ek dosya', detail: hidden ? `${on} = "${subject}" için gizli` : (ekDosya || '(boş)') + (on !== 'incelemeDurumu' ? ` (Excel koşulu ${on} hücresine bakıyor)` : '') })
  } else if (def.ekDosya.kind === 'manual') {
    ekDosya = String(entry?.altSecim ?? def.ekDosya.value ?? '')
  }

  // Değer durumu başlığı ("Şafak Vakti Durumu")
  let degerDurumMetni = ''
  if (Array.isArray(def.degerDurum)) degerDurumMetni = renderParts(def.degerDurum, env, settings.renderMode)
  else if (def.degerDurum && 'literal' in def.degerDurum) degerDurumMetni = def.degerDurum.literal

  // Kazada durumu cümlesi
  let kazada = ''
  if (def.kazadaDurumu.kind === 'rule') {
    let matched = false
    for (const b of def.kazadaDurumu.branches ?? []) {
      const subject = b.on === 'value' || b.on === 'input' ? excelText(value) : incelemeDurumu
      if (eqTR(subject, b.when)) {
        kazada = renderParts(b.parts, env, settings.renderMode, prov)
        prov.push({ step: 'Kazada durumu', detail: `${b.on === 'value' || b.on === 'input' ? 'Değer' : 'İnceleme Durumu'} = "${b.when}" dalı` })
        matched = true
        break
      }
    }
    if (!matched) { kazada = renderParts(def.kazadaDurumu.else, env, settings.renderMode, prov); prov.push({ step: 'Kazada durumu', detail: 'Değer + önlem metni birleştirildi' }) }
  }

  const aciklama = resolveSource(def.fields.aciklama, env, settings, prov, 'Açıklama')
  const nedensellik = resolveSource(def.fields.nedensellik, env, settings, prov, 'Nedensellik')
  const sorunAciklama = resolveSource(def.fields.sorun, env, settings, prov, 'Sorun açıklama')
  const extra = (def.extraBlocks ?? []).map((b) => ({ label: b.label, text: b.source ? resolveSource(b.source as Source, env, settings, prov, b.label) : excelText(b.sampleValue) }))
  prov.push({ step: 'Kütüphane', detail: `İçerik v${ctx.contentVersion ?? '1.0.0'} › ${def.id}`, source: def.sourceRef.library.sheet ? `${def.sourceRef.library.sheet}!${def.sourceRef.library.cell}` : undefined })

  return {
    factorId: def.id, entityIndex: entry?.entityIndex ?? null, value, valueText: excelText(value), incelemeDurumu, durum, durumDefined,
    ekDosyaBayragi: ekDosya, degerDurumMetni, kazadaDurumu: kazada, aciklama, nedensellik, sorunAciklama, extra, provenance: prov,
  }
}

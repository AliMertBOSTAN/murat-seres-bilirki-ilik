import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, useId } from 'react'
import { cn } from './cn'
import { useSettingsStore } from '@/store/settingsStore'

export function Field({ label, hint, children, className, source }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; source?: string }) {
  const showRefs = useSettingsStore((s) => s.settings.showExcelRefs)
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-lacivert">{label}</span>
        {source && showRefs && <span className="font-mono text-[10px] text-gri" title="Excel kaynağı">{source}</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gri">{hint}</span>}
    </label>
  )
}

export function Select({ options, value, onChange, placeholder = '— seçin —', className, ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & { options: (string | number | { value: string; label: string })[]; value: string | number | null | undefined; onChange: (v: string) => void; placeholder?: string }) {
  const vals = options.map((o) => (typeof o === 'object' ? o.value : String(o)))
  const cur = value === null || value === undefined ? '' : String(value)
  const missing = cur && !vals.includes(cur)
  return (
    <select className={cn('input', className)} value={cur} onChange={(e) => onChange(e.target.value)} {...rest}>
      <option value="">{placeholder}</option>
      {missing && <option value={cur}>{cur} (listede yok)</option>}
      {options.map((o) => { const v = typeof o === 'object' ? o.value : String(o); const l = typeof o === 'object' ? o.label : String(o); return <option key={v} value={v}>{l}</option> })}
    </select>
  )
}

export function TextInput({ value, onChange, className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & { value: string | number | null | undefined; onChange: (v: string) => void }) {
  return <input className={cn('input', className)} value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value)} {...rest} />
}

export function TextArea({ value, onChange, className, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & { value: string | null | undefined; onChange: (v: string) => void }) {
  return <textarea className={cn('input min-h-[72px] leading-relaxed', className)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
}

/** Serbest metin + öneri listesi (datalist). */
export function ComboInput({ options, value, onChange, className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'list'> & { options: string[]; value: string | number | null | undefined; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <>
      <input className={cn('input', className)} list={id} value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value)} {...rest} />
      <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>
    </>
  )
}

export function Segmented<T extends string>({ options, value, onChange, labels, className, size = 'sm' }: { options: T[]; value: T | '' | null | undefined; onChange: (v: T | '') => void; labels?: Partial<Record<T, string>>; className?: string; size?: 'sm' | 'xs' }) {
  return (
    <div className={cn('seg', className)} role="group">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} className={size === 'xs' ? '!px-2 !py-0.5 !text-[11px]' : ''} onClick={() => onChange(value === o ? '' : o)}>{labels?.[o] ?? o}</button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <span role="switch" aria-checked={checked} tabIndex={0} onClick={() => onChange(!checked)} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!checked) } }}
        className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-camgobegi' : 'bg-krem-200')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4.5' : 'translate-x-0.5')} />
      </span>
      {label}
    </label>
  )
}

export function Badge({ children, tone = 'gri', className, title }: { children: ReactNode; tone?: 'gri' | 'altin' | 'cam' | 'kirmizi' | 'yesil' | 'lacivert'; className?: string; title?: string }) {
  const tones = { gri: 'bg-krem-200 text-gri', altin: 'bg-altin-100 text-bronz', cam: 'bg-camgobegi-100 text-lacivert', kirmizi: 'bg-red-50 text-red-700', yesil: 'bg-green-50 text-green-700', lacivert: 'bg-lacivert text-white' }
  return <span title={title} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', tones[tone], className)}>{children}</span>
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-krem-200" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn('-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors', value === t.id ? 'border-camgobegi text-lacivert' : 'border-transparent text-gri hover:text-lacivert')}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-krem px-1.5 text-[10px] text-gri">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Drawer({ open, onClose, title, children, width = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: 'md' | 'lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-lacivert/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside className={cn('relative flex h-full flex-col bg-kagit shadow-2xl', width === 'lg' ? 'w-full max-w-3xl' : 'w-full max-w-xl')}>
        <header className="flex items-center justify-between border-b border-krem-200 px-5 py-3">
          <h3 className="text-lg font-semibold text-lacivert">{title}</h3>
          <button className="btn-ghost" onClick={onClose} aria-label="Kapat">✕</button>
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  )
}

export function PageHeader({ title, subtitle, sheet, actions, next }: { title: ReactNode; subtitle?: ReactNode; sheet?: string; actions?: ReactNode; next?: { to: string; label: string } }) {
  const showRefs = useSettingsStore((s) => s.settings.showExcelRefs)
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {sheet && showRefs && <div className="etiket">Excel sayfası: {sheet}</div>}
        <h1 className="text-3xl font-semibold leading-tight text-lacivert">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-gri">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{actions}{next && <a href={next.to} className="btn-outline">{next.label} →</a>}</div>
    </header>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="kart p-8 text-center text-sm text-gri">{children}</div>
}

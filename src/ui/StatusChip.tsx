import { cn } from './cn'

const COLORS: Record<string, string> = {
  'ETKEN': '#FF0000', 'Yok': '#FF0000',
  'ETKEN DEĞİL': '#92D050', 'Yeterli': '#92D050', 'Var': '#92D050', 'Aranmadı': '#92D050',
  'İNCELENMELİ': '#00B0F0', 'İNCELEMELİ': '#00B0F0', 'Yetersiz': '#00B0F0',
  'Davranış': '#5B9BD5', 'Belirsiz': '#5B9BD5',
  'ÖZEL İSTEMLİ': '#8497B0',
  'Çok İyi': '#00B050', 'İyi': '#92D050', 'Normal': '#00B0F0', 'Kötü': '#FFC000', 'Çok Kötü': '#FF0000', 'Çok Kötu': '#FF0000',
}
export const statusColor = (v: string) => COLORS[v.trim()] ?? '#cbd5e1'

export function StatusChip({ value, defined = true, size = 'md', className }: { value: string; defined?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const v = value || '—'
  const color = defined ? statusColor(value) : '#e5e7eb'
  const dark = ['#FF0000', '#5B9BD5', '#8497B0', '#00B050'].includes(color)
  return (
    <span style={{ ['--chip' as string]: color }} className={cn('chip-durum inline-flex items-center rounded-full font-semibold tracking-wide shadow-sm ring-1 ring-black/10 transition-colors duration-500',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs', dark ? 'text-white [text-shadow:0_0_2px_rgba(0,0,0,.4)]' : 'text-murekkep', !defined && 'text-amber-800 ring-amber-300', className)}>
      {defined ? v : '⚠ Kural tanımsız'}
    </span>
  )
}

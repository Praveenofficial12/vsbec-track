'use client'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: { value: string; positive?: boolean }
  accent?: 'emerald' | 'teal' | 'amber' | 'rose' | 'violet' | 'sky' | 'slate'
  onClick?: () => void
  className?: string
}

const ACCENT_STYLES: Record<string, { bg: string; text: string; ring: string; gradient: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200/60 dark:ring-emerald-800/60', gradient: 'from-emerald-500 to-teal-500' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-200/60 dark:ring-teal-800/60', gradient: 'from-teal-500 to-cyan-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200/60 dark:ring-amber-800/60', gradient: 'from-amber-500 to-orange-500' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-200/60 dark:ring-rose-800/60', gradient: 'from-rose-500 to-pink-500' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200/60 dark:ring-violet-800/60', gradient: 'from-violet-500 to-purple-500' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-200/60 dark:ring-sky-800/60', gradient: 'from-sky-500 to-blue-500' },
  slate: { bg: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-600 dark:text-slate-400', ring: 'ring-slate-200/60 dark:ring-slate-700/60', gradient: 'from-slate-500 to-slate-600' },
}

export function StatCard({ title, value, subtitle, icon, trend, accent = 'emerald', onClick, className }: StatCardProps) {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.emerald
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-300',
        'hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/30',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Decorative gradient blob */}
      <div className={cn('absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-30', styles.gradient)} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={cn('text-xs font-medium', trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ring-1 transition-transform duration-300 group-hover:scale-110', styles.bg, styles.text, styles.ring)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

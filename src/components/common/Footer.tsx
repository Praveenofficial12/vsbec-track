'use client'

import { GraduationCap, ShieldCheck, Sparkles } from 'lucide-react'
import { COLLEGE_LOGO, COLLEGE_NAME, COLLEGE_SHORT } from '@/lib/college'
import { cn } from '@/lib/utils'

interface FooterProps {
  /** Extra classes appended to the outer <footer> element. */
  className?: string
  /**
   * Visual variant. `default` = muted background + emerald top border
   * (used on most pages). `solid` = solid emerald gradient bar (used on
   * auth pages where the background is busy with floating orbs).
   */
  variant?: 'default' | 'solid'
}

/**
 * Reusable sticky footer for the VSBEC Placement Management System.
 *
 * Layout: college logo + name on the left, "Developed by Batch 2027"
 * on the right. On mobile / tablet the two groups stack and center.
 *
 * Stickiness: the parent wrapper must be `min-h-screen flex flex-col`
 * — the footer itself uses `mt-auto` so it sticks to the bottom of the
 * viewport when content is short, and is pushed down naturally when
 * content exceeds the viewport height.
 */
export function Footer({ className, variant = 'default' }: FooterProps) {
  const year = new Date().getFullYear()

  if (variant === 'solid') {
    return (
      <footer
        className={cn(
          'relative z-10 mt-auto w-full border-t border-emerald-700/40 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white',
          'supports-[env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]',
          className,
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white/15 backdrop-blur">
              <img
                src={COLLEGE_LOGO}
                alt={`${COLLEGE_NAME} logo`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold leading-tight">{COLLEGE_SHORT} Placement Management System</p>
              <p className="text-[10px] text-white/70">© {year} {COLLEGE_NAME}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-200" />
            <span>Developed by</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold tracking-wide">
              Batch 2027
            </span>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer
      className={cn(
        'relative z-10 mt-auto w-full border-t border-emerald-200/60 bg-muted/40 backdrop-blur',
        'dark:border-emerald-900/40 dark:bg-muted/20',
        'supports-[env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
        {/* Left — VSBEC brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white shadow-soft ring-1 ring-emerald-200/60 dark:bg-emerald-900/30 dark:ring-emerald-800/60">
            <img
              src={COLLEGE_LOGO}
              alt={`${COLLEGE_NAME} logo`}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </div>
          <div className="text-center sm:text-left">
            <p className="flex items-center gap-1 text-xs font-semibold text-foreground">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {COLLEGE_SHORT} Placement Management System
            </p>
            <p className="text-[10px] text-muted-foreground">
              © {year} {COLLEGE_NAME}. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right — Developed by Batch 2027 */}
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Developed by</span>
          <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text font-bold text-transparent dark:from-emerald-400 dark:to-teal-400">
            Batch 2027
          </span>
        </div>
      </div>
    </footer>
  )
}

export default Footer

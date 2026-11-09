import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  icon?: ReactNode
}

export function Chip({ selected = false, icon, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-touch items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-[15px] font-medium transition active:scale-[0.98]',
        selected
          ? 'border-brand bg-brand-soft text-brand-strong'
          : 'border-line bg-surface text-ink hover:bg-surface2',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

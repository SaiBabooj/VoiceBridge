import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'plain' | 'surface' | 'brand' | 'ghost'

const variants: Record<Variant, string> = {
  plain: 'text-ink hover:bg-surface2',
  surface: 'bg-surface border border-line text-ink hover:bg-surface2',
  brand: 'bg-brand text-onbrand hover:bg-brand-strong',
  ghost: 'bg-transparent text-muted hover:text-ink hover:bg-surface2',
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const sizes = {
  sm: 'h-11 w-11 min-h-11 min-w-11 rounded-xl',
  md: 'h-12 w-12 min-h-touch min-w-touch rounded-2xl',
  lg: 'h-14 w-14 min-h-14 min-w-14 rounded-2xl',
}

export function IconButton({
  label,
  variant = 'plain',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger' | 'success' | 'soft'
type Size = 'md' | 'lg' | 'xl'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-onbrand shadow-soft hover:bg-brand-strong',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface2',
  ghost: 'bg-transparent text-ink hover:bg-surface2',
  accent: 'bg-accent text-onaccent shadow-soft',
  danger: 'bg-danger text-white',
  success: 'bg-success text-white',
  soft: 'bg-brand-soft text-brand-strong',
}

const sizes: Record<Size, string> = {
  md: 'min-h-touch px-5 text-[15px]',
  lg: 'min-h-[56px] px-6 text-base',
  xl: 'min-h-[64px] px-6 text-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : icon}
      {children}
    </button>
  )
}

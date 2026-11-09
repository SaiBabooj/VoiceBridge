import { AlertTriangle, CheckCircle2, Info, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'warning' | 'info' | 'danger' | 'success'

const tones: Record<Tone, { wrap: string; icon: string }> = {
  warning: { wrap: 'border-accent bg-accent-soft text-ink', icon: 'text-accent' },
  info: { wrap: 'border-line bg-surface2 text-ink', icon: 'text-brand' },
  danger: { wrap: 'border-danger bg-danger-soft text-ink', icon: 'text-danger' },
  success: { wrap: 'border-success bg-success-soft text-ink', icon: 'text-success' },
}

const icons: Record<Tone, ReactNode> = {
  warning: <AlertTriangle aria-hidden className="h-5 w-5" />,
  info: <Info aria-hidden className="h-5 w-5" />,
  danger: <WifiOff aria-hidden className="h-5 w-5" />,
  success: <CheckCircle2 aria-hidden className="h-5 w-5" />,
}

export interface BannerProps {
  tone?: Tone
  title?: string
  children?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
  role?: 'status' | 'alert'
}

export function Banner({
  tone = 'info',
  title,
  children,
  action,
  icon,
  className,
  role = 'status',
}: BannerProps) {
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-3.5 text-sm leading-relaxed',
        tones[tone].wrap,
        className,
      )}
    >
      <span className={cn('mt-0.5 shrink-0', tones[tone].icon)}>{icon ?? icons[tone]}</span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5 text-[13px] text-muted')}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  )
}

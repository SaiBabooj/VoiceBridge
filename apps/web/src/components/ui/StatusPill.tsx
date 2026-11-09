import { cn } from '../../lib/utils'

type Tone = 'online' | 'offline' | 'reconnecting' | 'warning' | 'neutral' | 'success'

const tones: Record<Tone, string> = {
  online: 'bg-success-soft text-ink',
  success: 'bg-success-soft text-ink',
  offline: 'bg-danger-soft text-ink',
  reconnecting: 'bg-accent-soft text-ink',
  warning: 'bg-accent-soft text-ink',
  neutral: 'bg-surface2 text-muted',
}

const dots: Record<Tone, string> = {
  online: 'bg-success',
  success: 'bg-success',
  offline: 'bg-danger',
  reconnecting: 'bg-accent',
  warning: 'bg-accent',
  neutral: 'bg-muted',
}

export function StatusPill({
  tone = 'neutral',
  label,
  className,
}: {
  tone?: Tone
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold',
        tones[tone],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} aria-hidden="true" />
      {label}
    </span>
  )
}

import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  body: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-soft text-brand-strong">
        {icon}
      </div>
      <h2 className="heading-lg">{title}</h2>
      <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-5 w-full max-w-[280px]">{action}</div> : null}
    </div>
  )
}

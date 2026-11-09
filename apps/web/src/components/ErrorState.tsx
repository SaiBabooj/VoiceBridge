import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

export function ErrorState({
  title,
  body,
  action,
  className,
}: {
  title: string
  body: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'mx-4 my-6 flex flex-col items-center rounded-3xl border border-line bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle aria-hidden className="h-7 w-7" />
      </div>
      <h2 className="heading-lg">{title}</h2>
      <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-5 w-full max-w-[300px]">{action}</div> : null}
    </div>
  )
}

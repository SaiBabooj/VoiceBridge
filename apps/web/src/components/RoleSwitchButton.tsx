import { CarFront, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'

export function RoleSwitchButton({
  destination,
  onClick,
  className,
  attention = false,
}: {
  destination: 'traveller' | 'driver'
  onClick: () => void
  className?: string
  attention?: boolean
}) {
  const { t } = useTranslation()
  const toDriver = destination === 'driver'
  const label = toDriver ? t('role.driver') : t('role.traveller')

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={toDriver ? t('role.switchToDriver') : t('role.switchToTraveller')}
      title={toDriver ? t('role.switchToDriver') : t('role.switchToTraveller')}
      className={cn(
        'inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-xs font-semibold text-ink transition active:scale-95',
        className,
      )}
    >
      <span
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-full',
          toDriver ? 'bg-accent text-onaccent' : 'bg-brand-soft text-brand-strong',
        )}
      >
        {attention ? (
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 rounded-full border-2 animate-attention motion-reduce:hidden',
              toDriver ? 'border-accent' : 'border-brand',
            )}
          />
        ) : null}
        {toDriver ? (
          <CarFront aria-hidden className="h-4 w-4" />
        ) : (
          <UserRound aria-hidden className="h-4 w-4" />
        )}
      </span>
      {label}
    </button>
  )
}

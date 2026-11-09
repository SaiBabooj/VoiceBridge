import { BadgeCheck, ChevronRight, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_MAP } from '../lib/languages'
import { formatINR } from '../lib/utils'
import type { Driver } from '../types'
import { Avatar } from './ui/Avatar'
import { StatusPill } from './ui/StatusPill'

export function DriverCard({ driver, onOpen }: { driver: Driver; onOpen: () => void }) {
  const { t } = useTranslation()
  const languages = driver.languages.map((code) => LANGUAGE_MAP[code].nativeName).join(' · ')

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-3xl border border-line bg-surface p-4 text-left shadow-soft transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={driver.name} variant={driver.avatarVariant} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[17px] font-semibold leading-tight">{driver.name}</span>
                {driver.verified ? (
                  <BadgeCheck
                    aria-label={t('drivers.verified')}
                    className="h-4 w-4 shrink-0 text-brand"
                  />
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <Star aria-hidden className="h-3.5 w-3.5 fill-accent text-accent" />
                <span className="font-semibold text-ink">{driver.rating.toFixed(1)}</span>
                <span aria-hidden>·</span>
                <span>{t('drivers.trips', { count: driver.trips })}</span>
              </div>
            </div>
            <StatusPill tone="warning" label={t('common.sample')} />
          </div>

          <p className="mt-2 truncate text-sm text-muted">
            {driver.car} · {languages}
          </p>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="num text-[15px] font-semibold">
              {formatINR(driver.priceMin)}–{formatINR(driver.priceMax)}
              <span className="ml-1 text-xs font-normal text-muted">{t('common.perDay')}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span
                className={`h-1.5 w-1.5 rounded-full ${driver.available ? 'bg-success' : 'bg-muted'}`}
                aria-hidden="true"
              />
              {driver.available ? t('drivers.available') : t('drivers.busy')}
              <ChevronRight aria-hidden className="ml-0.5 h-4 w-4 text-muted" />
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

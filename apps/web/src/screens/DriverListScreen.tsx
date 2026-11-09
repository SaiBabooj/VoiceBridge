import { ArrowLeft, CarFront, RefreshCw, SlidersHorizontal, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DriverCard } from '../components/DriverCard'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Banner } from '../components/ui/Banner'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { Skeleton } from '../components/ui/Skeleton'
import { api } from '../lib/api'
import { LANGUAGES, LANGUAGE_MAP } from '../lib/languages'
import type { DriverFilters } from '../lib/mockData'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import type { Driver, LangCode, VehicleType } from '../types'

const DEFAULT_FILTERS: DriverFilters = {
  language: 'all',
  vehicle: 'all',
  sort: 'recommended',
}

function filtersActive(filters: DriverFilters): boolean {
  return (
    (filters.language && filters.language !== 'all') ||
    (filters.vehicle && filters.vehicle !== 'all') ||
    (filters.sort && filters.sort !== 'recommended')
  )
    ? true
    : false
}

export default function DriverListScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [filters, setFilters] = useState<DriverFilters>(DEFAULT_FILTERS)
  const [draft, setDraft] = useState<DriverFilters>(DEFAULT_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const result = await api.listDrivers(filters)
      setDrivers(result)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  useEffect(() => {
    if (online && error) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const activeCount = useMemo(
    () =>
      [filters.language !== 'all', filters.vehicle !== 'all', filters.sort !== 'recommended'].filter(
        Boolean,
      ).length,
    [filters],
  )

  const openFilters = () => {
    setDraft(filters)
    setSheetOpen(true)
  }

  const applyFilters = () => {
    setFilters(draft)
    setSheetOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-canvas px-3 py-2.5">
        <IconButton label={t('common.back')} onClick={() => navigate('/setup')}>
          <ArrowLeft aria-hidden className="h-5 w-5" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{t('drivers.title')}</h1>
          <p className="truncate text-xs text-muted">{t('drivers.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openFilters}
          className="relative inline-flex min-h-touch items-center gap-1.5 rounded-2xl border border-line bg-surface px-3 text-sm font-semibold"
        >
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          {t('drivers.filters')}
          {activeCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-onaccent">
              {activeCount}
            </span>
          ) : null}
        </button>
      </header>

      <main className="flex-1 px-4 pb-8 pt-4">
        <Banner tone="warning" title={t('drivers.sampleNotice')} className="mb-4" />

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label={t('common.loading')}>
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="rounded-3xl border border-line bg-surface p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title={t('drivers.errorTitle')}
            body={t('drivers.errorBody')}
            action={
              <Button
                fullWidth
                icon={<RefreshCw aria-hidden className="h-4 w-4" />}
                onClick={() => setReloadKey((key) => key + 1)}
              >
                {t('common.retry')}
              </Button>
            }
          />
        ) : drivers.length === 0 ? (
          <EmptyState
            icon={<Users aria-hidden className="h-8 w-8" />}
            title={t('drivers.emptyTitle')}
            body={t('drivers.emptyBody')}
            action={
              <Button
                fullWidth
                variant="secondary"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS)
                  setDraft(DEFAULT_FILTERS)
                }}
              >
                {t('drivers.clear')}
              </Button>
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('drivers.resultCount', { count: drivers.length })}
            </p>
            <div className="space-y-3">
              {drivers.map((driver) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  onOpen={() => navigate(`/drivers/${driver.id}`)}
                />
              ))}
            </div>
            <p className="mt-6 text-center text-[11px] text-muted">
              <CarFront aria-hidden className="mr-1 inline h-3.5 w-3.5" />
              {t('common.sampleTag')}
            </p>
          </>
        )}
      </main>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('drivers.filtersTitle')}
        footer={
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setDraft(DEFAULT_FILTERS)}
            >
              {t('drivers.clear')}
            </Button>
            <Button size="lg" className="flex-1" onClick={applyFilters}>
              {t('drivers.apply')}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pb-2">
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {t('drivers.language')}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip
                selected={draft.language === 'all'}
                onClick={() => setDraft({ ...draft, language: 'all' })}
              >
                {t('drivers.anyLanguage')}
              </Chip>
              {LANGUAGES.map((language) => (
                <Chip
                  key={language.code}
                  selected={draft.language === language.code}
                  onClick={() => setDraft({ ...draft, language: language.code as LangCode })}
                >
                  {language.nativeName}
                </Chip>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {t('drivers.vehicle')}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip
                selected={draft.vehicle === 'all'}
                onClick={() => setDraft({ ...draft, vehicle: 'all' })}
              >
                {t('drivers.anyVehicle')}
              </Chip>
              {(['sedan', 'suv', 'hatchback'] as VehicleType[]).map((vehicle) => (
                <Chip
                  key={vehicle}
                  selected={draft.vehicle === vehicle}
                  onClick={() => setDraft({ ...draft, vehicle })}
                >
                  {t(`drivers.${vehicle}`)}
                </Chip>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {t('drivers.sort')}
            </h3>
            <div className="mt-2 grid gap-2">
              {[
                { key: 'recommended', label: t('drivers.sortRecommended') },
                { key: 'price', label: t('drivers.sortPrice') },
                { key: 'rating', label: t('drivers.sortRating') },
              ].map((option) => (
                <Chip
                  key={option.key}
                  selected={draft.sort === option.key}
                  className="justify-start"
                  onClick={() => setDraft({ ...draft, sort: option.key as DriverFilters['sort'] })}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>

          {draft.language && draft.language !== 'all' ? (
            <p className="text-xs text-muted">
              {LANGUAGE_MAP[draft.language].nativeName} · {t('drivers.language')}
            </p>
          ) : null}
        </div>
      </BottomSheet>
    </div>
  )
}

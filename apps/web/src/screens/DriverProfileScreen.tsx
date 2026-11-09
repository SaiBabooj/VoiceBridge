import { ArrowLeft, BadgeCheck, CarFront, IndianRupee, RefreshCw, Star, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar'
import { Banner } from '../components/ui/Banner'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { Skeleton } from '../components/ui/Skeleton'
import { StatusPill } from '../components/ui/StatusPill'
import { useToast } from '../components/ui/Toast'
import { api } from '../lib/api'
import { LANGUAGE_MAP } from '../lib/languages'
import { speak } from '../lib/speech'
import { formatINR } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import type { Driver } from '../types'

export default function DriverProfileScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { driverId = '' } = useParams()
  const language = useAppStore((state) => state.language)
  const { showToast } = useToast()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [requestError, setRequestError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api
      .getDriver(driverId)
      .then((result) => {
        if (active) setDriver(result)
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [driverId, reloadKey])

  const request = async () => {
    if (!driver || requesting) return
    setRequesting(true)
    setRequestError(false)
    try {
      const room = await api.createRoom(driver.id, language)
      navigate(`/chat/${room.id}`)
    } catch {
      setRequestError(true)
      setRequesting(false)
    }
  }

  const playIntro = async () => {
    if (!driver) return
    const ok = await speak(driver.intro[driver.primaryLanguage], driver.primaryLanguage)
    if (!ok) showToast(t('profile.introUnavailable'), 'error')
  }

  return (
    <div className="app-shell">
      <header className="flex items-center gap-2 px-3 pb-2 pt-4">
        <IconButton label={t('common.back')} onClick={() => navigate('/drivers')}>
          <ArrowLeft aria-hidden className="h-5 w-5" />
        </IconButton>
        <h1 className="flex-1 truncate text-base font-semibold">
          {driver ? driver.name : t('drivers.title')}
        </h1>
        <StatusPill tone="warning" label={t('common.sample')} />
      </header>

      <main className="flex-1 px-5 pb-6 pt-2">
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label={t('common.loading')}>
            <div className="flex flex-col items-center py-6">
              <Skeleton className="h-32 w-32 rounded-full" />
              <Skeleton className="mt-4 h-6 w-40" />
              <Skeleton className="mt-2 h-4 w-28" />
            </div>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error === 'DRIVER_NOT_FOUND' ? (
          <div className="flex flex-col items-center py-16 text-center">
            <h2 className="heading-lg">{t('profile.notFound')}</h2>
            <p className="mt-2 text-sm text-muted">{t('profile.notFoundBody')}</p>
            <Button className="mt-5" onClick={() => navigate('/drivers')}>
              {t('profile.backToDrivers')}
            </Button>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <h2 className="heading-lg">{t('profile.errorTitle')}</h2>
            <p className="mt-2 text-sm text-muted">{t('profile.errorBody')}</p>
            <Button
              className="mt-5"
              icon={<RefreshCw aria-hidden className="h-4 w-4" />}
              onClick={() => setReloadKey((key) => key + 1)}
            >
              {t('common.retry')}
            </Button>
          </div>
        ) : driver ? (
          <>
            <div className="flex flex-col items-center pt-4 text-center">
              <Avatar name={driver.name} variant={driver.avatarVariant} size="xl" />
              <div className="mt-4 flex items-center justify-center gap-2">
                <h2 className="text-2xl font-semibold">{driver.name}</h2>
                {driver.verified ? (
                  <BadgeCheck
                    aria-label={t('drivers.verified')}
                    className="h-5 w-5 text-brand"
                  />
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                <span className="flex items-center gap-1">
                  <Star aria-hidden className="h-4 w-4 fill-accent text-accent" />
                  <strong className="text-ink">{driver.rating.toFixed(1)}</strong>
                </span>
                <span aria-hidden>·</span>
                <span>{t('drivers.trips', { count: driver.trips })}</span>
              </div>
              <p className="mt-2 text-sm font-medium">
                {driver.car} · {driver.languages.map((code) => LANGUAGE_MAP[code].nativeName).join(' · ')}
              </p>
            </div>

            <section className="mt-5 rounded-3xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {t('profile.about')}
                </h3>
                <span className="text-[11px] font-semibold text-brand-strong">
                  {LANGUAGE_MAP[driver.primaryLanguage].nativeName}
                </span>
              </div>
              <p
                lang={driver.primaryLanguage}
                className="mt-2 text-[16px] leading-relaxed"
              >
                {driver.intro[driver.primaryLanguage]}
              </p>
              {driver.primaryLanguage !== language ? (
                <p lang={language} className="mt-2 border-t border-line pt-2 text-xs leading-relaxed text-muted">
                  {driver.intro[language]}
                </p>
              ) : null}
              <Button
                variant="soft"
                className="mt-3"
                icon={<Volume2 aria-hidden className="h-4 w-4" />}
                onClick={playIntro}
              >
                {t('profile.playIntro')}
              </Button>
            </section>

            <section className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line bg-surface p-3.5">
                <CarFront aria-hidden className="h-5 w-5 text-brand" />
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted">{t('profile.car')}</p>
                <p className="mt-0.5 text-sm font-semibold">{driver.car}</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-3.5">
                <IndianRupee aria-hidden className="h-5 w-5 text-brand" />
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted">
                  {t('profile.price')}
                </p>
                <p className="num mt-0.5 text-sm font-semibold">
                  {formatINR(driver.priceMin)}–{formatINR(driver.priceMax)}
                </p>
              </div>
            </section>

            <section className="mt-3 rounded-3xl border border-line bg-surface p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {t('profile.inclusions')}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['fuel', 'driver', 'parking'] as const).map((item) => (
                  <Chip key={item} className="pointer-events-none min-h-[36px] px-3 py-1 text-xs">
                    {t(`profile.${item}`)}
                  </Chip>
                ))}
                <Chip className="pointer-events-none min-h-[36px] px-3 py-1 text-xs">
                  {t('profile.waiting')}: {formatINR(driver.waitingCharge)}/h
                </Chip>
              </div>
            </section>

            <Banner tone="info" className="mt-4">
              {t('profile.sampleNote')}
            </Banner>

            {requestError ? (
              <Banner tone="danger" className="mt-3" role="alert">
                {t('drivers.errorBody')}
              </Banner>
            ) : null}
          </>
        ) : null}
      </main>

      {driver && !loading ? (
        <div className="safe-bottom sticky bottom-0 border-t border-line bg-canvas px-5 pt-3">
          <Button fullWidth size="xl" loading={requesting} onClick={() => void request()}>
            {requesting ? t('profile.requesting') : t('profile.request')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

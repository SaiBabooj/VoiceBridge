import {
  BadgeCheck,
  CalendarClock,
  CarFront,
  Check,
  IndianRupee,
  MapPin,
  Mic,
  Play,
  Route,
  Star,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { RoleSwitchButton } from '../components/RoleSwitchButton'
import { Avatar } from '../components/ui/Avatar'
import { Banner } from '../components/ui/Banner'
import { Button } from '../components/ui/Button'
import { StatusPill } from '../components/ui/StatusPill'
import { useToast } from '../components/ui/Toast'
import { api } from '../lib/api'
import { LANGUAGES, LANGUAGE_MAP } from '../lib/languages'
import { INCOMING_REQUEST, findDriver } from '../lib/mockData'
import { enterTravellerMode } from '../lib/role'
import { speak } from '../lib/speech'
import { cn, formatINR } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import type { LangCode } from '../types'

const DRIVER_ID = 'drv-ravi'
const AVAILABLE_KEY = 'vb-driver-available'
const DRIVER_LANG_KEY = 'vb-driver-lang'

function readAvailable(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(AVAILABLE_KEY) !== 'false'
}

export default function DriverHomeScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = useAppStore((state) => state.language)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const { showToast } = useToast()
  const driver = findDriver(DRIVER_ID)

  const [available, setAvailable] = useState(readAvailable)
  const [requestVisible, setRequestVisible] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    if (!localStorage.getItem(DRIVER_LANG_KEY) && language !== 'ta') setLanguage('ta')
  }, [language, setLanguage])

  const toggleAvailable = (next: boolean) => {
    setAvailable(next)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AVAILABLE_KEY, String(next))
    }
  }

  const chooseLanguage = (code: LangCode) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DRIVER_LANG_KEY, code)
    }
    setLanguage(code)
  }

  const playSummary = async () => {
    const summary = t('driver.home.summarySpeech', {
      pickup: INCOMING_REQUEST.pickup[language],
      stops: INCOMING_REQUEST.stops.map((stop) => stop[language]).join(', '),
      hours: INCOMING_REQUEST.hours,
      km: INCOMING_REQUEST.distanceKm,
      count: INCOMING_REQUEST.groupSize,
      price: formatINR(INCOMING_REQUEST.offeredPrice),
    })
    const ok = await speak(summary, language)
    if (!ok) showToast(t('chat.ttsUnavailable'), 'error')
  }

  const accept = async () => {
    if (accepting) return
    setAccepting(true)
    setError(false)
    try {
      const room = await api.acceptRequest(DRIVER_ID, INCOMING_REQUEST.travellerLanguage)
      showToast(t('driver.home.requestAccepted'), 'success')
      navigate(`/driver/chat/${room.id}`)
    } catch {
      setError(true)
      setAccepting(false)
    }
  }

  const decline = () => {
    setRequestVisible(false)
    showToast(t('driver.home.requestDeclined'), 'info')
  }

  const name = driver?.name ?? t('role.driver')
  const travellerLanguage = LANGUAGE_MAP[INCOMING_REQUEST.travellerLanguage].nativeName

  return (
    <div className="app-shell">
      <header className="flex items-center gap-3 px-5 pb-2 pt-5">
        <Avatar name={name} variant={driver?.avatarVariant ?? 0} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold">{name}</p>
            {driver?.verified ? (
              <BadgeCheck aria-label={t('drivers.verified')} className="h-4 w-4 shrink-0 text-brand" />
            ) : null}
          </div>
          <p className="truncate text-[11px] font-medium text-muted">
            {t('driver.home.greeting')}
          </p>
        </div>
        <RoleSwitchButton
          destination="traveller"
          onClick={() => {
            enterTravellerMode()
            navigate('/')
          }}
        />
      </header>

      <div className="px-5 pb-2 pt-1">
        <Banner tone="warning" className="text-[12px]">
          {t('driver.home.sampleNotice')}
        </Banner>
      </div>

      <main className="flex-1 space-y-3 px-5 pb-8 pt-2">
        <section className="rounded-3xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-[19px] font-semibold leading-tight">
                {t('driver.home.today')}
              </h1>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {available ? t('driver.home.availableHint') : t('driver.home.busyHint')}
              </p>
            </div>
            <StatusPill
              tone={available ? 'success' : 'warning'}
              label={available ? t('driver.home.available') : t('driver.home.busy')}
            />
          </div>

          <div
            role="group"
            aria-label={t('driver.home.availability')}
            className="mt-3 flex rounded-2xl border border-line bg-surface2 p-1"
          >
            <button
              type="button"
              aria-pressed={available}
              onClick={() => toggleAvailable(true)}
              className={cn(
                'min-h-touch flex-1 rounded-xl text-sm font-semibold transition',
                available ? 'bg-success text-white shadow-soft' : 'text-muted',
              )}
            >
              {t('driver.home.available')}
            </button>
            <button
              type="button"
              aria-pressed={!available}
              onClick={() => toggleAvailable(false)}
              className={cn(
                'min-h-touch flex-1 rounded-xl text-sm font-semibold transition',
                !available ? 'bg-accent text-onaccent shadow-soft' : 'text-muted',
              )}
            >
              {t('driver.home.busy')}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1.5" role="group" aria-label={t('common.language')}>
            {LANGUAGES.map((option) => (
              <button
                key={option.code}
                type="button"
                lang={option.code}
                aria-pressed={language === option.code}
                onClick={() => chooseLanguage(option.code)}
                className={cn(
                  'min-h-touch flex-1 rounded-xl border px-2 text-[13px] font-semibold transition',
                  language === option.code
                    ? 'border-brand bg-brand-soft text-brand-strong'
                    : 'border-line bg-surface text-muted',
                )}
              >
                {option.nativeName}
              </button>
            ))}
          </div>
        </section>

        {available && requestVisible ? (
          <section className="animate-rise overflow-hidden rounded-3xl border-2 border-accent bg-surface">
            <div className="flex items-center justify-between gap-2 bg-accent-soft px-4 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink">
                {t('driver.home.incoming')}
              </p>
              <StatusPill tone="warning" label={t('common.sample')} />
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={INCOMING_REQUEST.travellerName} variant={2} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-semibold">
                    {INCOMING_REQUEST.travellerName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {t('driver.home.travellerSpeaks', { language: travellerLanguage })}
                  </p>
                </div>
                <span className="num rounded-full bg-surface2 px-2.5 py-1 text-[11px] font-semibold">
                  {t('driver.home.groupCount', { count: INCOMING_REQUEST.groupSize })}
                </span>
              </div>

              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted">
                      {t('driver.home.pickup')}
                    </dt>
                    <dd className="font-medium" lang={language}>
                      {INCOMING_REQUEST.pickup[language]}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Route aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted">
                      {t('driver.home.stops')}
                    </dt>
                    <dd className="font-medium" lang={language}>
                      {INCOMING_REQUEST.stops.map((stop) => stop[language]).join(' → ')}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <CalendarClock aria-hidden className="h-4 w-4 shrink-0 text-brand" />
                  <dd className="text-muted">
                    {t('driver.home.tripFacts', {
                      hours: INCOMING_REQUEST.hours,
                      km: INCOMING_REQUEST.distanceKm,
                    })}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex items-end justify-between rounded-2xl bg-surface2 px-3.5 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {t('driver.home.quote')}
                  </p>
                  <p className="num mt-0.5 text-2xl font-semibold">
                    {formatINR(INCOMING_REQUEST.offeredPrice)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {t('driver.home.quoteNote', {
                      amount: formatINR(driver?.waitingCharge ?? 200),
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void playSummary()}
                  className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold"
                >
                  <Play aria-hidden className="h-4 w-4 fill-current text-brand" />
                  {t('driver.home.playSummary')}
                </button>
              </div>

              <div className="mt-3 grid gap-2.5">
                <Button
                  size="xl"
                  variant="success"
                  fullWidth
                  loading={accepting}
                  icon={!accepting ? <Check aria-hidden className="h-5 w-5" /> : undefined}
                  onClick={() => void accept()}
                >
                  {accepting ? t('driver.home.accepting') : t('driver.home.accept')}
                </Button>
                <Button size="lg" variant="secondary" fullWidth onClick={decline}>
                  {t('driver.home.decline')}
                </Button>
              </div>

              {error ? (
                <Banner tone="danger" className="mt-3" role="alert">
                  {t('driver.home.error')}
                </Banner>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-line bg-surface p-5 text-center">
            <CarFront aria-hidden className="mx-auto h-8 w-8 text-muted" />
            <h2 className="mt-2 text-base font-semibold">
              {available ? t('driver.home.noRequestsTitle') : t('driver.home.busyTitle')}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {available ? t('driver.home.noRequestsBody') : t('driver.home.busyBody')}
            </p>
            {available && !requestVisible ? (
              <Button variant="soft" className="mt-3" onClick={() => setRequestVisible(true)}>
                {t('driver.home.showAgain')}
              </Button>
            ) : null}
          </section>
        )}

        <section className="rounded-3xl border border-line bg-surface p-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {t('driver.home.today')}
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-surface2 p-3">
              <IndianRupee aria-hidden className="h-4 w-4 text-brand" />
              <p className="num mt-1.5 text-lg font-semibold">{formatINR(2450)}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                {t('driver.home.earnings')}
              </p>
            </div>
            <div className="rounded-2xl bg-surface2 p-3">
              <Users aria-hidden className="h-4 w-4 text-brand" />
              <p className="num mt-1.5 text-lg font-semibold">4</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                {t('driver.home.trips')}
              </p>
            </div>
            <div className="rounded-2xl bg-surface2 p-3">
              <Star aria-hidden className="h-4 w-4 fill-accent text-accent" />
              <p className="num mt-1.5 text-lg font-semibold">
                {driver?.rating.toFixed(1) ?? '4.9'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                {t('driver.home.rating')}
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate('/driver/tips')}
          className="flex w-full items-center gap-3 rounded-3xl border border-line bg-surface p-4 text-left transition active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
            <Mic aria-hidden className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{t('driver.home.tips')}</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-muted">
              {t('driver.home.tipsBody')}
            </span>
          </span>
          <span aria-hidden className="text-muted">
            →
          </span>
        </button>
      </main>
    </div>
  )
}

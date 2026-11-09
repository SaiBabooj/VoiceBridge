import { ArrowLeft, Check, Lock, RefreshCw, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
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
import { formatINR } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import type { Driver, LangCode, Plan, Room } from '../types'

function uiLang(language: string): LangCode {
  return language === 'hi' || language === 'ta' ? language : 'en'
}

export default function AgreementScreen() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { roomId = '' } = useParams()
  const setLanguage = useAppStore((state) => state.setLanguage)
  const { showToast } = useToast()

  const [room, setRoom] = useState<Room | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [locking, setLocking] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    Promise.all([api.getRoom(roomId), api.getPlan(roomId)])
      .then(([roomResult, planResult]) => {
        if (!active) return
        setRoom(roomResult)
        setPlan(planResult)
        api
          .getDriver(roomResult.driverId)
          .then((driverResult) => {
            if (active) setDriver(driverResult)
          })
          .catch(() => undefined)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [roomId])

  const lang = uiLang(i18n.language)
  const eligible = Boolean(plan && plan.confirmedBy.length >= 2 && !plan.needsConfirmation)

  const lock = async () => {
    if (!plan || locking) return
    setLocking(true)
    try {
      const updated = await api.lockPlan(roomId)
      setPlan(updated)
      showToast(t('agreement.lockSuccess'), 'success')
    } catch {
      showToast(t('chat.sendFailed'), 'error')
    } finally {
      setLocking(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-canvas px-3 py-2.5">
        <IconButton label={t('agreement.backToChat')} onClick={() => navigate(`/chat/${roomId}`)}>
          <ArrowLeft aria-hidden className="h-5 w-5" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{t('agreement.title')}</h1>
          <p className="truncate text-xs text-muted">{t('agreement.subtitle')}</p>
        </div>
        <StatusPill tone="warning" label={t('common.sample')} />
      </header>

      <main className="flex-1 px-5 pb-6 pt-4">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label={t('common.loading')}>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error || !room || !plan ? (
          <ErrorState
            title={t('agreement.errorTitle')}
            body={t('agreement.errorBody')}
            action={
              <Button fullWidth onClick={() => navigate(`/chat/${roomId}`)}>
                {t('agreement.backToChat')}
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Avatar
                name={driver?.name ?? t('chat.title')}
                variant={driver?.avatarVariant ?? 0}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold">{driver?.name ?? '—'}</p>
                <p className="truncate text-xs text-muted">
                  {LANGUAGE_MAP[room.travellerLang].nativeName} ↔{' '}
                  {LANGUAGE_MAP[room.driverLang].nativeName}
                </p>
              </div>
              {plan.locked ? (
                <StatusPill tone="success" label={t('agreement.lockedTitle')} />
              ) : null}
            </div>

            <div className="mt-4">
              {plan.locked ? (
                <Banner tone="success" title={t('agreement.lockedTitle')}>
                  {t('agreement.lockedBody')}
                </Banner>
              ) : (
                <Banner tone="warning" title={t('agreement.unlockedTitle')}>
                  {t('agreement.unlockedBody')}
                </Banner>
              )}
            </div>

            <section className="mt-4 rounded-3xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {t('agreement.readIn')}
                </h2>
                <span className="text-[11px] font-semibold text-brand-strong">
                  {LANGUAGE_MAP[room.travellerLang].nativeName} /{' '}
                  {LANGUAGE_MAP[room.driverLang].nativeName}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                {([room.travellerLang, room.driverLang] as LangCode[]).map((code) => (
                  <Chip
                    key={code}
                    selected={i18n.language === code}
                    onClick={() => setLanguage(code)}
                    lang={code}
                  >
                    {LANGUAGE_MAP[code].nativeName}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="mt-3 rounded-3xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {t('agreement.priceTable')}
                </h2>
                <span className="num text-sm font-semibold">{formatINR(plan.commitment.price)}</span>
              </div>
              <dl className="mt-2 divide-y divide-line text-sm">
                <div className="flex items-center justify-between py-2">
                  <dt className="text-muted">{t('agreement.price')}</dt>
                  <dd className="num font-semibold">{formatINR(plan.commitment.price)}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-muted">{t('agreement.hours')}</dt>
                  <dd className="num font-semibold">{plan.commitment.hours}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-muted">{t('agreement.waiting')}</dt>
                  <dd className="num font-semibold">{formatINR(plan.commitment.waitingCharge)}</dd>
                </div>
              </dl>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {plan.commitment.inclusions.map((inclusion) => (
                  <Chip
                    key={inclusion}
                    className="pointer-events-none min-h-[36px] px-3 py-1 text-xs"
                  >
                    <Check aria-hidden className="h-3.5 w-3.5 text-brand" />
                    {t(`profile.${inclusion}`)}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="mt-3 rounded-3xl border border-line bg-surface p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {t('agreement.planTable')}
              </h2>
              <ul className="mt-2 space-y-2">
                {plan.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface2 px-3 py-2.5"
                  >
                    <span className="num w-12 shrink-0 text-[13px] font-semibold text-muted">
                      {item.time}
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] font-medium" lang={lang}>
                      {item.title[lang]}
                    </span>
                    <Check aria-label={t('chat.confirmed')} className="h-4 w-4 text-success" />
                  </li>
                ))}
              </ul>
            </section>

            <Banner tone="info" className="mt-4">
              {t('agreement.demoNotice')}
            </Banner>
          </>
        )}
      </main>

      {!loading && !error && plan ? (
        <div className="safe-bottom sticky bottom-0 space-y-2 border-t border-line bg-canvas px-5 pt-3">
          {plan.locked ? (
            <>
              <Button
                fullWidth
                size="lg"
                icon={<Star aria-hidden className="h-5 w-5" />}
                onClick={() => navigate(`/rating/${roomId}`)}
              >
                {t('agreement.rateDriver')}
              </Button>
              <Button fullWidth variant="ghost" onClick={() => navigate('/drivers')}>
                {t('agreement.done')}
              </Button>
            </>
          ) : eligible ? (
            <Button
              fullWidth
              size="lg"
              loading={locking}
              icon={<Lock aria-hidden className="h-5 w-5" />}
              onClick={() => void lock()}
            >
              {t('agreement.lockNow')}
            </Button>
          ) : (
            <Button
              fullWidth
              size="lg"
              variant="secondary"
              icon={<RefreshCw aria-hidden className="h-4 w-4" />}
              onClick={() => navigate(`/chat/${roomId}`)}
            >
              {t('agreement.backToChat')}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}

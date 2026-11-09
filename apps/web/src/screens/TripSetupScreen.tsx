import {
  ArrowLeft,
  Building2,
  Check,
  Clock,
  Landmark,
  Leaf,
  ShoppingBag,
  Sparkles,
  Store,
  User,
  Users,
  UsersRound,
  Utensils,
  Waves,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { useAppStore } from '../store/appStore'
import type { DurationKey, GroupKey, InterestKey, TripPrefs } from '../types'

const INTERESTS: Array<{ key: InterestKey; icon: typeof Landmark }> = [
  { key: 'temples', icon: Landmark },
  { key: 'beach', icon: Waves },
  { key: 'food', icon: Utensils },
  { key: 'culture', icon: Sparkles },
  { key: 'markets', icon: Store },
  { key: 'shopping', icon: ShoppingBag },
  { key: 'heritage', icon: Building2 },
  { key: 'nature', icon: Leaf },
]

const GROUPS: Array<{ key: GroupKey; icon: typeof User }> = [
  { key: 'solo', icon: User },
  { key: 'couple', icon: Users },
  { key: 'family', icon: UsersRound },
  { key: 'friends', icon: Users },
]

const DURATIONS: Array<{ key: DurationKey; icon: typeof Clock }> = [
  { key: 'half', icon: Clock },
  { key: 'full', icon: Clock },
  { key: 'evening', icon: Clock },
]

export default function TripSetupScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const trip = useAppStore((state) => state.trip)
  const setTrip = useAppStore((state) => state.setTrip)
  const [step, setStep] = useState(0)

  const update = (patch: Partial<TripPrefs>) => {
    setTrip({ ...trip, ...patch })
    setStep((current) => Math.min(current + 1, 2))
  }

  const canContinue =
    step === 0 ? trip.interests.length > 0 : step === 1 ? trip.group !== null : trip.duration !== null

  const back = () => {
    if (step === 0) navigate('/')
    else setStep((current) => current - 1)
  }

  const next = () => {
    if (step < 2) setStep(step + 1)
    else navigate('/drivers')
  }

  return (
    <div className="app-shell">
      <header className="flex items-center gap-2 px-3 pb-2 pt-4">
        <IconButton label={t('common.back')} onClick={back}>
          <ArrowLeft aria-hidden className="h-5 w-5" />
        </IconButton>
        <div className="flex-1">
          <h1 className="text-base font-semibold">{t('setup.title')}</h1>
          <p className="text-xs text-muted">{t('setup.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/drivers')}
          className="min-h-touch rounded-xl px-2 text-sm font-medium text-muted hover:text-ink"
        >
          {t('common.skip')}
        </button>
      </header>

      <div className="px-5">
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-brand' : 'bg-line'}`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-muted">
          {t('setup.step', { current: step + 1, total: 3 })}
        </p>
      </div>

      <main key={step} className="flex flex-1 animate-rise flex-col px-5 pb-6 pt-5">
        {step === 0 ? (
          <>
            <h2 className="heading-lg">{t('setup.interestsTitle')}</h2>
            <p className="mt-1 text-sm text-muted">{t('setup.interestsHint')}</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {INTERESTS.map(({ key, icon: Icon }) => {
                const selected = trip.interests.includes(key)
                return (
                  <Chip
                    key={key}
                    selected={selected}
                    className="min-h-[60px] justify-start px-4"
                    onClick={() => {
                      const interests = selected
                        ? trip.interests.filter((interest) => interest !== key)
                        : [...trip.interests, key]
                      setTrip({ ...trip, interests })
                    }}
                    icon={
                      <Icon
                        aria-hidden
                        className={`h-5 w-5 ${selected ? 'text-brand-strong' : 'text-muted'}`}
                      />
                    }
                  >
                    {t(`setup.interests.${key}`)}
                  </Chip>
                )
              })}
            </div>
            <p className="mt-4 text-xs font-medium text-muted">
              {t('setup.selected', { count: trip.interests.length })}
            </p>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="heading-lg">{t('setup.groupTitle')}</h2>
            <p className="mt-1 text-sm text-muted">{t('setup.groupHint')}</p>
            <div className="mt-5 grid gap-2.5">
              {GROUPS.map(({ key, icon: Icon }) => {
                const selected = trip.group === key
                return (
                  <Chip
                    key={key}
                    selected={selected}
                    className="min-h-[64px] justify-start px-4 text-base"
                    onClick={() => update({ group: key })}
                    icon={
                      <Icon
                        aria-hidden
                        className={`h-5 w-5 ${selected ? 'text-brand-strong' : 'text-muted'}`}
                      />
                    }
                  >
                    {t(`setup.groups.${key}`)}
                  </Chip>
                )
              })}
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="heading-lg">{t('setup.durationTitle')}</h2>
            <p className="mt-1 text-sm text-muted">{t('setup.durationHint')}</p>
            <div className="mt-5 grid gap-2.5">
              {DURATIONS.map(({ key }) => {
                const selected = trip.duration === key
                return (
                  <Chip
                    key={key}
                    selected={selected}
                    className="min-h-[64px] justify-between px-4 text-base"
                    onClick={() => update({ duration: key })}
                  >
                    {t(`setup.durations.${key}`)}
                    {selected ? <Check aria-hidden className="h-5 w-5" /> : null}
                  </Chip>
                )
              })}
            </div>
          </>
        ) : null}
      </main>

      <div className="safe-bottom sticky bottom-0 border-t border-line bg-canvas px-5 pt-3">
        <Button fullWidth size="lg" disabled={!canContinue} onClick={next}>
          {step === 2 ? t('setup.findDrivers') : t('common.continue')}
        </Button>
      </div>
    </div>
  )
}

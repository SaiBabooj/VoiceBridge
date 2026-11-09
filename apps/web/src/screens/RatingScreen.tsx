import { ArrowLeft, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { Avatar } from '../components/ui/Avatar'
import { Banner } from '../components/ui/Banner'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { useToast } from '../components/ui/Toast'
import { api } from '../lib/api'
import type { Driver, RatingTag } from '../types'

const TAGS: RatingTag[] = ['safe', 'friendly', 'onTime', 'clean', 'knowledge']

export default function RatingScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { roomId = '' } = useParams()
  const { showToast } = useToast()

  const [driver, setDriver] = useState<Driver | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [stars, setStars] = useState(0)
  const [tags, setTags] = useState<RatingTag[]>([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  useEffect(() => {
    let active = true
    api
      .getRoom(roomId)
      .then((room) => api.getDriver(room.driverId))
      .then((result) => {
        if (active) setDriver(result)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [roomId])

  const toggleTag = (tag: RatingTag) => {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    )
  }

  const submit = async () => {
    if (stars < 1 || submitting) return
    setSubmitting(true)
    setSubmitError(false)
    try {
      await api.submitRating({ roomId, stars, tags, comment })
      showToast(t('rating.thanksTitle'), 'success')
      window.setTimeout(() => navigate('/drivers'), 500)
    } catch {
      setSubmitError(true)
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="flex items-center gap-2 px-3 pb-2 pt-4">
        <IconButton
          label={t('common.back')}
          onClick={() => navigate(`/agreement/${roomId}`)}
        >
          <ArrowLeft aria-hidden className="h-5 w-5" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold">{t('rating.title')}</h1>
          <p className="truncate text-xs text-muted">{t('rating.subtitle')}</p>
        </div>
      </header>

      <main className="flex-1 px-5 pb-6 pt-3">
        {loadError ? (
          <ErrorState
            title={t('profile.errorTitle')}
            body={t('profile.errorBody')}
            action={
              <Button fullWidth onClick={() => navigate('/drivers')}>
                {t('profile.backToDrivers')}
              </Button>
            }
          />
        ) : (
          <>
            {driver ? (
              <div className="flex flex-col items-center text-center">
                <Avatar name={driver.name} variant={driver.avatarVariant} size="lg" />
                <p className="mt-3 text-lg font-semibold">{driver.name}</p>
                <p className="text-xs text-muted">{driver.car}</p>
              </div>
            ) : null}

            <section className="mt-6 rounded-3xl border border-line bg-surface p-4">
              <h2 className="text-center text-sm font-semibold">{t('rating.starsLabel')}</h2>
              <div
                className="mt-2 flex justify-center gap-1"
                role="group"
                aria-label={t('rating.starsLabel')}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <IconButton
                    key={value}
                    label={`${value} / 5 — ${t('rating.starsLabel')}`}
                    variant="plain"
                    size="lg"
                    aria-pressed={stars >= value}
                    onClick={() => setStars(value)}
                  >
                    <Star
                      aria-hidden
                      className={
                        stars >= value
                          ? 'h-8 w-8 fill-accent text-accent'
                          : 'h-8 w-8 text-line'
                      }
                    />
                  </IconButton>
                ))}
              </div>
              <p className="mt-1 text-center text-xs font-medium text-muted">
                {stars > 0 ? `${stars} / 5` : '—'}
              </p>
            </section>

            <section className="mt-4">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {t('rating.tagsTitle')}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <Chip key={tag} selected={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                    {t(`rating.tags.${tag}`)}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="mt-4">
              <label
                htmlFor="rating-comment"
                className="text-[11px] font-bold uppercase tracking-wider text-muted"
              >
                {t('rating.commentTitle')}
              </label>
              <textarea
                id="rating-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t('rating.commentPlaceholder')}
                rows={3}
                className="mt-2 w-full resize-none rounded-2xl border border-line bg-surface p-3.5 text-[15px] outline-none placeholder:text-muted focus:border-brand"
              />
            </section>

            {submitError ? (
              <Banner tone="danger" role="alert" className="mt-3">
                {t('rating.error')}
              </Banner>
            ) : null}

            <Banner tone="info" className="mt-3">
              {t('rating.sampleNote')}
            </Banner>
          </>
        )}
      </main>

      {!loadError ? (
        <div className="safe-bottom sticky bottom-0 space-y-2 border-t border-line bg-canvas px-5 pt-3">
          <Button
            fullWidth
            size="lg"
            disabled={stars < 1}
            loading={submitting}
            onClick={() => void submit()}
          >
            {submitting ? t('rating.submitting') : t('rating.submit')}
          </Button>
          <Button fullWidth variant="ghost" onClick={() => navigate('/drivers')}>
            {t('rating.skip')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

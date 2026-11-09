import { ArrowLeft, Check, Mic, RotateCcw, Sparkles, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Banner } from '../components/ui/Banner'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { StatusPill } from '../components/ui/StatusPill'
import { useToast } from '../components/ui/Toast'
import { TIP_DRAFT } from '../lib/mockData'
import { speak } from '../lib/speech'
import { cn, formatINR, newId } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import type { StructuredTip } from '../types'

const TIPS_KEY = 'vb-driver-tips'
const ALL_TAGS = ['polite', 'clean', 'onTime'] as const

type Phase = 'idle' | 'recording' | 'processing' | 'review' | 'saved'

function readTips(): StructuredTip[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(TIPS_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as StructuredTip[]) : []
  } catch {
    return []
  }
}

function writeTips(tips: StructuredTip[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(TIPS_KEY, JSON.stringify(tips))
}

function formatDate(at: number, language: string): string {
  const locale = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN'
  return new Date(at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export default function DriverTipsScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = useAppStore((state) => state.language)
  const { showToast } = useToast()

  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [amount, setAmount] = useState(String(TIP_DRAFT.amount))
  const [note, setNote] = useState<string>(TIP_DRAFT.note[language])
  const [tags, setTags] = useState<string[]>([...TIP_DRAFT.tags])
  const [tips, setTips] = useState<StructuredTip[]>(readTips)
  const [savedTip, setSavedTip] = useState<StructuredTip | null>(null)

  const startedAt = useRef<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const startRecording = () => {
    if (phase === 'processing') return
    startedAt.current = Date.now()
    setElapsed(0)
    setPhase('recording')
  }

  const stopRecording = () => {
    const start = startedAt.current
    startedAt.current = null
    if (!start) return
    if (Date.now() - start < 500) {
      setPhase('idle')
      showToast(t('driver.tips.tooShort'), 'error')
      return
    }
    setPhase('processing')
    setAmount(String(TIP_DRAFT.amount))
    setNote(TIP_DRAFT.note[language])
    setTags([...TIP_DRAFT.tags])
    timers.current.push(
      setTimeout(() => {
        setPhase('review')
      }, 1500),
    )
  }

  const reset = () => {
    setPhase('idle')
    setSavedTip(null)
  }

  const toggleTag = (tag: string) => {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    )
  }

  const approve = () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) return
    const tip: StructuredTip = {
      id: newId('tip'),
      travellerName: TIP_DRAFT.travellerName,
      amount: value,
      note: note.trim(),
      tags,
      at: Date.now(),
      is_sample: true,
    }
    const next = [tip, ...tips].slice(0, 12)
    writeTips(next)
    setTips(next)
    setSavedTip(tip)
    setPhase('saved')
    showToast(t('driver.tips.saved'), 'success')
  }

  const playRecording = async () => {
    const ok = await speak(TIP_DRAFT.transcript[language], language)
    if (!ok) showToast(t('chat.ttsUnavailable'), 'error')
  }

  const recorded = phase === 'review' || phase === 'saved'

  return (
    <div className="app-shell">
      <header className="flex items-center gap-2.5 border-b border-line bg-canvas px-3 py-2.5">
        <IconButton label={t('driver.tips.back')} onClick={() => navigate('/driver')}>
          <ArrowLeft aria-hidden className="h-5 w-5" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">
            {t('driver.tips.title')}
          </p>
          <p className="truncate text-[11px] font-medium text-muted">{t('driver.tips.subtitle')}</p>
        </div>
        <StatusPill tone="warning" label={t('common.sample')} />
      </header>

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-4">
        <Banner tone="warning" className="text-[12px]">
          {t('driver.tips.demoNote')}
        </Banner>

        <section className="mt-4 rounded-3xl border border-line bg-surface p-5 text-center">
          {phase === 'idle' || phase === 'recording' || phase === 'processing' ? (
            <>
              <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
                {phase === 'recording' ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute h-40 w-40 animate-ring rounded-full bg-accent-soft"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute h-40 w-40 animate-ring rounded-full bg-accent-soft"
                      style={{ animationDelay: '700ms' }}
                    />
                  </>
                ) : null}
                <button
                  type="button"
                  aria-label={phase === 'recording' ? t('driver.tips.release') : t('driver.tips.record')}
                  aria-pressed={phase === 'recording'}
                  disabled={phase === 'processing'}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    startRecording()
                  }}
                  onPointerUp={(event) => {
                    event.preventDefault()
                    stopRecording()
                  }}
                  onPointerCancel={stopRecording}
                  onLostPointerCapture={stopRecording}
                  onContextMenu={(event) => event.preventDefault()}
                  className={cn(
                    'relative flex h-40 w-40 touch-none select-none flex-col items-center justify-center gap-1 rounded-full text-onaccent shadow-lift transition',
                    phase === 'recording'
                      ? 'scale-105 bg-accent'
                      : 'bg-brand text-onbrand active:scale-95',
                    phase === 'processing' && 'opacity-60',
                  )}
                >
                  {phase === 'processing' ? (
                    <Sparkles aria-hidden className="h-14 w-14 animate-pulse" />
                  ) : (
                    <Mic aria-hidden className="h-14 w-14" />
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {phase === 'recording' ? `${(elapsed / 1000).toFixed(1)}s` : ''}
                  </span>
                </button>
              </div>

              <p aria-live="polite" className="mt-4 text-lg font-semibold">
                {phase === 'recording'
                  ? t('driver.tips.recording')
                  : phase === 'processing'
                    ? t('driver.tips.processing')
                    : t('driver.tips.record')}
              </p>
              <p className="mx-auto mt-1 max-w-[280px] text-[13px] leading-relaxed text-muted">
                {phase === 'recording' ? t('driver.tips.release') : t('driver.tips.recordHint')}
              </p>

              {phase === 'recording' ? (
                <RecordingTimer onTick={setElapsed} since={startedAt.current} />
              ) : null}
            </>
          ) : null}

          {recorded ? (
            <div className="animate-rise text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-strong">
                  <Sparkles aria-hidden className="h-3.5 w-3.5" />
                  {t('driver.tips.heard')}
                </span>
                <button
                  type="button"
                  onClick={() => void playRecording()}
                  className="inline-flex min-h-touch items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-brand-strong"
                >
                  <Volume2 aria-hidden className="h-4 w-4" />
                  {t('common.play')}
                </button>
              </div>
              <p
                lang={language}
                className="mt-1.5 rounded-2xl bg-surface2 px-3.5 py-3 text-[14px] leading-relaxed"
              >
                “{TIP_DRAFT.transcript[language]}”
              </p>

              <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">
                {t('driver.tips.structured')}
              </p>

              <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-muted">{t('driver.tips.traveller')}</p>
                  <p className="mt-1 min-h-touch rounded-2xl border border-line bg-surface2 px-3.5 py-3 text-[15px] font-medium">
                    {TIP_DRAFT.travellerName}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="tip-amount"
                    className="text-[12px] font-semibold text-muted"
                  >
                    {t('driver.tips.amount')}
                  </label>
                  <div className="mt-1 flex min-h-touch items-center rounded-2xl border border-line bg-surface px-3">
                    <span aria-hidden className="mr-1 text-muted">
                      ₹
                    </span>
                    <input
                      id="tip-amount"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))}
                      className="num w-16 bg-transparent text-[15px] font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>

              <label htmlFor="tip-note" className="mt-3 block text-[12px] font-semibold text-muted">
                {t('driver.tips.note')}
              </label>
              <textarea
                id="tip-note"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t('driver.tips.notePlaceholder')}
                className="mt-1 w-full resize-none rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed outline-none focus:border-brand"
              />

              <p className="mt-3 text-[12px] font-semibold text-muted">{t('driver.tips.tagsTitle')}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {ALL_TAGS.map((tag) => (
                  <Chip
                    key={tag}
                    selected={tags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                    className="min-h-[40px] px-3 py-1.5 text-[13px]"
                  >
                    {t(`driver.tips.tags.${tag}`)}
                  </Chip>
                ))}
              </div>

              {phase === 'review' ? (
                <div className="mt-4 grid gap-2">
                  <Button
                    size="xl"
                    variant="success"
                    fullWidth
                    icon={<Check aria-hidden className="h-5 w-5" />}
                    onClick={approve}
                  >
                    {t('driver.tips.approve')}
                  </Button>
                  <Button
                    size="md"
                    variant="secondary"
                    fullWidth
                    icon={<RotateCcw aria-hidden className="h-4 w-4" />}
                    onClick={reset}
                  >
                    {t('driver.tips.retry')}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-success bg-success-soft px-3.5 py-3">
                  <p className="text-[15px] font-semibold text-ink">{t('driver.tips.saved')}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                    {savedTip
                      ? `${savedTip.travellerName} · ${formatINR(savedTip.amount)}`
                      : t('driver.tips.savedBody')}
                  </p>
                  <Button variant="soft" fullWidth className="mt-2.5" onClick={reset}>
                    {t('driver.tips.another')}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="mt-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {t('driver.tips.savedTitle')}
          </h2>
          {tips.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-line bg-surface px-4 py-5 text-center text-[13px] text-muted">
              {t('driver.tips.empty')}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {tips.map((tip) => (
                <li key={tip.id} className="rounded-2xl border border-line bg-surface p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{tip.travellerName}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {formatDate(tip.at, language)} · {t('common.sample')}
                      </p>
                    </div>
                    <span className="num shrink-0 text-[15px] font-semibold text-success">
                      +{formatINR(tip.amount)}
                    </span>
                  </div>
                  {tip.note ? (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{tip.note}</p>
                  ) : null}
                  {tip.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tip.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong"
                        >
                          {ALL_TAGS.includes(tag as (typeof ALL_TAGS)[number])
                            ? t(`driver.tips.tags.${tag}`)
                            : tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

function RecordingTimer({
  since,
  onTick,
}: {
  since: number | null
  onTick: (ms: number) => void
}) {
  useEffect(() => {
    if (!since) return
    const timer = setInterval(() => onTick(Date.now() - since), 100)
    return () => clearInterval(timer)
  }, [since, onTick])
  return null
}

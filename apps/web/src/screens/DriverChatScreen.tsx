import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  Contrast,
  Hourglass,
  Keyboard,
  Mic,
  RefreshCw,
  Send,
  Settings2,
  Type,
  Volume2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmBanner } from '../components/chat/ConfirmBanner'
import { MessageBubble } from '../components/chat/MessageBubble'
import { PlanSheet } from '../components/chat/PlanSheet'
import { TranscriptionCard } from '../components/chat/TranscriptionCard'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Avatar } from '../components/ui/Avatar'
import { Banner } from '../components/ui/Banner'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Button } from '../components/ui/Button'
import { HoldToTalkButton } from '../components/ui/HoldToTalkButton'
import { IconButton } from '../components/ui/IconButton'
import { StatusPill } from '../components/ui/StatusPill'
import { useToast } from '../components/ui/Toast'
import { api } from '../lib/api'
import { LANGUAGE_MAP } from '../lib/languages'
import { speak, stopSpeech } from '../lib/speech'
import { createTransport, type ChatTransport } from '../lib/transport'
import { cn, newId } from '../lib/utils'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { useAppStore } from '../store/appStore'
import type {
  ChatMessage,
  ChatPhase,
  ClientEvent,
  ConnectionStatus,
  LangCode,
  PendingConfirm,
  Plan,
  Room,
} from '../types'

const LARGE_TEXT_KEY = 'vb-driver-large-text'
const CONTRAST_KEY = 'vb-driver-contrast'
const DRIVING_KEY = 'vb-driver-driving'

function readFlag(key: string): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(key) === 'true'
}

function envelope(type: ClientEvent['type'], roomId: string, payload: unknown): ClientEvent {
  return { id: newId('evt'), type, roomId, ts: Date.now(), payload } as ClientEvent
}

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: ReactNode
  label: string
  hint: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-1 h-8 w-14 shrink-0 rounded-full transition',
          checked ? 'bg-brand' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition',
            checked ? 'left-7' : 'left-1',
          )}
        />
      </button>
    </div>
  )
}

export default function DriverChatScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { roomId = '' } = useParams()
  const language = useAppStore((state) => state.language)
  const online = useOnlineStatus()
  const { showToast } = useToast()

  const [room, setRoom] = useState<Room | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [phase, setPhase] = useState<ChatPhase>('idle')
  const [remotePhase, setRemotePhase] = useState<ChatPhase>('idle')
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [awaitingQuote, setAwaitingQuote] = useState<PendingConfirm | null>(null)
  const [livePartial, setLivePartial] = useState<string | null>(null)
  const [latestTranscript, setLatestTranscript] = useState<{ text: string; lang: LangCode } | null>(
    null,
  )
  const [connection, setConnection] = useState<ConnectionStatus>('connecting')
  const [typingMode, setTypingMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [planOpen, setPlanOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [locking, setLocking] = useState(false)
  const [responding, setResponding] = useState(false)
  const [largeText, setLargeText] = useState(() => readFlag(LARGE_TEXT_KEY))
  const [contrast, setContrast] = useState(() => readFlag(CONTRAST_KEY))
  const [driving, setDriving] = useState(() => readFlag(DRIVING_KEY))

  const transportRef = useRef<ChatTransport | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<number | null>(null)
  const pendingRef = useRef<PendingConfirm | null>(null)

  const travellerName = room?.travellerName ?? t('driver.chat.traveller')
  const travellerLang = room?.travellerLang ?? 'hi'
  const driverLang = room?.driverLang ?? 'ta'
  const languagePair = `${LANGUAGE_MAP[travellerLang].nativeName} ↔ ${LANGUAGE_MAP[driverLang].nativeName}`

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    api
      .getRoom(roomId)
      .then((result) => {
        if (!active) return
        setRoom(result)
        setPlan(result.plan)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [roomId])

  useEffect(() => {
    if (!room) return
    const transport = createTransport(room.id, language, 'driver')
    transportRef.current = transport

    const offEvent = transport.onEvent((event, meta) => {
      switch (event.type) {
        case 'status':
          if (meta.replay) break
          if (event.payload.side === 'driver') setPhase(event.payload.phase)
          else setRemotePhase(event.payload.phase)
          break
        case 'utterance.partial':
          if (!meta.replay && event.payload.speaker === 'traveller') {
            setLivePartial(event.payload.text)
          }
          break
        case 'utterance.final':
          if (meta.replay) break
          if (event.payload.speaker === 'traveller') {
            setLivePartial(null)
          } else {
            setLatestTranscript({ text: event.payload.text, lang: event.payload.lang })
          }
          break
        case 'translation':
          setMessages((current) => {
            if (current.some((message) => message.id === event.payload.utteranceId)) return current
            return [
              ...current,
              {
                id: event.payload.utteranceId,
                speaker: event.payload.speaker,
                originalText: event.payload.original,
                originalLang: event.payload.sourceLang,
                translationText: event.payload.text,
                translationLang: event.payload.targetLang,
                risk: event.payload.risk,
                commitment: event.payload.commitment,
                at: event.ts,
              },
            ]
          })
          setLivePartial(null)
          break
        case 'confirm.request': {
          const payload = event.payload
          pendingRef.current = payload
          if (payload.speaker === 'driver') {
            setAwaitingQuote(payload)
          } else {
            setPendingConfirm(payload)
            if (!meta.replay) {
              const text = payload.copy?.backTranslation[language] ?? payload.backTranslation
              void speak(text, language)
            }
          }
          break
        }
        case 'confirm.response': {
          const pending = pendingRef.current
          if (!pending || pending.confirmId !== event.payload.confirmId) break
          setMessages((current) =>
            current.map((message) =>
              message.id === pending.utteranceId
                ? { ...message, confirmed: event.payload.confirmed }
                : message,
            ),
          )
          pendingRef.current = null
          setPendingConfirm(null)
          setAwaitingQuote(null)
          if (meta.replay) break
          if (event.payload.by === 'driver') {
            showToast(t('chat.confirmSent'), 'success')
          } else if (event.payload.confirmed) {
            showToast(t('driver.chat.quoteAccepted', { name: travellerName }), 'success')
          }
          break
        }
        case 'tts.chunk':
          if (!meta.replay && event.payload.speaker === 'traveller') {
            void speak(event.payload.text, event.payload.lang)
          }
          break
        case 'plan.update':
          setPlan(event.payload.plan)
          if (!meta.replay && event.payload.plan.locked) {
            showToast(t('chat.planLockedToast'), 'success')
          }
          break
        case 'error':
          showToast(
            event.payload.code === 'PLAN_NOT_CONFIRMED'
              ? t('chat.needsYourConfirmation')
              : event.payload.code === 'BUSY'
                ? t('driver.chat.busy')
                : t('chat.sendFailed'),
            'error',
          )
          break
        default:
          break
      }
    })
    const offStatus = transport.onStatus(setConnection)
    transport.connect()

    return () => {
      offEvent()
      offStatus()
      transport.disconnect()
      transportRef.current = null
    }
  }, [room, language, showToast, t, travellerName])

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
  }, [messages.length, livePartial, pendingConfirm, awaitingQuote, remotePhase])

  useEffect(() => {
    return () => stopSpeech()
  }, [])

  useEffect(() => {
    if (driving) setTypingMode(false)
  }, [driving])

  const persist = (key: string, value: boolean) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(value))
  }

  const send = useCallback(
    (event: ClientEvent) => {
      if (!online) {
        showToast(t('chat.offlineBanner'), 'error')
        return false
      }
      if (!transportRef.current) return false
      transportRef.current.send(event)
      return true
    },
    [online, showToast, t],
  )

  const startTalk = () => {
    if (pendingConfirm || awaitingQuote || !online || phase !== 'idle') return
    stopSpeech()
    startRef.current = Date.now()
    setPhase('listening')
  }

  const stopTalk = () => {
    const startedAt = startRef.current
    startRef.current = null
    if (!startedAt) return
    const duration = Date.now() - startedAt
    if (duration < 300) {
      setPhase('idle')
      showToast(t('chat.tooShort'), 'error')
      return
    }
    setPhase('understanding')
    const sent = send(
      envelope('audio.end', roomId, { lang: language, durationMs: duration, as: 'driver' }),
    )
    if (!sent) setPhase('idle')
  }

  const respond = (confirmed: boolean) => {
    if (!pendingConfirm || responding) return
    setResponding(true)
    const sent = send(
      envelope('confirm.response', roomId, {
        confirmId: pendingConfirm.confirmId,
        confirmed,
        as: 'driver',
      }),
    )
    if (!sent) {
      setResponding(false)
      return
    }
    window.setTimeout(() => setResponding(false), 800)
  }

  const submitText = () => {
    const text = draft.trim()
    if (!text) return
    const sent = send(envelope('text.send', roomId, { lang: language, text, as: 'driver' }))
    if (!sent) return
    setDraft('')
    setTypingMode(false)
    setPhase('understanding')
  }

  const lockPlan = () => {
    if (!plan || plan.needsConfirmation || plan.confirmedBy.length < 2) return
    if (!online) {
      showToast(t('chat.offlineBanner'), 'error')
      return
    }
    setLocking(true)
    send(envelope('plan.lock', roomId, {}))
    window.setTimeout(() => setLocking(false), 650)
  }

  const confirmText = pendingConfirm
    ? (pendingConfirm.copy?.backTranslation[language] ?? pendingConfirm.backTranslation)
    : ''
  const awaitingText = awaitingQuote
    ? (awaitingQuote.copy?.backTranslation[language] ?? awaitingQuote.backTranslation)
    : ''

  const connectionTone =
    connection === 'connected' ? 'online' : connection === 'offline' ? 'offline' : 'reconnecting'
  const connectionLabel =
    connection === 'connected'
      ? t('chat.connected')
      : connection === 'offline'
        ? t('chat.offline')
        : connection === 'connecting'
          ? t('chat.connecting')
          : t('chat.reconnecting')

  const header = (
    <header className="flex items-center gap-2.5 border-b border-line bg-canvas px-3 py-2.5">
      <IconButton label={t('driver.chat.backHome')} onClick={() => navigate('/driver')}>
        <ArrowLeft aria-hidden className="h-5 w-5" />
      </IconButton>
      <Avatar name={travellerName} variant={2} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight">{travellerName}</p>
        <p className="truncate text-[11px] font-medium text-muted">{languagePair}</p>
      </div>
      <div className="relative">
        <IconButton label={t('chat.viewPlan')} variant="surface" onClick={() => setPlanOpen(true)}>
          <CalendarDays aria-hidden className="h-5 w-5" />
        </IconButton>
        {plan?.needsConfirmation && !plan.locked ? (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-accent"
          />
        ) : null}
      </div>
      <IconButton
        label={t('driver.chat.display')}
        variant="surface"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings2 aria-hidden className="h-5 w-5" />
      </IconButton>
    </header>
  )

  return (
    <div className={cn('app-shell chat-shell', contrast && 'driver-contrast')}>
      {header}

      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-1.5">
        <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted">
          {t('chat.demoNotice')}
        </span>
        <div className="flex items-center gap-2">
          {remotePhase !== 'idle' && phase === 'idle' ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-brand-strong">
              <Volume2 aria-hidden className="h-3.5 w-3.5" />
              {t('chat.speakingNow', { driver: travellerName })}
            </span>
          ) : null}
          <StatusPill tone={connectionTone} label={connectionLabel} />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted">
          <RefreshCw aria-hidden className="h-5 w-5 animate-spin" />
          {t('common.loading')}
        </div>
      ) : loadError || !room ? (
        <div className="flex-1 overflow-y-auto">
          <ErrorState
            title={t('chat.errorTitle')}
            body={t('chat.errorBody')}
            action={
              <Button fullWidth onClick={() => navigate('/driver')}>
                {t('driver.chat.backHome')}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="no-scrollbar flex-1 overflow-y-auto px-4 py-4"
            aria-label={t('chat.title')}
          >
            {messages.length === 0 && !livePartial ? (
              <EmptyState
                className="py-8"
                icon={<Mic aria-hidden className="h-8 w-8" />}
                title={t('driver.chat.emptyTitle')}
                body={t('driver.chat.emptyBody', {
                  name: travellerName,
                  language: LANGUAGE_MAP[travellerLang].nativeName,
                })}
              />
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    self="driver"
                    otherName={travellerName}
                    replayTranslation
                    largeText={largeText || driving}
                    highContrast={contrast}
                  />
                ))}
                {livePartial ? (
                  <div className="flex justify-start">
                    <div className="max-w-[86%] rounded-3xl rounded-bl-lg border border-line bg-surface px-4 py-2.5 text-sm italic text-muted">
                      {livePartial}
                      <span aria-hidden>…</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-2.5 border-t border-line bg-canvas px-4 pb-3 pt-3">
            {driving ? (
              <Banner tone="info" icon={<CarFront aria-hidden className="h-5 w-5" />}>
                {t('driver.chat.drivingBanner')}
              </Banner>
            ) : null}

            {!online ? (
              <Banner tone="danger" role="alert">
                {t('chat.offlineBanner')}
              </Banner>
            ) : null}

            {awaitingQuote ? (
              <div
                role="status"
                className="animate-rise flex items-start gap-2.5 rounded-2xl border border-accent bg-accent-soft px-3.5 py-2.5"
              >
                <Hourglass aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {t('driver.chat.quoteWaiting', { name: travellerName })}
                  </p>
                  <p lang={language} className="mt-0.5 text-xs text-muted">
                    {awaitingText}
                  </p>
                </div>
              </div>
            ) : null}

            {pendingConfirm ? (
              <ConfirmBanner
                pending={pendingConfirm}
                onRespond={respond}
                disabled={responding}
                lang={language}
                large={driving}
                onPlay={() => void speak(confirmText, language)}
                speakerIsSelf={pendingConfirm.speaker === 'driver'}
              />
            ) : null}

            {latestTranscript && !driving ? (
              <TranscriptionCard
                text={latestTranscript.text}
                lang={latestTranscript.lang}
                onCorrect={() => setLatestTranscript(null)}
                onEdit={() => {
                  setDraft(latestTranscript.text)
                  setLatestTranscript(null)
                  setTypingMode(true)
                }}
              />
            ) : null}

            {plan ? (
              <button
                type="button"
                aria-label={t('chat.dayPlan')}
                onClick={() => setPlanOpen(true)}
                className="flex min-h-touch w-full items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2 text-left"
              >
                <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {t('chat.dayPlan')}
                  <span className="ml-1.5 text-[11px] font-normal text-muted">v{plan.version}</span>
                </span>
                {plan.locked ? (
                  <StatusPill tone="success" label={t('chat.locked')} />
                ) : plan.needsConfirmation ? (
                  <StatusPill tone="warning" label={t('chat.planNeedsConfirmation')} />
                ) : (
                  <StatusPill tone="success" label={t('chat.planConfirmed')} />
                )}
              </button>
            ) : null}

            {typingMode && !driving ? (
              <div className="flex items-end gap-2">
                <IconButton
                  label={t('chat.holdToTalk')}
                  variant="ghost"
                  onClick={() => setTypingMode(false)}
                >
                  <Mic aria-hidden className="h-5 w-5" />
                </IconButton>
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      submitText()
                    }
                  }}
                  placeholder={t('chat.messagePlaceholder')}
                  aria-label={t('chat.messagePlaceholder')}
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none placeholder:text-muted focus:border-brand"
                />
                <IconButton
                  label={t('chat.send')}
                  variant="brand"
                  size="lg"
                  disabled={!draft.trim() || !online}
                  onClick={submitText}
                >
                  <Send aria-hidden className="h-5 w-5" />
                </IconButton>
                <IconButton
                  label={t('common.cancel')}
                  variant="ghost"
                  onClick={() => {
                    setTypingMode(false)
                    setDraft('')
                  }}
                >
                  <X aria-hidden className="h-5 w-5" />
                </IconButton>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <HoldToTalkButton
                  phase={phase}
                  onStart={startTalk}
                  onStop={stopTalk}
                  disabled={Boolean(pendingConfirm || awaitingQuote)}
                  offline={!online}
                  size="lg"
                />
                {!driving ? (
                  <button
                    type="button"
                    onClick={() => setTypingMode(true)}
                    className="mt-1 inline-flex min-h-touch items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand-strong"
                  >
                    <Keyboard aria-hidden className="h-4 w-4" />
                    {t('chat.typeInstead')}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}

      {plan ? (
        <PlanSheet
          open={planOpen}
          onClose={() => setPlanOpen(false)}
          plan={plan}
          onLock={lockPlan}
          locking={locking}
          waitingFor={travellerName}
          onViewAgreement={() => navigate(`/agreement/${roomId}`)}
        />
      ) : null}

      <BottomSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t('driver.chat.displayTitle')}
        subtitle={t('driver.chat.displaySubtitle')}
      >
        <div className="space-y-2.5 pb-2">
          <ToggleRow
            icon={<Type aria-hidden className="h-5 w-5" />}
            label={t('driver.chat.largeText')}
            hint={t('driver.chat.largeTextHint')}
            checked={largeText}
            onChange={(next) => {
              setLargeText(next)
              persist(LARGE_TEXT_KEY, next)
            }}
          />
          <ToggleRow
            icon={<Contrast aria-hidden className="h-5 w-5" />}
            label={t('driver.chat.contrast')}
            hint={t('driver.chat.contrastHint')}
            checked={contrast}
            onChange={(next) => {
              setContrast(next)
              persist(CONTRAST_KEY, next)
            }}
          />
          <ToggleRow
            icon={<CarFront aria-hidden className="h-5 w-5" />}
            label={t('driver.chat.driving')}
            hint={t('driver.chat.drivingHint')}
            checked={driving}
            onChange={(next) => {
              setDriving(next)
              persist(DRIVING_KEY, next)
            }}
          />
        </div>
      </BottomSheet>
    </div>
  )
}

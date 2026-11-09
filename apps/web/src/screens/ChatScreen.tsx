import {
  ArrowLeft,
  CalendarDays,
  ChevronUp,
  Keyboard,
  Mic,
  RefreshCw,
  Send,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  Driver,
  LangCode,
  PendingConfirm,
  Plan,
  Room,
} from '../types'

function envelope(type: ClientEvent['type'], roomId: string, payload: unknown): ClientEvent {
  return { id: newId('evt'), type, roomId, ts: Date.now(), payload } as ClientEvent
}

export default function ChatScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { roomId = '' } = useParams()
  const language = useAppStore((state) => state.language)
  const online = useOnlineStatus()
  const { showToast } = useToast()

  const [room, setRoom] = useState<Room | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [phase, setPhase] = useState<ChatPhase>('idle')
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [driverPending, setDriverPending] = useState(false)
  const [livePartial, setLivePartial] = useState<string | null>(null)
  const [latestTranscript, setLatestTranscript] = useState<{ text: string; lang: LangCode } | null>(
    null,
  )
  const [connection, setConnection] = useState<ConnectionStatus>('connecting')
  const [typingMode, setTypingMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [planOpen, setPlanOpen] = useState(false)
  const [locking, setLocking] = useState(false)
  const [responding, setResponding] = useState(false)

  const transportRef = useRef<ChatTransport | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<number | null>(null)
  const pendingRef = useRef<PendingConfirm | null>(null)
  const swipeStart = useRef<number | null>(null)

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
        api
          .getDriver(result.driverId)
          .then((driverResult) => {
            if (active) setDriver(driverResult)
          })
          .catch(() => {
            /* the chat still works without the profile card */
          })
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
    const transport = createTransport(room.id, language)
    transportRef.current = transport

    const offEvent = transport.onEvent((event, meta) => {
      switch (event.type) {
        case 'status':
          if (!meta.replay) setPhase(event.payload.phase)
          break
        case 'utterance.partial':
          if (!meta.replay && event.payload.speaker === 'traveller') {
            setLivePartial(event.payload.text)
          }
          break
        case 'utterance.final':
          if (!meta.replay && event.payload.speaker === 'traveller') {
            setLivePartial(null)
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
        case 'confirm.request':
          pendingRef.current = event.payload
          setPendingConfirm(event.payload)
          break
        case 'confirm.response': {
          const pending = pendingRef.current
          if (pending && pending.confirmId === event.payload.confirmId) {
            setMessages((current) =>
              current.map((message) =>
                message.id === pending.utteranceId
                  ? { ...message, confirmed: event.payload.confirmed }
                  : message,
              ),
            )
            pendingRef.current = null
            setPendingConfirm(null)
            if (!meta.replay && event.payload.by === 'traveller' && event.payload.confirmed) {
              showToast(t('chat.confirmSent'), 'success')
            }
          }
          break
        }
        case 'driver.pending':
          setDriverPending(event.payload.active)
          break
        case 'tts.chunk':
          if (!meta.replay && event.payload.speaker === 'driver') {
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
  }, [room, language, showToast, t])

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
  }, [messages.length, driverPending, livePartial, pendingConfirm])

  useEffect(() => {
    return () => stopSpeech()
  }, [])

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
    if (pendingConfirm || !online || phase !== 'idle') return
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
    const sent = send(envelope('audio.end', roomId, { lang: language, durationMs: duration }))
    if (!sent) setPhase('idle')
  }

  const respond = (confirmed: boolean) => {
    if (!pendingConfirm || responding) return
    setResponding(true)
    const sent = send(
      envelope('confirm.response', roomId, {
        confirmId: pendingConfirm.confirmId,
        confirmed,
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
    const sent = send(envelope('text.send', roomId, { lang: language, text }))
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
    window.setTimeout(() => {
      setLocking(false)
      navigate(`/agreement/${roomId}`)
    }, 450)
  }

  const driverName = driver?.name ?? '…'
  const travellerLang = room?.travellerLang ?? language
  const driverLang = room?.driverLang ?? 'ta'
  const languagePair = `${LANGUAGE_MAP[travellerLang].nativeName} ↔ ${LANGUAGE_MAP[driverLang].nativeName}`
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
      <IconButton label={t('common.back')} onClick={() => navigate('/drivers')}>
        <ArrowLeft aria-hidden className="h-5 w-5" />
      </IconButton>
      <Avatar name={driverName} variant={driver?.avatarVariant ?? 0} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight">{driverName}</p>
        <p className="truncate text-[11px] font-medium text-muted">{languagePair}</p>
      </div>
      <div className="relative">
        <IconButton
          label={t('chat.viewPlan')}
          variant="surface"
          onClick={() => setPlanOpen(true)}
        >
          <CalendarDays aria-hidden className="h-5 w-5" />
        </IconButton>
        {plan?.needsConfirmation && !plan.locked ? (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-accent"
          />
        ) : null}
      </div>
    </header>
  )

  return (
    <div className="app-shell chat-shell">
      {header}

      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-1.5">
        <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted">
          {t('chat.demoNotice')}
        </span>
        <StatusPill tone={connectionTone} label={connectionLabel} />
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
              <Button fullWidth onClick={() => navigate('/drivers')}>
                {t('profile.backToDrivers')}
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
            {messages.length === 0 && !livePartial && !driverPending ? (
              <EmptyState
                className="py-8"
                icon={<Mic aria-hidden className="h-8 w-8" />}
                title={t('chat.emptyTitle')}
                body={t('chat.emptyBody', {
                  driver: driverName,
                  language: LANGUAGE_MAP[driverLang].nativeName,
                })}
              />
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} driverName={driverName} />
                ))}
                {livePartial ? (
                  <div className="flex justify-end">
                    <div className="max-w-[86%] rounded-3xl rounded-br-lg border border-line bg-surface2 px-4 py-2.5 text-sm italic text-muted">
                      {livePartial}
                      <span aria-hidden>…</span>
                    </div>
                  </div>
                ) : null}
                {driverPending ? (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-3xl rounded-bl-lg border border-line bg-surface px-4 py-3 text-xs text-muted">
                      <span className="flex gap-1" aria-hidden="true">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
                          style={{ animationDelay: '300ms' }}
                        />
                      </span>
                      {t('chat.driverTyping', { driver: driverName })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-2.5 border-t border-line bg-canvas px-4 pb-3 pt-3">
            {!online ? (
              <Banner tone="danger" role="alert">
                {t('chat.offlineBanner')}
              </Banner>
            ) : null}

            {pendingConfirm ? (
              <ConfirmBanner
                pending={pendingConfirm}
                onRespond={respond}
                disabled={responding}
                speakerIsSelf={pendingConfirm.speaker === 'traveller'}
              />
            ) : null}

            {latestTranscript ? (
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
                aria-label={`${t('chat.dayPlan')} — ${t('chat.swipeHint')}`}
                onClick={() => setPlanOpen(true)}
                onPointerDown={(event) => {
                  swipeStart.current = event.clientY
                }}
                onPointerUp={(event) => {
                  if (swipeStart.current !== null && swipeStart.current - event.clientY > 24) {
                    setPlanOpen(true)
                  }
                  swipeStart.current = null
                }}
                className="flex min-h-touch w-full items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2 text-left"
              >
                <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {t('chat.dayPlan')}
                  <span className="ml-1.5 text-[11px] font-normal text-muted">
                    v{plan.version}
                  </span>
                </span>
                {plan.locked ? (
                  <StatusPill tone="success" label={t('chat.locked')} />
                ) : plan.needsConfirmation ? (
                  <StatusPill tone="warning" label={t('chat.planNeedsConfirmation')} />
                ) : (
                  <StatusPill tone="success" label={t('chat.planConfirmed')} />
                )}
                <ChevronUp aria-hidden className="h-4 w-4 shrink-0 text-muted" />
              </button>
            ) : null}

            {typingMode ? (
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
                  disabled={Boolean(pendingConfirm)}
                  offline={!online}
                />
                <button
                  type="button"
                  onClick={() => setTypingMode(true)}
                  className={cn(
                    'mt-1 inline-flex min-h-touch items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand-strong',
                  )}
                >
                  <Keyboard aria-hidden className="h-4 w-4" />
                  {t('chat.typeInstead')}
                </button>
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
          onViewAgreement={() => navigate(`/agreement/${roomId}`)}
        />
      ) : null}
    </div>
  )
}

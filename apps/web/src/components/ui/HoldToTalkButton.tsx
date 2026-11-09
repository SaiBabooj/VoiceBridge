import { Loader2, Mic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import type { ChatPhase } from '../../types'
import { Waveform } from './Waveform'

export interface HoldToTalkButtonProps {
  phase: ChatPhase
  onStart: () => void
  onStop: () => void
  disabled?: boolean
  offline?: boolean
  size?: 'md' | 'lg'
}

export function HoldToTalkButton({
  phase,
  onStart,
  onStop,
  disabled = false,
  offline = false,
  size = 'md',
}: HoldToTalkButtonProps) {
  const { t } = useTranslation()
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const pressed = useRef(false)
  const large = size === 'lg'

  useEffect(() => {
    if (phase !== 'listening') {
      if (timer.current) clearInterval(timer.current)
      timer.current = null
      setElapsed(0)
      return
    }
    timer.current = setInterval(() => {
      if (startedAt.current) setElapsed(Date.now() - startedAt.current)
    }, 100)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [phase])

  const label = offline
    ? t('chat.offline')
    : phase === 'listening'
      ? t('chat.listening')
      : phase === 'understanding'
        ? t('chat.understanding')
        : phase === 'translating'
          ? t('chat.translating')
          : phase === 'speaking'
            ? t('chat.speaking')
            : t('chat.holdToTalk')

  const busy = phase === 'understanding' || phase === 'translating' || phase === 'speaking'
  const isDisabled = disabled || offline || busy

  const start = () => {
    if (isDisabled || pressed.current) return
    pressed.current = true
    startedAt.current = Date.now()
    onStart()
  }

  const stop = () => {
    if (!pressed.current) return
    pressed.current = false
    onStop()
  }

  return (
    <div className="flex flex-col items-center">
      <Waveform active={phase === 'listening'} className="mb-1 h-8" />
      <div className="relative flex items-center justify-center">
        {phase === 'listening' ? (
          <>
            <span
              className={cn(
                'absolute animate-ring rounded-full bg-brand-soft',
                large ? 'h-36 w-36' : 'h-28 w-28',
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'absolute animate-ring rounded-full bg-brand-soft',
                large ? 'h-36 w-36' : 'h-28 w-28',
              )}
              style={{ animationDelay: '700ms' }}
              aria-hidden="true"
            />
          </>
        ) : null}
        <button
          type="button"
          aria-label={label}
          aria-pressed={phase === 'listening'}
          disabled={isDisabled}
          onPointerDown={(event) => {
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            start()
          }}
          onPointerUp={(event) => {
            event.preventDefault()
            stop()
          }}
          onPointerCancel={() => stop()}
          onLostPointerCapture={() => stop()}
          onContextMenu={(event) => event.preventDefault()}
          className={cn(
            'relative flex touch-none select-none flex-col items-center justify-center gap-1 rounded-full shadow-lift transition',
            large ? 'h-36 w-36' : 'h-28 w-28',
            phase === 'listening'
              ? 'scale-105 bg-brand-strong text-onbrand'
              : 'bg-brand text-onbrand active:scale-95',
            isDisabled && 'opacity-60',
          )}
        >
          {busy ? (
            <Loader2 aria-hidden className={large ? 'h-12 w-12 animate-spin' : 'h-9 w-9 animate-spin'} />
          ) : (
            <Mic aria-hidden className={large ? 'h-14 w-14' : 'h-10 w-10'} />
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            {phase === 'listening' ? `${(elapsed / 1000).toFixed(1)}s` : ''}
          </span>
        </button>
      </div>
      <p
        aria-live="polite"
        className={cn(
          'mt-3 min-h-[24px] text-center font-semibold text-ink',
          large ? 'text-lg' : 'text-sm',
        )}
      >
        {label}
      </p>
      <p className="text-xs text-muted">
        {phase === 'listening' ? t('chat.releaseToSend') : t('chat.idleHint')}
      </p>
    </div>
  )
}

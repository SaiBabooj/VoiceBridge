import { Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_MAP } from '../../lib/languages'
import { speak } from '../../lib/speech'
import { cn } from '../../lib/utils'
import type { ChatMessage, Participant } from '../../types'
import { IconButton } from '../ui/IconButton'
import { useToast } from '../ui/Toast'

export function MessageBubble({
  message,
  driverName,
  self = 'traveller',
  otherName,
  largeText = false,
  highContrast = false,
  replayTranslation = false,
}: {
  message: ChatMessage
  driverName?: string
  self?: Participant
  otherName?: string
  largeText?: boolean
  highContrast?: boolean
  replayTranslation?: boolean
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const outgoing = message.speaker === self
  const speakerName = outgoing ? t('chat.you') : (otherName ?? driverName ?? '—')

  const mainText = outgoing ? message.originalText : message.translationText
  const mainLang = outgoing ? message.originalLang : message.translationLang
  const subText = outgoing ? message.translationText : message.originalText
  const subLang = outgoing ? message.translationLang : message.originalLang

  const play = async () => {
    const text = replayTranslation ? message.translationText : message.originalText
    const lang = replayTranslation ? message.translationLang : message.originalLang
    const ok = await speak(text, lang)
    if (!ok) showToast(t('chat.ttsUnavailable'), 'error')
  }

  return (
    <div className={cn('flex w-full', outgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[86%] rounded-3xl border px-4 pb-2.5 pt-3 shadow-soft',
          outgoing
            ? 'rounded-br-lg border-brand bg-brand-soft'
            : 'rounded-bl-lg border-line bg-surface',
          highContrast && 'border-2',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {speakerName}
          </span>
          {message.risk === 'commitment' ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                message.confirmed === true
                  ? 'bg-success-soft text-success'
                  : message.confirmed === false
                    ? 'bg-danger-soft text-danger'
                    : 'bg-accent-soft text-ink',
              )}
            >
              {message.confirmed === true
                ? t('chat.confirmed')
                : message.confirmed === false
                  ? t('chat.commitmentDeclined')
                  : t('chat.planNeedsConfirmation')}
            </span>
          ) : null}
        </div>

        <p
          lang={mainLang}
          className={cn(
            'mt-1.5 font-medium leading-relaxed',
            largeText ? 'text-[22px]' : 'text-[17px]',
          )}
        >
          {mainText}
        </p>

        <div className="mt-2 flex items-end gap-2 border-t border-line pt-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">
              {LANGUAGE_MAP[subLang].nativeName} · {t('chat.translation')}
            </p>
            <p
              lang={subLang}
              className={cn(
                'mt-0.5 line-clamp-3 leading-snug text-muted',
                largeText ? 'text-sm' : 'text-xs',
              )}
            >
              {subText}
            </p>
          </div>
          <IconButton
            label={`${t('common.play')} — ${LANGUAGE_MAP[replayTranslation ? message.translationLang : message.originalLang].nativeName}`}
            variant="ghost"
            size="sm"
            onClick={play}
            className="-mb-1 -mr-1"
          >
            <Play aria-hidden className="h-4 w-4 fill-current" />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

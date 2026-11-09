import { AlertTriangle, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatINR } from '../../lib/utils'
import type { LangCode, PendingConfirm } from '../../types'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'

export function ConfirmBanner({
  pending,
  onRespond,
  disabled = false,
  lang,
  onPlay,
  large = false,
  speakerIsSelf = true,
}: {
  pending: PendingConfirm
  onRespond: (confirmed: boolean) => void
  disabled?: boolean
  lang?: LangCode
  onPlay?: () => void
  large?: boolean
  speakerIsSelf?: boolean
}) {
  const { t, i18n } = useTranslation()
  const viewLang = lang ?? (i18n.language as LangCode)
  const backTranslation = pending.copy?.backTranslation[viewLang] ?? pending.backTranslation
  const question = pending.copy?.question[viewLang] ?? pending.question
  const buttonSize = large ? 'xl' : 'lg'
  const title = speakerIsSelf ? t('chat.confirmRequestTitle') : t('chat.confirmOtherTitle')
  const detail = speakerIsSelf ? question : t('chat.confirmOtherQuestion')

  return (
    <div
      role="alert"
      className="animate-rise rounded-3xl border-2 border-accent bg-accent-soft p-4 text-ink"
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
        <AlertTriangle aria-hidden className="h-4 w-4 text-accent" />
        {t('chat.needsYourConfirmation')}
      </div>
      <div className="mt-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p
            lang={viewLang}
            className={
              large
                ? 'mt-1 text-[26px] font-semibold leading-snug'
                : 'mt-1 text-[20px] font-semibold leading-snug'
            }
          >
            {backTranslation}
          </p>
          <p lang={viewLang} className="mt-1 text-xs text-muted">
            {detail}
          </p>
        </div>
        {onPlay ? (
          <IconButton
            label={`${t('common.play')} — ${title}`}
            variant="surface"
            size={large ? 'lg' : 'md'}
            onClick={onPlay}
          >
            <Play aria-hidden className="h-5 w-5 fill-current" />
          </IconButton>
        ) : null}
      </div>

      {pending.commitment ? (
        <div className="num mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
          <span>
            {t('chat.priceLabel')}: {formatINR(pending.commitment.price)}
          </span>
          <span>
            {t('chat.hoursLabel')}: {pending.commitment.hours}
          </span>
          <span>
            {t('chat.waitingLabel')}: {formatINR(pending.commitment.waitingCharge)}
          </span>
        </div>
      ) : null}

      <div className="mt-3.5 flex gap-2.5">
        <Button size={buttonSize} className="flex-1" onClick={() => onRespond(true)} disabled={disabled}>
          {speakerIsSelf ? t('chat.confirmYes') : t('chat.confirmAgree')}
        </Button>
        <Button
          size={buttonSize}
          variant="secondary"
          className="flex-1"
          onClick={() => onRespond(false)}
          disabled={disabled}
        >
          {speakerIsSelf ? t('chat.confirmNo') : t('chat.confirmChange')}
        </Button>
      </div>
    </div>
  )
}

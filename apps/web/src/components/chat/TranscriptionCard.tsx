import { Check, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_MAP } from '../../lib/languages'
import type { LangCode } from '../../types'
import { Button } from '../ui/Button'

export function TranscriptionCard({
  text,
  lang,
  onCorrect,
  onEdit,
}: {
  text: string
  lang: LangCode
  onCorrect: () => void
  onEdit: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="animate-rise rounded-2xl border border-line bg-surface p-3.5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
          {t('chat.youSaid')}
        </p>
        <span className="text-[11px] font-semibold text-brand-strong">
          {LANGUAGE_MAP[lang].nativeName}
        </span>
      </div>
      <p lang={lang} className="mt-1.5 text-[15px] font-medium leading-snug">
        {text}
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          size="md"
          variant="soft"
          className="flex-1"
          icon={<Check aria-hidden className="h-4 w-4" />}
          onClick={onCorrect}
        >
          {t('chat.correct')}
        </Button>
        <Button
          size="md"
          variant="secondary"
          className="flex-1"
          icon={<Pencil aria-hidden className="h-4 w-4" />}
          onClick={onEdit}
        >
          {t('chat.edit')}
        </Button>
      </div>
    </div>
  )
}

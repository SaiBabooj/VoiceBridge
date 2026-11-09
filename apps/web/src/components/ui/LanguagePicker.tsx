import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../../lib/languages'
import { cn } from '../../lib/utils'
import type { LangCode } from '../../types'

const greetings: Record<LangCode, string> = {
  hi: 'नमस्ते',
  ta: 'வணக்கம்',
  en: 'Hello',
}

export function LanguagePicker({
  value,
  onSelect,
}: {
  value?: LangCode
  onSelect: (language: LangCode) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-3" role="radiogroup" aria-label={t('language.title')}>
      {LANGUAGES.map((language) => {
        const selected = value === language.code
        return (
          <button
            key={language.code}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(language.code)}
            className={cn(
              'flex min-h-[92px] items-center gap-4 rounded-3xl border-2 px-5 py-4 text-left transition active:scale-[0.99]',
              selected
                ? 'border-brand bg-brand-soft'
                : 'border-line bg-surface hover:border-brand',
            )}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface2 text-lg font-semibold text-brand-strong">
              {language.code.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[26px] font-semibold leading-tight">
                {language.nativeName}
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                {greetings[language.code]} · {language.englishName}
              </span>
            </span>
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                selected ? 'border-brand bg-brand text-onbrand' : 'border-line text-transparent',
              )}
              aria-hidden="true"
            >
              <Check className="h-4 w-4" />
            </span>
          </button>
        )
      })}
    </div>
  )
}

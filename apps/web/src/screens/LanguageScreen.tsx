import { AudioLines, Languages, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { RoleSwitchButton } from '../components/RoleSwitchButton'
import { LanguagePicker } from '../components/ui/LanguagePicker'
import { IconButton } from '../components/ui/IconButton'
import { enterDriverMode } from '../lib/role'
import { useAppStore } from '../store/appStore'
import type { LangCode } from '../types'

export default function LanguageScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = useAppStore((state) => state.language)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const theme = useAppStore((state) => state.theme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)

  const choose = (code: LangCode) => {
    setLanguage(code)
    navigate('/setup')
  }

  return (
    <div className="app-shell grain">
      <header className="flex items-center justify-between gap-2 px-5 pb-2 pt-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-onbrand">
            <AudioLines aria-hidden className="h-5 w-5" />
          </span>
          <span className="truncate text-[15px] font-semibold">{t('common.appName')}</span>
          <span className="hidden shrink-0 rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted min-[390px]:inline">
            {t('common.demoBuild')}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton
            label={`${t('common.appearance')}: ${theme === 'dark' ? t('common.darkTheme') : t('common.lightTheme')}`}
            variant="surface"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun aria-hidden className="h-5 w-5" />
            ) : (
              <Moon aria-hidden className="h-5 w-5" />
            )}
          </IconButton>
          <RoleSwitchButton
            destination="driver"
            onClick={() => {
              enterDriverMode()
              navigate('/driver')
            }}
          />
        </div>
      </header>

      <main className="flex flex-1 flex-col px-5 pb-8 pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-strong">
          {t('common.appName')}
        </p>
        <h1 className="heading-xl mt-2">{t('language.title')}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{t('language.subtitle')}</p>

        <div className="mt-6">
          <LanguagePicker value={language} onSelect={choose} />
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
            <Languages aria-hidden className="h-5 w-5" />
          </span>
          <p className="text-[13px] leading-relaxed text-muted">{t('language.hint')}</p>
        </div>

        <div className="mt-auto pt-10">
          <p className="text-center text-[11px] leading-relaxed text-muted">{t('language.privacy')}</p>
        </div>
      </main>
    </div>
  )
}

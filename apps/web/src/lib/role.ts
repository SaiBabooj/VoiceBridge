import { useAppStore } from '../store/appStore'
import { isLangCode } from './languages'
import type { LangCode } from '../types'

const DRIVER_LANG = 'vb-driver-lang'
const TRAVELLER_LANG = 'vb-traveller-lang'

export function enterDriverMode(): void {
  const { language, setLanguage, setRole } = useAppStore.getState()
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TRAVELLER_LANG, language)
    const stored = localStorage.getItem(DRIVER_LANG)
    const next: LangCode = isLangCode(stored) ? stored : 'ta'
    setLanguage(next)
  }
  setRole('driver')
}

export function enterTravellerMode(): void {
  const { language, setLanguage, setRole } = useAppStore.getState()
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DRIVER_LANG, language)
    const stored = localStorage.getItem(TRAVELLER_LANG)
    const next: LangCode = isLangCode(stored) ? stored : 'en'
    setLanguage(next)
  }
  setRole('traveller')
}

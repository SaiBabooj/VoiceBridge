import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { isLangCode } from '../lib/languages'
import en from './locales/en'
import hi from './locales/hi'
import ta from './locales/ta'

const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem('vb-lang')
const initial = isLangCode(stored) ? stored : 'en'

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    ta: { translation: ta },
  },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

document.documentElement.lang = initial
i18n.on('languageChanged', (language) => {
  localStorage.setItem('vb-lang', language)
  document.documentElement.lang = language
})

export default i18n

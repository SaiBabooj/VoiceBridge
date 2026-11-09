import { create } from 'zustand'
import i18n from '../i18n'
import { isLangCode } from '../lib/languages'
import type { LangCode, TripPrefs } from '../types'

type Role = 'traveller' | 'driver'
type Theme = 'light' | 'dark'

function readLang(): LangCode {
  if (typeof localStorage === 'undefined') return 'en'
  const stored = localStorage.getItem('vb-lang')
  return isLangCode(stored) ? stored : 'en'
}

function readTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light'
  const stored = localStorage.getItem('vb-theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readTrip(): TripPrefs {
  if (typeof localStorage === 'undefined') return { interests: [], group: null, duration: null }
  try {
    const parsed = JSON.parse(localStorage.getItem('vb-trip') ?? 'null') as TripPrefs | null
    if (parsed && Array.isArray(parsed.interests)) return parsed
  } catch {
    /* ignore a corrupt demo preference */
  }
  return { interests: [], group: null, duration: null }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

interface AppState {
  language: LangCode
  role: Role
  theme: Theme
  trip: TripPrefs
  setLanguage: (language: LangCode) => void
  setRole: (role: Role) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setTrip: (trip: TripPrefs) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  language: readLang(),
  role: 'traveller',
  theme: readTheme(),
  trip: readTrip(),
  setLanguage: (language) => {
    localStorage.setItem('vb-lang', language)
    void i18n.changeLanguage(language)
    set({ language })
  },
  setRole: (role) => set({ role }),
  setTheme: (theme) => {
    localStorage.setItem('vb-theme', theme)
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  setTrip: (trip) => {
    localStorage.setItem('vb-trip', JSON.stringify(trip))
    set({ trip })
  },
}))

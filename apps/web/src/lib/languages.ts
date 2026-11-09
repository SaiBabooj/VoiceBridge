import type { LanguageMeta, LangCode } from '../types'

export const LANGUAGES: LanguageMeta[] = [
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', bcp47: 'hi-IN' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', bcp47: 'ta-IN' },
  { code: 'en', nativeName: 'English', englishName: 'English', bcp47: 'en-IN' },
]

export const LANGUAGE_MAP: Record<LangCode, LanguageMeta> = LANGUAGES.reduce(
  (acc, language) => ({ ...acc, [language.code]: language }),
  {} as Record<LangCode, LanguageMeta>,
)

export function languageName(code: LangCode, uiLanguage: LangCode): string {
  if (code === uiLanguage) return LANGUAGE_MAP[code].nativeName
  return LANGUAGE_MAP[code].nativeName
}

export function ttsLang(code: LangCode): string {
  return LANGUAGE_MAP[code].bcp47
}

export function isLangCode(value: string | null | undefined): value is LangCode {
  return value === 'en' || value === 'hi' || value === 'ta'
}

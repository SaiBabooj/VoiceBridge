import { useVoiceKeyStore } from '../store/voiceKeyStore'
import type { LangCode } from '../types'
import { LANGUAGE_MAP } from './languages'

const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')
).replace(/\/$/, '')
const USE_TIMBRE = import.meta.env.VITE_TTS_PROVIDER !== 'browser'

let currentAudio: HTMLAudioElement | null = null
let currentUrl: string | null = null
let requestId = 0

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function releaseAudio(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
}

function pickVoice(lang: LangCode): SpeechSynthesisVoice | undefined {
  const target = LANGUAGE_MAP[lang].bcp47.toLowerCase()
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((voice) => voice.lang.toLowerCase() === target) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(lang)) ??
    undefined
  )
}

function speakBrowser(text: string, lang: LangCode, rate: number): boolean {
  if (!isSpeechSupported() || !text.trim()) return false
  const synth = window.speechSynthesis
  synth.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(lang)
  if (voice) utterance.voice = voice
  utterance.lang = LANGUAGE_MAP[lang].bcp47
  utterance.rate = rate
  utterance.pitch = 1
  synth.speak(utterance)
  return true
}

export async function speak(text: string, lang: LangCode, rate = 0.95): Promise<boolean> {
  const trimmed = text.trim()
  if (!trimmed) return false
  stopSpeech()
  const id = ++requestId

  if (USE_TIMBRE) {
    try {
      const key = useVoiceKeyStore.getState().key
      const response = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(key ? { 'x-gnani-key': key } : {}),
        },
        body: JSON.stringify({ text: trimmed, lang }),
      })
      if (id !== requestId) return false
      if (response.ok) {
        const blob = await response.blob()
        if (id === requestId && blob.size > 0) {
          const url = URL.createObjectURL(blob)
          const element = new Audio(url)
          currentAudio = element
          currentUrl = url
          element.addEventListener(
            'ended',
            () => {
              if (currentAudio === element) releaseAudio()
            },
            { once: true },
          )
          await element.play()
          return true
        }
      }
    } catch {
      // Gateway offline or autoplay blocked — fall back to the device voice.
    }
    if (id !== requestId) return false
    releaseAudio()
  }

  return speakBrowser(trimmed, lang, rate)
}

export interface VoiceKeyCheck {
  ok: boolean
  code?: string
}

export async function verifyVoiceKey(
  key: string,
  lang: LangCode,
  text: string,
): Promise<VoiceKeyCheck> {
  try {
    const response = await fetch(`${API_URL}/api/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-gnani-key': key },
      body: JSON.stringify({ text, lang }),
    })
    if (response.ok) return { ok: true }
    let code = `HTTP_${response.status}`
    try {
      const body = (await response.json()) as { error?: { code?: string } }
      code = body.error?.code ?? code
    } catch {
      /* the status is enough */
    }
    return { ok: false, code }
  } catch {
    return { ok: false, code: 'UNAVAILABLE' }
  }
}

export function stopSpeech(): void {
  requestId += 1
  releaseAudio()
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}

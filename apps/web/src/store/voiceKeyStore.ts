import { create } from 'zustand'

const STORAGE_KEY = 'vb-gnani-key'
export const MAX_KEY_LENGTH = 512

function readKey(): string {
  if (typeof sessionStorage === 'undefined') return ''
  try {
    return (sessionStorage.getItem(STORAGE_KEY) ?? '').trim()
  } catch {
    return ''
  }
}

interface VoiceKeyState {
  key: string
  setKey: (value: string) => void
  clear: () => void
}

export const useVoiceKeyStore = create<VoiceKeyState>((set) => ({
  key: readKey(),
  setKey: (value) => {
    const next = value.trim().slice(0, MAX_KEY_LENGTH)
    try {
      if (next) sessionStorage.setItem(STORAGE_KEY, next)
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage can be blocked; the in-memory key still works for this page */
    }
    set({ key: next })
  },
  clear: () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* nothing to clear */
    }
    set({ key: '' })
  },
}))

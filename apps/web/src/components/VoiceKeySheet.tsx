import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { verifyVoiceKey } from '../lib/speech'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { MAX_KEY_LENGTH, useVoiceKeyStore } from '../store/voiceKeyStore'
import { BottomSheet } from './ui/BottomSheet'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'

type Feedback = { tone: 'success' | 'danger'; text: string }

export function VoiceKeySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const language = useAppStore((state) => state.language)
  const savedKey = useVoiceKeyStore((state) => state.key)
  const setKey = useVoiceKeyStore((state) => state.setKey)
  const clear = useVoiceKeyStore((state) => state.clear)

  const [draft, setDraft] = useState('')
  const [reveal, setReveal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft('')
    setReveal(false)
    setEditing(false)
    setTesting(false)
    setFeedback(null)
  }, [open])

  const save = () => {
    const value = draft.trim()
    if (!value) {
      setFeedback({ tone: 'danger', text: t('voiceKey.empty') })
      return
    }
    setKey(value)
    setDraft('')
    setReveal(false)
    setEditing(false)
    setFeedback({ tone: 'success', text: t('voiceKey.saved') })
  }

  const test = async (key: string) => {
    if (!key) {
      setFeedback({ tone: 'danger', text: t('voiceKey.empty') })
      return
    }
    setTesting(true)
    setFeedback(null)
    const result = await verifyVoiceKey(key, language, t('voiceKey.testPhrase'))
    setTesting(false)
    if (result.ok) {
      setFeedback({ tone: 'success', text: t('voiceKey.testOk') })
      return
    }
    const invalid =
      result.code === 'AUTH_FAILED' || result.code === 'KEY_REQUIRED' || result.code === 'INVALID_KEY'
    setFeedback({
      tone: 'danger',
      text: invalid
        ? t('voiceKey.invalid')
        : result.code === 'RATE_LIMITED'
          ? t('voiceKey.rateLimited')
          : t('voiceKey.unavailable'),
    })
  }

  const remove = () => {
    clear()
    setDraft('')
    setEditing(false)
    setFeedback({ tone: 'success', text: t('voiceKey.removed') })
  }

  const feedbackNode = feedback ? (
    <p
      role={feedback.tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-medium leading-relaxed',
        feedback.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success',
      )}
    >
      {feedback.tone === 'danger' ? (
        <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      {feedback.text}
    </p>
  ) : null

  const showForm = !savedKey || editing

  return (
    <BottomSheet open={open} onClose={onClose} title={t('voiceKey.title')} subtitle={t('voiceKey.subtitle')}>
      {showForm ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="gnani-key" className="mb-1.5 block text-sm font-semibold">
              {t('voiceKey.label')}
            </label>
            <div className="relative">
              <input
                id="gnani-key"
                autoFocus
                type={reveal ? 'text' : 'password'}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={MAX_KEY_LENGTH}
                autoComplete="new-password"
                spellCheck={false}
                placeholder={t('voiceKey.placeholder')}
                className="h-12 w-full rounded-2xl border border-line bg-surface pl-4 pr-12 text-[15px] outline-none placeholder:text-muted focus:border-brand"
              />
              <IconButton
                label={reveal ? t('voiceKey.hide') : t('voiceKey.show')}
                variant="ghost"
                size="sm"
                className="absolute right-0.5 top-0.5"
                onClick={() => setReveal((current) => !current)}
              >
                {reveal ? (
                  <EyeOff aria-hidden className="h-5 w-5" />
                ) : (
                  <Eye aria-hidden className="h-5 w-5" />
                )}
              </IconButton>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface2 p-3">
            <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" />
            <p className="text-xs leading-relaxed text-muted">{t('voiceKey.privacy')}</p>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">{t('voiceKey.note')}</p>

          {feedbackNode}

          <div className="flex gap-2">
            <Button fullWidth onClick={save} disabled={!draft.trim()}>
              {t('voiceKey.save')}
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => test(draft.trim())}
              loading={testing}
              disabled={!draft.trim()}
            >
              {t('voiceKey.test')}
            </Button>
          </div>

          {savedKey ? (
            <Button
              fullWidth
              variant="ghost"
              onClick={() => {
                setEditing(false)
                setDraft('')
                setFeedback(null)
              }}
            >
              {t('common.cancel')}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-surface2 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                <KeyRound aria-hidden className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{t('voiceKey.active')}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  {t('voiceKey.activeHint')}
                </p>
              </div>
            </div>
          </div>

          {feedbackNode}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => test(savedKey)} loading={testing}>
              {t('voiceKey.test')}
            </Button>
            <Button
              variant="soft"
              onClick={() => {
                setEditing(true)
                setFeedback(null)
              }}
            >
              {t('voiceKey.replace')}
            </Button>
            <Button variant="ghost" className="text-danger" onClick={remove}>
              {t('voiceKey.remove')}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}

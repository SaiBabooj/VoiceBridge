import { CheckCircle2, Info, XCircle } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '../../lib/utils'

type Tone = 'info' | 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  tone: Tone
}

interface ToastContextValue {
  showToast: (message: string, tone?: Tone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<Tone, ReactNode> = {
  info: <Info aria-hidden className="h-4 w-4" />,
  success: <CheckCircle2 aria-hidden className="h-4 w-4" />,
  error: <XCircle aria-hidden className="h-4 w-4" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const showToast = useCallback((message: string, tone: Tone = 'info') => {
    counter.current += 1
    const id = counter.current
    setToasts((current) => [...current.slice(-2), { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3600)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex max-w-[400px] animate-rise items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-lift',
              toast.tone === 'success' && 'bg-brand text-onbrand',
              toast.tone === 'error' && 'bg-danger text-white',
              toast.tone === 'info' && 'bg-ink text-canvas',
            )}
          >
            {icons[toast.tone]}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

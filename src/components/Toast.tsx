import { AlertTriangle, Check, Info } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  tone: Tone
  message: string
}

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null)

const STYLE: Record<Tone, { cls: string; icon: ReactNode }> = {
  success: { cls: 'banner--ok', icon: <Check /> },
  error: { cls: 'banner--bad', icon: <AlertTriangle /> },
  info: { cls: 'banner--info', icon: <Info /> },
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = nextId++
    setToasts((t) => [...t, { id, tone, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              role="status"
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16 }}
              className={`banner ${STYLE[t.tone].cls} max-w-md font-semibold backdrop-blur-xl`}
              style={{ background: 'rgba(8,15,36,.92)' }}
            >
              {STYLE[t.tone].icon}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast fuera de ToastProvider')
  return ctx
}

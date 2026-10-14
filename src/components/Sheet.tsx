import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Hoja inferior en móvil, diálogo centrado a partir de 640 px */
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  children: ReactNode
}) {
  const centered = useMediaQuery('(min-width: 640px)')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  const motionProps = centered
    ? {
        initial: { opacity: 0, x: '-50%', y: '-46%', scale: 0.97 },
        animate: { opacity: 1, x: '-50%', y: '-50%', scale: 1 },
        exit: { opacity: 0, x: '-50%', y: '-46%', scale: 0.97 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { type: 'spring' as const, damping: 32, stiffness: 340 },
      }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            key="sheet"
            className="sheet scroll-pretty"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            {...motionProps}
          >
            <div className="sheet__grab sm:hidden" />
            <div className="mb-3 flex items-center justify-between">
              <div>
                {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                <h2 className="h-display h-m mt-0.5">{title}</h2>
              </div>
              <button
                className="btn btn--glass btn--icon"
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
              >
                <X />
              </button>
            </div>
            {children}
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

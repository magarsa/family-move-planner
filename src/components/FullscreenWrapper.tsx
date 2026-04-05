// ─────────────────────────────────────────────────────────────────────────────
// src/components/FullscreenWrapper.tsx
//
// Wraps any page content with a fullscreen toggle.
// Normal mode: renders children in-place (no layout change).
// Fullscreen mode: fixed overlay covering the entire viewport (above sidebar).
//
// Usage:
//   const [fs, setFs] = useState(false)
//   <FullscreenWrapper fullscreen={fs} onToggle={() => setFs(f => !f)}>
//     ...content...
//   </FullscreenWrapper>
//
//   Put <FullscreenToggleButton /> wherever you want the trigger button.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, type ReactNode } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface WrapperProps {
  fullscreen: boolean
  onToggle: () => void
  children: ReactNode
}

export function FullscreenWrapper({ fullscreen, onToggle, children }: WrapperProps) {
  // Close on Escape
  useEffect(() => {
    if (!fullscreen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggle() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [fullscreen, onToggle])

  // Prevent body scroll while fullscreen
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  if (!fullscreen) return <>{children}</>

  return (
    <AnimatePresence>
      <motion.div
        key="fullscreen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 bg-stone-50 dark:bg-stone-900 flex flex-col overflow-hidden"
      >
        {/* Close bar */}
        <div className="flex-shrink-0 flex justify-end px-4 py-2 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
          <button
            onClick={onToggle}
            title="Exit fullscreen (Esc)"
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500
                       hover:text-stone-800 dark:hover:text-stone-200
                       border border-stone-200 dark:border-stone-700
                       hover:border-stone-400 dark:hover:border-stone-500
                       px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Minimize2 size={13} />
            Exit fullscreen
            <span className="ml-0.5 text-stone-400 dark:text-stone-500 font-normal">Esc</span>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            {children}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Standalone toggle button ──────────────────────────────────────────────────

interface ToggleButtonProps {
  fullscreen: boolean
  onToggle: () => void
  className?: string
}

export function FullscreenToggleButton({ fullscreen, onToggle, className = '' }: ToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
      className={`flex items-center gap-1.5 text-sm font-semibold
                  text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200
                  border border-stone-200 dark:border-stone-700
                  hover:border-stone-400 dark:hover:border-stone-500
                  px-3 py-1.5 rounded-lg transition-colors ${className}`}
    >
      {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
    </button>
  )
}

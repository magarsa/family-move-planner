import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

const SCROLL_THRESHOLD = 200

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    function onScroll() {
      setVisible(main!.scrollTop > SCROLL_THRESHOLD)
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
          onClick={() => document.querySelector('main')?.scrollTo(0, 0)}
          aria-label="Back to top"
          className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] right-4 sm:right-6 z-40 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 shadow-lg hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors touch-manipulation"
        >
          <ArrowUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

import { FlaskConical } from 'lucide-react'
import { useUser } from '../hooks/useUser'

export default function DemoBanner() {
  const { exitDemoMode } = useUser()

  return (
    <div className="bg-amber-50 border-b border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <FlaskConical size={15} className="shrink-0" />
        <span>
          <span className="font-semibold">Demo mode</span> — you're exploring a preview. Changes won't be saved.
        </span>
      </div>
      <button
        onClick={exitDemoMode}
        className="shrink-0 text-amber-700 dark:text-amber-400 font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
      >
        Sign in →
      </button>
    </div>
  )
}

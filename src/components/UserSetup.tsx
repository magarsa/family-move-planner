import { motion } from 'framer-motion'
import type { UserName } from '../hooks/useUser'

interface Props {
  onSelect: (name: UserName) => Promise<void>
}

const users: { name: UserName; emoji: string; role: string }[] = [
  { name: 'Safal', emoji: '👨', role: 'Husband' },
  { name: 'Prativa', emoji: '👩', role: 'Wife' },
]

export default function UserSetup({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md text-center"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="text-5xl mb-4">🏡</div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">
            Move Planner
          </h1>
          <p className="text-stone-500 text-base leading-relaxed">
            Your family relocation command center
          </p>
          <div className="mt-3 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
        </div>

        {/* Who are you */}
        <div className="mb-8">
          <p className="text-stone-600 font-medium mb-6">Who's planning today?</p>
          <div className="grid grid-cols-2 gap-4">
            {users.map(({ name, emoji, role }) => (
              <motion.button
                key={name}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(name)}
                className="card p-6 flex flex-col items-center gap-3 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <span className="text-4xl">{emoji}</span>
                <div>
                  <div className="font-semibold text-stone-900 group-hover:text-teal-700 transition-colors">
                    {name}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">{role}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <p className="text-xs text-stone-400">
          This links your name to your account and is saved permanently.
        </p>
      </motion.div>
    </div>
  )
}

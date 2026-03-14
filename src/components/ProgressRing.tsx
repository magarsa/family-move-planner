import { motion } from 'framer-motion'

interface Props {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  color: string // tailwind color class for the ring stroke (e.g., "text-teal-500")
  trackColor?: string
  label: string
  value: string
  subtitle?: string
}

export default function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  color,
  trackColor = 'text-stone-100 dark:text-stone-700',
  label,
  value,
  subtitle,
}: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={`stroke-current ${trackColor}`}
          />
          {/* Progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={`stroke-current ${color}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-stone-900 dark:text-stone-100">{value}</span>
          {subtitle && <span className="text-[10px] text-stone-400 dark:text-stone-500">{subtitle}</span>}
        </div>
      </div>
      <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">{label}</span>
    </div>
  )
}

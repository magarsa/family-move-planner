import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, GitBranch, HelpCircle,
  BookOpen, User2, LogOut, Sun, Moon, Home, GraduationCap, Users, ChevronDown,
} from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { useTheme } from '../hooks/useTheme'
import { motion, AnimatePresence } from 'framer-motion'

const navGroups = [
  {
    id: 'planning',
    label: 'Planning',
    items: [
      { to: '/todos',    label: 'To-Do List', icon: CheckSquare },
      { to: '/branches', label: 'Decisions',  icon: GitBranch },
      { to: '/whatifs',  label: 'What-Ifs',   icon: HelpCircle },
    ],
  },
  {
    id: 'realestate',
    label: 'Real Estate',
    items: [
      { to: '/properties', label: 'Properties', icon: Home },
      { to: '/schools',    label: 'Schools',    icon: GraduationCap },
      { to: '/contacts',   label: 'Contacts',   icon: Users },
    ],
  },
  {
    id: 'notes',
    label: 'Notes & Info',
    items: [
      { to: '/notes',   label: 'Journal',     icon: BookOpen },
      { to: '/profile', label: 'Our Profile', icon: User2 },
    ],
  },
]

const STORAGE_KEY = 'fmp_nav_collapsed'

function getInitialCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function Sidebar() {
  const { userName, clearUser } = useUser()
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(getInitialCollapsed)

  function toggleGroup(id: string) {
    setCollapsed(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function isGroupActive(items: { to: string }[]) {
    return items.some(item => location.pathname === item.to)
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
    }`

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-stone-900 border-r border-stone-100 dark:border-stone-800">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏡</span>
          <div>
            <div className="font-serif font-semibold text-stone-900 dark:text-stone-100 leading-tight">
              Move Planner
            </div>
            <div className="text-xs text-stone-400 dark:text-stone-500">Des Moines → Charlotte</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {/* Dashboard — standalone */}
        <NavLink to="/" end className={navLinkClass}>
          {({ isActive }) => (
            <>
              <LayoutDashboard
                size={18}
                className={isActive ? 'text-teal-600 dark:text-teal-400' : 'text-stone-400 dark:text-stone-500'}
              />
              Dashboard
            </>
          )}
        </NavLink>

        {/* Grouped sections */}
        {navGroups.map(group => {
          const active = isGroupActive(group.items)
          // auto-expand if a child route is active, even if user has collapsed it
          const isCollapsed = !!collapsed[group.id] && !active

          return (
            <div key={group.id} className="mt-3">
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  active
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                }`}
              >
                <span>{group.label}</span>
                <motion.span
                  animate={{ rotate: isCollapsed ? -90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  <ChevronDown size={13} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-0.5 space-y-0.5">
                      {group.items.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} className={navLinkClass}>
                          {({ isActive }) => (
                            <>
                              <Icon
                                size={18}
                                className={isActive ? 'text-teal-600 dark:text-teal-400' : 'text-stone-400 dark:text-stone-500'}
                              />
                              {label}
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      {/* User badge */}
      <div className="px-3 pb-4 border-t border-stone-100 dark:border-stone-800 pt-4">
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-sm">
              {userName === 'Safal' ? '👨' : '👩'}
            </div>
            <div>
              <div className="text-sm font-medium text-stone-800 dark:text-stone-100">{userName}</div>
              <div className="text-xs text-stone-400 dark:text-stone-500">
                {userName === 'Safal' ? 'Husband' : 'Wife'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={clearUser}
              title="Switch user"
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <LogOut size={14} />
            </motion.button>
          </div>
        </div>
      </div>
    </aside>
  )
}

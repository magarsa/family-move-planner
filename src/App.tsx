import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './views/Login'
import Dashboard from './views/Dashboard'
import Todos from './views/Todos'
import Branches from './views/Branches'
import Whatifs from './views/Whatifs'
import Notes from './views/Notes'
import Profile from './views/Profile'
import Properties from './views/Properties'
import Schools from './views/Schools'
import Contacts from './views/Contacts'
import Selling from './views/Selling'
import HomePurchaseChecklist from './views/HomePurchaseChecklist'
import Reports from './views/Reports'
import Communications from './views/Communications'
import Deadlines from './views/Deadlines'
import HouseProfile from './views/HouseProfile'
import { useUser } from './hooks/useUser'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const { user, userName, authError, isDemoMode, loading } = useUser()
  useTheme()

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isDemoMode && (!user || !userName)) {
    return <Login authError={authError} />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/todos" element={<Todos />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/whatifs" element={<Whatifs />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/schools" element={<Schools />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/comms" element={<Communications />} />
        <Route path="/deadlines" element={<Deadlines />} />
        <Route path="/selling" element={<Selling />} />
        <Route path="/home-checklist" element={<HomePurchaseChecklist />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/house-profile" element={<HouseProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

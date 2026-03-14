import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import UserSetup from './components/UserSetup'
import Dashboard from './views/Dashboard'
import Todos from './views/Todos'
import Branches from './views/Branches'
import Whatifs from './views/Whatifs'
import Notes from './views/Notes'
import Profile from './views/Profile'
import Properties from './views/Properties'
import Schools from './views/Schools'
import { useUser } from './hooks/useUser'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const { userName, setUserName } = useUser()
  useTheme()

  if (!userName) {
    return <UserSetup onSelect={setUserName} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import EditProfilePage from './pages/EditProfilePage'
import TeamsPage from './pages/TeamsPage'
import TeamDetailPage from './pages/TeamDetailPage'
import MatchesPage from './pages/MatchesPage'
import MatchDetailPage from './pages/MatchDetailPage'
import CreateMatchPage from './pages/CreateMatchPage'
import RatingsPage from './pages/RatingsPage'
import AdminPage from './pages/admin/AdminPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-pitch-400 font-display tracking-widest animate-pulse">CARGANDO...</span></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Private */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/"               element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"      element={<DashboardPage />} />
        <Route path="/profile"        element={<ProfilePage />} />
        <Route path="/profile/edit"   element={<EditProfilePage />} />
        <Route path="/players/:id"    element={<ProfilePage />} />
        <Route path="/teams"          element={<TeamsPage />} />
        <Route path="/teams/:id"      element={<TeamDetailPage />} />
        <Route path="/matches"        element={<MatchesPage />} />
        <Route path="/matches/new"    element={<CreateMatchPage />} />
        <Route path="/matches/:id"    element={<MatchDetailPage />} />
        <Route path="/matches/:id/rate" element={<RatingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

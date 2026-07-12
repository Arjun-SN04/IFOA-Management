import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { useNotifications } from './context/NotificationContext'
import Layout from './components/layout/Layout'

import LandingPage from './pages/landing/LandingPage'
import Login from './pages/auth/Login'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProjectsPage from './pages/projects/ProjectsPage'
import ProjectDetailPage from './pages/projects/ProjectDetailPage'
import TasksPage from './pages/tasks/TasksPage'
import BacklogPage from './pages/tasks/BacklogPage'
import SprintsPage from './pages/sprints/SprintsPage'
import LeavesPage from './pages/leaves/LeavesPage'
import DailyTasksPage from './pages/daily-tasks/DailyTasksPage'
import AnnouncementsPage from './pages/announcements/AnnouncementsPage'
import ReportsPage from './pages/reports/ReportsPage'
import UsersPage from './pages/admin/UsersPage'
import TeamsPage from './pages/admin/TeamsPage'
import ProfilePage from './pages/profile/ProfilePage'

function AuthLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #3B82F6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ color: '#64748B', fontSize: 13, fontWeight: 500 }}>Loading…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Inject navigate into NotificationContext so announcement:new can redirect ──
function NavigateInjector() {
  const navigate = useNavigate()
  const { setNavigate } = useNotifications()
  useEffect(() => { setNavigate(navigate) }, [navigate, setNavigate])
  return null
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoader />
  if (!user) return <Navigate to="/" replace />
  return children
}

function EmployeeBoardRoute({ children }) {
  const { user, loading, isHR, isManagerOrAdmin } = useAuth()
  if (loading) return <AuthLoader />
  if (!user) return <Navigate to="/" replace />
  if (isHR || isManagerOrAdmin) return <Navigate to="/admin/teams" replace />
  return children
}

function HRRoute({ children }) {
  const { user, loading, isHROrAbove } = useAuth()
  if (loading) return <AuthLoader />
  if (!user) return <Navigate to="/" replace />
  if (!isHROrAbove) return <Navigate to="/dashboard" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <AuthLoader />
  if (!user) return <Navigate to="/" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Inject navigate into NotificationContext — must be inside BrowserRouter */}
      <NavigateInjector />
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="login"    element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="register" element={<Navigate to="/login" replace />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="dashboard"     element={<DashboardPage />} />
          <Route path="projects"      element={<ProjectsPage />} />
          <Route path="projects/:id"  element={<ProjectDetailPage />} />
          <Route path="sprints"       element={<SprintsPage />} />
          <Route path="leaves"        element={<LeavesPage />} />
          <Route path="daily-tasks"   element={<DailyTasksPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="profile"       element={<ProfilePage />} />

          <Route path="tasks"   element={<EmployeeBoardRoute><TasksPage /></EmployeeBoardRoute>} />
          <Route path="backlog" element={<EmployeeBoardRoute><BacklogPage /></EmployeeBoardRoute>} />

          <Route path="admin/teams"  element={<HRRoute><TeamsPage /></HRRoute>} />
          <Route path="reports"      element={<HRRoute><ReportsPage /></HRRoute>} />
          <Route path="admin/users"  element={<HRRoute><UsersPage /></HRRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'

// Landing
import LandingPage from './pages/landing/LandingPage'

// Auth pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// App pages
import DashboardPage from './pages/dashboard/DashboardPage'
import ProjectsPage from './pages/projects/ProjectsPage'
import ProjectDetailPage from './pages/projects/ProjectDetailPage'
import TasksPage from './pages/tasks/TasksPage'
import SprintsPage from './pages/sprints/SprintsPage'
import LeavesPage from './pages/leaves/LeavesPage'
import DailyTasksPage from './pages/daily-tasks/DailyTasksPage'
import AnnouncementsPage from './pages/announcements/AnnouncementsPage'
import ReportsPage from './pages/reports/ReportsPage'
import UsersPage from './pages/admin/UsersPage'
import TeamsPage from './pages/admin/TeamsPage'
import ProfilePage from './pages/profile/ProfilePage'

// Loading spinner shown while auth state is being resolved
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

// Route: any authenticated user
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoader />
  if (!user) return <Navigate to="/" replace />
  return children
}

// Route: Management + Admin only (managers + admins — not team_lead, not employee)
function ManagementRoute({ children }) {
  const { user, loading, isManagerOrAdmin } = useAuth()
  if (loading) return <AuthLoader />
  if (!user) return <Navigate to="/" replace />
  if (!isManagerOrAdmin) return <Navigate to="/dashboard" replace />
  return children
}

// Route: Admin only
function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <AuthLoader />
  if (!user) return <Navigate to="/" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

// Route: Guest only (not logged in)
function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route index element={<LandingPage />} />

        {/* Guest routes (unauthenticated only) */}
        <Route path="login"    element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="register" element={<GuestRoute><Register /></GuestRoute>} />

        {/* Protected app routes under layout */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* All authenticated users */}
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="projects"     element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="tasks"        element={<TasksPage />} />
          <Route path="sprints"      element={<SprintsPage />} />
          <Route path="leaves"       element={<LeavesPage />} />
          <Route path="daily-tasks"  element={<DailyTasksPage />} />
          <Route path="announcements"element={<AnnouncementsPage />} />
          <Route path="profile"      element={<ProfilePage />} />

          {/* Management + Admin: reports, teams */}
          <Route path="reports"      element={<ManagementRoute><ReportsPage /></ManagementRoute>} />
          <Route path="admin/teams"  element={<ManagementRoute><TeamsPage /></ManagementRoute>} />

          {/* Admin only: user management */}
          <Route path="admin/users"  element={<AdminRoute><UsersPage /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

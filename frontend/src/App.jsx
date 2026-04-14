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
import AnnouncementsPage from './pages/announcements/AnnouncementsPage'
import ReportsPage from './pages/reports/ReportsPage'
import UsersPage from './pages/admin/UsersPage'
import ProfilePage from './pages/profile/ProfilePage'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isManagerOrAdmin } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isManagerOrAdmin) return <Navigate to="/dashboard" replace />
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
      <Routes>
        {/* Public landing page — exact match only */}
        <Route index element={<LandingPage />} />

        {/* Guest routes */}
        <Route path="login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="register" element={<GuestRoute><Register /></GuestRoute>} />

        {/* Protected app routes under layout */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="sprints" element={<SprintsPage />} />
          <Route path="leaves" element={<LeavesPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="reports" element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />
          <Route path="admin/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="full-loader">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

export const AdminRoute = ({ children }) => {
  const { user, loading, isManagerOrAdmin } = useAuth();
  if (loading) return <div className="full-loader">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isManagerOrAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

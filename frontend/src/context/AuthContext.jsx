import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe()
        .then(res => setUser(res.data.data || res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const res = await authAPI.login(credentials);
    localStorage.setItem('token', res.data.token);
    const userData = res.data.data || res.data.user;
    setUser(userData);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // ── Role booleans ────────────────────────────────────────────────────────────
  const isAdmin    = user?.role === 'admin';
  const isManager  = user?.role === 'manager';  // Can create projects, teams, assign tasks
  const isHR       = user?.role === 'hr';        // Can view all, manage leaves — CANNOT create projects/teams
  const isTeamLead = user?.role === 'team_lead'; // Can assign tasks within their team
  const isEmployee = user?.role === 'employee';

  // Manager + Admin: full project/team management
  const isManagerOrAdmin = isAdmin || isManager;

  // HR + Manager + Admin: can view everything, manage leaves, manage users
  const isHROrAbove = isAdmin || isManager || isHR;

  // Team lead + HR + Manager + Admin: elevated task access
  const isTeamLeadOrAbove = isAdmin || isManager || isHR || isTeamLead;
  const isElevated = isTeamLeadOrAbove;

  // Role label for display
  const roleLabel = (() => {
    if (isAdmin)    return 'Admin';
    if (isManager)  return 'Manager';
    if (isHR)       return 'HR';
    if (isTeamLead) return 'Team Lead';
    return 'Employee';
  })();

  return (
    <AuthContext.Provider value={{
      user, setUser, login, logout, loading,
      isAdmin,
      isManager,
      isHR,
      isTeamLead,
      isEmployee,
      isManagerOrAdmin,      // admin + manager: can create projects & teams
      isHROrAbove,           // admin + manager + hr: can view all, manage leaves
      isTeamLeadOrAbove,     // everyone elevated
      isElevated,            // alias
      roleLabel,
      // Legacy aliases (so existing pages don't break)
      isManagement: isManager,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

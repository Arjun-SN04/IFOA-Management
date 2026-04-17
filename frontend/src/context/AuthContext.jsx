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

  // ---- Role booleans (internal DB roles) ----
  const isAdmin       = user?.role === 'admin';
  const isManagement  = user?.role === 'manager';   // displayed as "Management"
  const isTeamLead    = user?.role === 'team_lead'; // user with extra assignment powers
  const isUser        = user?.role === 'employee';  // displayed as "User"

  // Convenience groupings
  const isManagerOrAdmin    = isAdmin || isManagement;           // Management + Admin (no team_lead)
  const isTeamLeadOrAbove   = isAdmin || isManagement || isTeamLead; // Everyone elevated
  const isElevated          = isTeamLeadOrAbove;                 // Alias — can assign tasks

  // Role label for display
  const roleLabel = (() => {
    if (isAdmin)      return 'Admin';
    if (isManagement) return 'Management';
    if (isTeamLead)   return 'Team Lead';
    return 'User';
  })();

  return (
    <AuthContext.Provider value={{
      user, setUser, login, logout, loading,
      isAdmin,
      isManagement,   // = manager role
      isTeamLead,
      isUser,         // = employee role
      isManagerOrAdmin,      // management + admin
      isTeamLeadOrAbove,     // team_lead + management + admin
      isElevated,            // alias for isTeamLeadOrAbove
      roleLabel,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

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

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isManagerOrAdmin = isAdmin || isManager;

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, isAdmin, isManager, isManagerOrAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

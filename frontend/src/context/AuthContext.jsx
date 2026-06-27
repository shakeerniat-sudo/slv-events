import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure default base URL for Axios
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5050/api'
    : (window.location.hostname.includes('vercel.app')
        ? window.location.origin + '/backend/api'
        : 'https://slv-events-backend.onrender.com/api'));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsDemo(false);
  };

  // Set default auth headers if token exists
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Verify token and load user details on app load
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get('/auth/me');
        setUser(response.data.user);
        setIsDemo(response.data.isDemo);
      } catch (err) {
        console.error('Session restoration failed:', err);
        // Clean session if invalid
        logout();
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser, isDemo: demoStatus } = response.data;
      
      localStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      setIsDemo(demoStatus);
      return receivedUser;
    } catch (err) {
      throw err.response?.data?.message || 'Login failed due to a network or server issue';
    }
  };

  // Helper to check role permissions
  const hasRole = (roles) => {
    return user && roles.includes(user.role);
  };

  const value = {
    user,
    token,
    loading,
    isDemo,
    login,
    logout,
    hasRole,
    isAdmin: user?.role === 'Admin',
    isCoordinator: user?.role === 'Vendor Coordinator' || user?.role === 'Admin',
    isOps: user?.role === 'Operations Lead' || user?.role === 'Admin',
    isFinance: user?.role === 'Finance Team' || user?.role === 'Admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const res = await api.get('/auth/me');
            if (res.data && res.data.role) {
              setUser(res.data);
              setUserType('user');
            } else if (res.data && res.data.username) {
              setUser({ username: res.data.username });
              setUserType('mainAdmin');
            } else {
              localStorage.removeItem('token');
              delete api.defaults.headers.common['Authorization'];
            }
          } catch (error) {
            console.log('Auth check failed, clearing token:', error.message);
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
          }
        }
      } catch (error) {
        console.log('Auth initialization error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginMainAdmin = async (username, password) => {
    const res = await api.post('/auth/main-admin/login', { username, password });
    localStorage.setItem('token', res.data.token);
    setUser({ username });
    setUserType('mainAdmin');
    return res.data;
  };

  const loginUser = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    setUserType('user');
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setUserType(null);
  };

  return (
    <AuthContext.Provider value={{ user, userType, loading, loginMainAdmin, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

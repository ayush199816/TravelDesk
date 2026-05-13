import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/api/auth/me')
        .then(res => {
          if (res.data.role) {
            setUser(res.data);
            setUserType('user');
          } else {
            setUser({ username: res.data.username });
            setUserType('mainAdmin');
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginMainAdmin = async (username, password) => {
    const res = await api.post('/api/auth/main-admin/login', { username, password });
    localStorage.setItem('token', res.data.token);
    setUser({ username });
    setUserType('mainAdmin');
    return res.data;
  };

  const loginUser = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
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

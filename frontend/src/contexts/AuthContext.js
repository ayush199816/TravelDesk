import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/auth/me')
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
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginMainAdmin = async (username, password) => {
    const res = await axios.post('/api/auth/main-admin/login', { username, password });
    localStorage.setItem('token', res.data.token);
    setUser({ username });
    setUserType('mainAdmin');
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    return res.data;
  };

  const loginUser = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    setUserType('user');
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setUserType(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, userType, loading, loginMainAdmin, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

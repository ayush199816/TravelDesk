import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, userType, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to={userType === 'user' ? '/org-login' : '/'} />;
  }

  if (requiredRole && ((userType === 'user' && user.role !== requiredRole) || userType !== 'mainAdmin')) {
    return <div>Access denied</div>;
  }

  return children;
};

export default ProtectedRoute;

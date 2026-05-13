import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const RoleBasedRoute = ({ children, allowedRoles, fallbackPath = '/dashboard' }) => {
  const { user } = React.useContext(AuthContext);

  console.log('🔍 DEBUG - RoleBasedRoute Check:', {
    user: user ? { id: user._id, name: user.name, role: user.role } : null,
    allowedRoles,
    hasAccess: user ? allowedRoles.includes(user.role) : false
  });

  if (!user) {
    console.log('🔍 DEBUG - No user found, redirecting to login');
    return <Navigate to="/org-login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    console.log('🔍 DEBUG - User role not allowed, redirecting to fallback:', fallbackPath);
    return <Navigate to={fallbackPath} />;
  }

  console.log('🔍 DEBUG - Access granted, rendering children');
  return children;
};

export default RoleBasedRoute;

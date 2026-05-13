import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredUserType }) => {
  const { user, userType, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={userType === 'user' ? '/org-login' : '/'} />;
  }

  if (requiredUserType && userType !== requiredUserType) {
    return <div>Access denied. Required user type: {requiredUserType}</div>;
  }

  return children;
};

export default ProtectedRoute;

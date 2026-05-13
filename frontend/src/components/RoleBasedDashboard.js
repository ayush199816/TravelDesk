import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import OperationsDashboard from '../pages/OperationsDashboard';
import SalesDashboard from '../pages/SalesDashboard';
import ManagerDashboard from '../pages/ManagerDashboard';
import UserDashboard from '../pages/UserDashboard';

const RoleBasedDashboard = () => {
  const { user } = useContext(AuthContext);

  switch (user?.role) {
    case 'operations':
      return <OperationsDashboard />;
    case 'sales':
      return <SalesDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    default:
      return <UserDashboard />;
  }
};

export default RoleBasedDashboard;

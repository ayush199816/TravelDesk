import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainAdminLogin from './pages/MainAdminLogin';
import OrgLogin from './pages/OrgLogin';
import MainAdminDashboard from './pages/MainAdminDashboard';
import OrgAdminDashboard from './pages/OrgAdminDashboard';
import RoleBasedDashboard from './components/RoleBasedDashboard';
import LeadDetailPage from './pages/LeadDetailPage';
import QuoteTemplateManager from './pages/QuoteTemplateManager';
import InvoiceListPageSimple from './pages/InvoiceListPageSimple';
import SupplierManagementPage from './pages/SupplierManagementPage';
import SupplierDetailsPage from './pages/SupplierDetailsPage';
import CalendarPage from './pages/CalendarPage';
import RoleBasedRoute from './components/RoleBasedRoute';
import ManagerHotelsPage from './pages/ManagerHotelsPage';
import ManagerSightseeingPage from './pages/ManagerSightseeingPage';
import ManagerTransfersPage from './pages/ManagerTransfersPage';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainAdminLogin />} />
          <Route path="/org-login" element={<OrgLogin />} />
          <Route path="/admin-dashboard" element={<ProtectedRoute requiredUserType="mainAdmin"><MainAdminDashboard /></ProtectedRoute>} />
          <Route path="/org-admin-dashboard" element={<ProtectedRoute requiredUserType="user"><OrgAdminDashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute requiredUserType="user"><RoleBasedDashboard /></ProtectedRoute>} />
          <Route path="/lead/:leadNumber" element={<ProtectedRoute requiredUserType="user"><LeadDetailPage /></ProtectedRoute>} />
          <Route path="/quote-templates" element={<ProtectedRoute requiredUserType="user"><QuoteTemplateManager /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute requiredUserType="user"><InvoiceListPageSimple /></ProtectedRoute>} />
        <Route path="/suppliers" element={
            <ProtectedRoute requiredUserType="user">
              <RoleBasedRoute allowedRoles={['organization_admin', 'manager', 'operations']}>
                <SupplierManagementPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />
          <Route path="/supplier/:supplierId" element={
            <ProtectedRoute requiredUserType="user">
              <RoleBasedRoute allowedRoles={['organization_admin', 'manager', 'operations']}>
                <SupplierDetailsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute requiredUserType="user">
              <RoleBasedRoute allowedRoles={['organization_admin', 'manager', 'operations', 'accounts']}>
                <CalendarPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />
          <Route path="/manager/hotels" element={
            <ProtectedRoute requiredUserType="user">
              <RoleBasedRoute allowedRoles={['organization_admin', 'manager', 'operations']}>
                <ManagerHotelsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />
          <Route path="/manager/sightseeing" element={
            <ProtectedRoute requiredUserType="user">
              <RoleBasedRoute allowedRoles={['organization_admin', 'manager', 'operations']}>
                <ManagerSightseeingPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />
          <Route path="/manager/transfers" element={
            <ProtectedRoute requiredUserType="user">
              <RoleBasedRoute allowedRoles={['organization_admin', 'manager', 'operations']}>
                <ManagerTransfersPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

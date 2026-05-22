import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import MainAdminLogin from './pages/MainAdminLogin';
import OrgLogin from './pages/OrgLogin';
import MainAdminDashboard from './pages/MainAdminDashboard';
import OrgAdminDashboard from './pages/OrgAdminDashboard';
import RoleBasedDashboard from './components/RoleBasedDashboard';
import LeadDetailPage from './pages/LeadDetailPage';
import QuoteTemplateManager from './pages/QuoteTemplateManager';
import InvoiceListPageSimple from './pages/InvoiceListPageSimple';
import SupplierManagementPage from './pages/SupplierManagementPage';
import CalendarPage from './pages/CalendarPage';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/org-login" element={<OrgLogin />} />
          <Route path="/admin-login" element={<MainAdminLogin />} />
          <Route path="/admin-dashboard" element={<ProtectedRoute requiredUserType="mainAdmin"><MainAdminDashboard /></ProtectedRoute>} />
          <Route path="/org-admin-dashboard" element={<ProtectedRoute requiredUserType="user"><OrgAdminDashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute requiredUserType="user"><RoleBasedDashboard /></ProtectedRoute>} />
          <Route path="/lead/:leadNumber" element={<ProtectedRoute requiredUserType="user"><LeadDetailPage /></ProtectedRoute>} />
          <Route path="/quote-templates" element={<ProtectedRoute requiredUserType="user"><QuoteTemplateManager /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute requiredUserType="user"><InvoiceListPageSimple /></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute requiredUserType="user"><SupplierManagementPage /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute requiredUserType="user"><CalendarPage /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../contexts/AuthContext';
import SimpleTemplateManager from './SimpleTemplateManager';

const OrgAdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('manager');
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  
  // Organization settings state
  const [organizationData, setOrganizationData] = useState(null);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'settings'
  const [editingStatuses, setEditingStatuses] = useState(false);
  const [tempStatuses, setTempStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  const [editingCurrency, setEditingCurrency] = useState(false);
  const [tempCurrency, setTempCurrency] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users');
    }
  };

  const fetchOrganizationData = useCallback(async () => {
    try {
      console.log('=== FETCH DEBUG ===');
      console.log('User object:', user);
      console.log('User role:', user?.role);
      console.log('User organization:', user?.organization);
      console.log('User organization ID:', user?.organization?._id);
      console.log('Fetching organization data for:', user.organization._id);
      
      const response = await api.get(`/organizations/${user.organization._id}`);
      setOrganizationData(response.data);
      console.log('Organization data fetched:', response.data);
      
      // Fetch lead statuses
      const statusesResponse = await api.get(`/organizations/${user.organization._id}/lead-statuses`);
      setLeadStatuses(statusesResponse.data);
      console.log('Lead statuses fetched:', statusesResponse.data);
      console.log('=== END FETCH DEBUG ===');
    } catch (error) {
      console.error('Error fetching organization data:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
    fetchOrganizationData();
  }, [fetchOrganizationData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/users', { name, email, password, phone, role });
      alert('User added');
      fetchUsers();
    } catch (err) {
      alert('Error adding user');
    }
  };

  const handleEdit = (u) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditPassword('');
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/auth/users/${editingUser._id}`, { role: editRole, password: editPassword });
      alert('User updated');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert('Error updating user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      alert('User deleted');
      fetchUsers();
    } catch (err) {
      alert('Error deleting user');
    }
  };

  // Organization settings functions
  const startEditingStatuses = () => {
    setTempStatuses([...leadStatuses]);
    setEditingStatuses(true);
  };

  const cancelEditingStatuses = () => {
    setEditingStatuses(false);
    setTempStatuses([]);
    setNewStatus('');
  };

  const addStatus = () => {
    if (newStatus.trim() && !tempStatuses.includes(newStatus.trim().toLowerCase().replace(/\s+/g, '_'))) {
      setTempStatuses([...tempStatuses, newStatus.trim().toLowerCase().replace(/\s+/g, '_')]);
      setNewStatus('');
    }
  };

  const removeStatus = (statusToRemove) => {
    if (tempStatuses.length > 1) { // Keep at least one status
      setTempStatuses(tempStatuses.filter(status => status !== statusToRemove));
    } else {
      alert('You must have at least one lead status.');
    }
  };

  const saveStatuses = async () => {
    try {
      console.log('=== FRONTEND SAVE DEBUG ===');
      console.log('Saving lead statuses...');
      console.log('User object:', user);
      console.log('User organization ID:', user.organization._id);
      console.log('User role:', user.role);
      console.log('Temp statuses:', tempStatuses);
      console.log('Request URL:', `/api/organizations/${user.organization._id}`);
      console.log('Request data:', { leadStatuses: tempStatuses });
      
      const response = await api.put(`/organizations/${user.organization._id}`, {
        leadStatuses: tempStatuses
      });
      console.log('Save response:', response.data);
      console.log('=== END FRONTEND DEBUG ===');
      
      setLeadStatuses(tempStatuses);
      setEditingStatuses(false);
      setTempStatuses([]);
      setNewStatus('');
      alert('Lead statuses updated successfully!');
      fetchOrganizationData(); // Refresh data
    } catch (error) {
      console.error('=== FRONTEND ERROR DEBUG ===');
      console.error('Error saving lead statuses:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      console.error('Full error object:', error);
      console.error('=== END FRONTEND ERROR DEBUG ===');
      alert('Error saving lead statuses: ' + (error.response?.data?.message || error.message));
    }
  };

  const startEditingCurrency = () => {
    setTempCurrency(organizationData?.currency || 'USD');
    setEditingCurrency(true);
  };

  const cancelEditingCurrency = () => {
    setEditingCurrency(false);
    setTempCurrency('');
  };

  const saveCurrency = async () => {
    try {
      console.log('Saving currency...');
      console.log('User organization ID:', user.organization._id);
      console.log('User role:', user.role);
      console.log('Temp currency:', tempCurrency);
      
      const response = await api.put(`/organizations/${user.organization._id}`, {
        currency: tempCurrency
      });
      console.log('Save response:', response.data);
      
      setOrganizationData({...organizationData, currency: tempCurrency});
      setEditingCurrency(false);
      setTempCurrency('');
      alert('Currency updated successfully!');
      fetchOrganizationData(); // Refresh data
    } catch (error) {
      console.error('Error saving currency:', error);
      console.error('Error response:', error.response?.data);
      alert('Error saving currency: ' + (error.response?.data?.message || error.message));
    }
  };

  if (user?.role !== 'organization_admin') return <div>Access denied</div>;

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f0f2f5',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
    },
    tabs: {
      display: 'flex',
      marginBottom: '30px',
      borderBottom: '2px solid #e9ecef',
    },
    tab: {
      padding: '12px 24px',
      cursor: 'pointer',
      border: 'none',
      backgroundColor: 'transparent',
      fontSize: '16px',
      fontWeight: '500',
      color: '#6c757d',
      borderBottom: '2px solid transparent',
      transition: 'all 0.3s ease',
    },
    activeTab: {
      color: '#007bff',
      borderBottom: '2px solid #007bff',
    },
    tabContent: {
      background: 'white',
      padding: '30px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    },
    editButton: {
      padding: '8px 16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      marginBottom: '15px',
    },
    statusInput: {
      display: 'flex',
      gap: '10px',
      marginBottom: '15px',
    },
    statusList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      marginBottom: '15px',
    },
    statusItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: '#28a745',
      color: 'white',
      borderRadius: '20px',
      fontSize: '14px',
    },
    removeButton: {
      background: 'none',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      fontSize: '16px',
      padding: '0',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtons: {
      display: 'flex',
      gap: '10px',
      marginTop: '15px',
    },
    saveButton: {
      padding: '8px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    cancelButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    title: {
      textAlign: 'center',
      marginBottom: '30px',
      color: '#333',
    },
    form: {
      background: 'white',
      padding: '30px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      marginBottom: '40px',
      maxWidth: '600px',
      margin: '0 auto 40px',
    },
    input: {
      width: '100%',
      padding: '12px',
      margin: '10px 0',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '16px',
    },
    select: {
      width: '100%',
      padding: '12px',
      margin: '10px 0',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '16px',
    },
    button: {
      padding: '12px 20px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      fontSize: '16px',
      cursor: 'pointer',
      margin: '5px',
    },
    usersList: {
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      maxWidth: '800px',
      margin: '0 auto',
    },
    usersTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    usersTh: {
      backgroundColor: '#4a90d9',
      color: 'white',
      padding: '16px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '14px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    usersTd: {
      padding: '16px',
      borderBottom: '1px solid #e9ecef',
      color: '#495057',
      fontSize: '14px'
    },
    editForm: {
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      marginTop: '20px',
      maxWidth: '600px',
      margin: '20px auto',
    },
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={styles.title}>Organization Admin Dashboard</h2>
          <div style={{fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '5px'}}>{user?.organization?.name || 'Organization'}</div>
        </div>
        <button onClick={handleLogout} style={{ ...styles.button, backgroundColor: '#dc3545' }}>Logout</button>
      </div>
      
      {/* Tab Navigation */}
      <div style={styles.tabs}>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'users' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'organization' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('organization')}
        >
          Organization
        </button>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'templates' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('templates')}
        >
          PDF Templates
        </button>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'quote-templates' ? styles.activeTab : {}) }}
          onClick={() => navigate('/quote-templates')}
        >
          Quote Templates
        </button>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'statuses' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('statuses')}
        >
          Lead Statuses
        </button>
      </div>
      
      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'users' && (
          <div>
            <h3 style={{marginBottom: '20px'}}>User Management</h3>
            <div style={styles.form}>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={styles.input}
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} style={styles.select}>
            <option value="manager">Manager</option>
            <option value="operations">Operations</option>
            <option value="sales">Sales</option>
            <option value="accounts">Accounts</option>
          </select>
          <button type="submit" style={styles.button}>Add User</button>
        </form>
      </div>
      <div style={styles.usersList}>
        <h3>Users</h3>
        <table style={styles.usersTable}>
          <thead>
            <tr>
              <th style={styles.usersTh}>Name</th>
              <th style={styles.usersTh}>Email</th>
              <th style={styles.usersTh}>Phone</th>
              <th style={styles.usersTh}>Role</th>
              <th style={styles.usersTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(users) && users.map(u => (
              <tr key={u._id}>
                <td style={styles.usersTd}>{u.name}</td>
                <td style={styles.usersTd}>{u.email}</td>
                <td style={styles.usersTd}>{u.phone}</td>
                <td style={styles.usersTd}>{u.role}</td>
                <td style={styles.usersTd}>
                  <button onClick={() => handleEdit(u)} style={{ ...styles.button, backgroundColor: '#ffc107' }}>Edit</button>
                  <button onClick={() => handleDelete(u._id)} style={{ ...styles.button, backgroundColor: '#dc3545' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingUser && (
        <div style={styles.editForm}>
          <h4>Edit User: {editingUser.name}</h4>
          <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={styles.select}>
            <option value="organization_admin">Organization Admin</option>
            <option value="manager">Manager</option>
            <option value="operations">Operations</option>
            <option value="sales">Sales</option>
            <option value="accounts">Accounts</option>
          </select>
          <input
            type="password"
            placeholder="New Password (leave blank to keep)"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            style={styles.input}
          />
          <button onClick={handleUpdate} style={styles.button}>Update</button>
          <button onClick={() => setEditingUser(null)} style={{ ...styles.button, backgroundColor: '#6c757d' }}>Cancel</button>
        </div>
      )}
        </div>
      )}
        
        {activeTab === 'settings' && (
          <div>
            <h3 style={{marginBottom: '30px', fontSize: '24px', fontWeight: '600', color: '#333'}}>Organization Settings</h3>
            
            {/* Currency Setting */}
            <div style={{marginBottom: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                <h4 style={{fontSize: '18px', fontWeight: '600', color: '#495057', margin: 0}}>Currency Settings</h4>
                {!editingCurrency && (
                  <button style={styles.editButton} onClick={startEditingCurrency}>
                    Edit Currency
                  </button>
                )}
              </div>
              
              {editingCurrency ? (
                <div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px'}}>
                    <label style={{fontWeight: '500', color: '#333'}}>Default Currency:</label>
                    <select 
                      value={tempCurrency} 
                      onChange={(e) => setTempCurrency(e.target.value)}
                      style={{padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px'}}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="SGD">SGD - Singapore Dollar</option>
                      <option value="THB">THB - Thai Baht</option>
                      <option value="MYR">MYR - Malaysian Ringgit</option>
                      <option value="IDR">IDR - Indonesian Rupiah</option>
                      <option value="PHP">PHP - Philippine Peso</option>
                      <option value="VND">VND - Vietnamese Dong</option>
                      <option value="HKD">HKD - Hong Kong Dollar</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="CNY">CNY - Chinese Yuan</option>
                      <option value="KRW">KRW - South Korean Won</option>
                    </select>
                  </div>
                  <div style={styles.actionButtons}>
                    <button style={styles.saveButton} onClick={saveCurrency}>
                      Save Currency
                    </button>
                    <button style={styles.cancelButton} onClick={cancelEditingCurrency}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <label style={{fontWeight: '500', color: '#333'}}>Default Currency:</label>
                    <span style={{padding: '8px 16px', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', fontWeight: '500'}}>
                      {organizationData?.currency || 'USD'}
                    </span>
                  </div>
                  <p style={{marginTop: '10px', fontSize: '14px', color: '#6c757d'}}>This currency is used throughout the dashboard for all pricing and financial data.</p>
                </div>
              )}
            </div>
            
            {/* Organization Info */}
            <div style={{marginTop: '40px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px'}}>
              <h4 style={{marginBottom: '15px', fontSize: '18px', fontWeight: '600', color: '#495057'}}>Organization Information</h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px'}}>
                <div>
                  <strong style={{color: '#333'}}>Organization Name:</strong>
                  <p style={{margin: '5px 0', color: '#495057'}}>{organizationData?.name || 'N/A'}</p>
                </div>
                <div>
                  <strong style={{color: '#333'}}>Phone:</strong>
                  <p style={{margin: '5px 0', color: '#495057'}}>{organizationData?.phone || 'N/A'}</p>
                </div>
                <div>
                  <strong style={{color: '#333'}}>Address:</strong>
                  <p style={{margin: '5px 0', color: '#495057'}}>{organizationData?.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'templates' && (
        <SimpleTemplateManager user={user} />
      )}  
        
        {activeTab === 'statuses' && (
          <div>
            <h3 style={{marginBottom: '20px'}}>Lead Status Management</h3>
            
            {/* Lead Statuses Setting */}
            <div style={{padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                <h4 style={{fontSize: '18px', fontWeight: '600', color: '#495057', margin: 0}}>Lead Statuses</h4>
                {!editingStatuses && (
                  <button style={styles.editButton} onClick={startEditingStatuses}>
                    Edit Statuses
                  </button>
                )}
              </div>
              
              {editingStatuses ? (
                <div>
                  <div style={styles.statusInput}>
                    <input
                      type="text"
                      placeholder="Enter new status name"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addStatus()}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    <button 
                      onClick={addStatus}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Add Status
                    </button>
                  </div>
                  
                  <div style={styles.statusList}>
                    {Array.isArray(tempStatuses) && tempStatuses.map(status => (
                      <div key={status} style={styles.statusItem}>
                        <span>{status}</span>
                        <button 
                          onClick={() => removeStatus(status)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{marginTop: '15px'}}>
                    <button 
                      onClick={saveStatuses}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '10px'
                      }}
                    >
                      Save Statuses
                    </button>
                    <button 
                      onClick={cancelEditingStatuses}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px'}}>
                    {Array.isArray(leadStatuses) && leadStatuses.map(status => (
                      <span key={status} style={{
                        padding: '6px 12px', 
                        backgroundColor: '#28a745', 
                        color: 'white', 
                        borderRadius: '20px', 
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                  <p style={{fontSize: '14px', color: '#6c757d'}}>These lead statuses are available for selection in lead management by Operations and Sales users.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgAdminDashboard;

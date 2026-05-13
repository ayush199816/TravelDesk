import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../contexts/AuthContext';

const MainAdminDashboard = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [organizations, setOrganizations] = useState([]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  const fetchOrganizations = async () => {
    try {
      const res = await api.get('/auth/organizations');
      console.log('Organizations response:', res.data);
      setOrganizations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setOrganizations([]);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/organizations', { name, logo, address, phone, adminUsername, adminPassword });
      alert('Organization created');
      fetchOrganizations();
    } catch (err) {
      alert('Error creating organization');
    }
  };

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f0f2f5',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
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
    button: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      fontSize: '16px',
      cursor: 'pointer',
      margin: '10px 0',
    },
    orgsTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    orgsTh: {
      backgroundColor: '#4a90d9',
      color: 'white',
      padding: '16px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '14px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    orgsTd: {
      padding: '16px',
      borderBottom: '1px solid #e9ecef',
      color: '#495057',
      fontSize: '14px'
    },
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={styles.title}>Main Admin Dashboard</h2>
        <button onClick={handleLogout} style={{ ...styles.button, backgroundColor: '#dc3545' }}>Logout</button>
      </div>
      <div style={styles.form}>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Organization Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="file"
            onChange={handleLogoChange}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
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
          <input
            type="text"
            placeholder="Admin Username"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Admin Password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button}>Create Organization</button>
        </form>
      </div>
      <h3 style={{ textAlign: 'center', color: '#333' }}>All Organizations</h3>
      <table style={styles.orgsTable}>
        <thead>
          <tr>
            <th style={styles.orgsTh}>Name</th>
            <th style={styles.orgsTh}>Address</th>
            <th style={styles.orgsTh}>Phone</th>
            <th style={styles.orgsTh}>Created By</th>
            <th style={styles.orgsTh}>Users</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(organizations) && organizations.map(org => (
            <tr key={org._id}>
              <td style={styles.orgsTd}>{org.name}</td>
              <td style={styles.orgsTd}>{org.address}</td>
              <td style={styles.orgsTd}>{org.phone}</td>
              <td style={styles.orgsTd}>{org.createdBy?.username}</td>
              <td style={styles.orgsTd}>{org.users.map(user => `${user.name} (${user.role})`).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MainAdminDashboard;

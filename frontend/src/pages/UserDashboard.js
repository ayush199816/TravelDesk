import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const UserDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const styles = {
    container: {
      height: '100vh',
      backgroundColor: '#f0f2f5',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    },
    nav: {
      backgroundColor: '#fff',
      padding: '15px 20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
    },
    welcome: {
      fontSize: '18px',
      color: '#333',
      margin: 0,
    },
    menuButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '5px',
      borderRadius: '50%',
      backgroundColor: '#f0f0f0',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdown: {
      position: 'absolute',
      top: '60px',
      right: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      padding: '15px',
      minWidth: '200px',
      zIndex: 1000,
      display: menuOpen ? 'block' : 'none',
    },
    userInfo: {
      marginBottom: '10px',
      fontSize: '16px',
      color: '#666',
    },
    logoutButton: {
      padding: '8px 16px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      width: '100%',
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
    },
    card: {
      background: 'white',
      padding: '40px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      textAlign: 'center',
      maxWidth: '500px',
    },
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.welcome}>Welcome to {user?.organization?.name}</h1>
        <button style={styles.menuButton} onClick={toggleMenu}>👤</button>
        <div style={styles.dropdown}>
          <div style={styles.userInfo}>
            <p>Hello, {user?.name}</p>
            <p>Role: {user?.role}</p>
          </div>
          <button style={styles.logoutButton} onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <div style={styles.mainContent}>
        <div style={styles.card}>
          <p>Welcome to your dashboard!</p>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;

import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const MainAdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { loginMainAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await loginMainAdmin(username, password);
      navigate('/admin-dashboard');
    } catch (err) {
      alert(err.response?.data || err.message);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f0f2f5',
      fontFamily: 'Arial, sans-serif',
    },
    form: {
      background: 'white',
      padding: '40px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '400px',
    },
    title: {
      textAlign: 'center',
      marginBottom: '30px',
      color: '#333',
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
      margin: '20px 0',
    },
    link: {
      display: 'block',
      textAlign: 'center',
      color: '#007bff',
      textDecoration: 'none',
      marginTop: '20px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.form}>
        <h2 style={styles.title}>Main Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
          <button type="submit" style={styles.button}>Login</button>
        </form>
        <a href="/org-login" style={styles.link}>Organization Login</a>
      </div>
    </div>
  );
};

export default MainAdminLogin;

import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [lastCount, setLastCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notificationsRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count')
      ]);

      const newNotifications = notificationsRes.data;
      const newCount = countRes.data.count;

      setNotifications(newNotifications);
      setUnreadCount(newCount);

      // Show popup toast for new unread notifications
      if (newCount > lastCount && lastCount > 0) {
        const newest = newNotifications[0];
        if (newest) {
          showPopup(newest);
        }
      }
      setLastCount(newCount);
    } catch (error) {
      // Silent fail
    }
  }, [lastCount]);

  const showPopup = (notification) => {
    // Create a simple toast popup
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a1a2e;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 9999;
      max-width: 320px;
      font-family: 'Segoe UI', sans-serif;
      animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${notification.title}</div>
      <div style="font-size: 14px; opacity: 0.9;">${notification.message}</div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Silent fail
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          position: 'relative',
          color: '#333'
        }}
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#dc3545',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '11px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '0',
          width: '320px',
          maxHeight: '400px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>Notifications</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6c757d',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.color = '#495057';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = '#6c757d';
                }}
              >
                ×
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6c757d',
                fontSize: '14px'
              }}>
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification._id}
                  onClick={() => markAsRead(notification._id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f3f5',
                    cursor: 'pointer',
                    background: notification.isRead ? 'white' : '#f8f9ff',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    fontWeight: notification.isRead ? '500' : '600',
                    fontSize: '13px',
                    marginBottom: '4px',
                    color: '#1a1a2e'
                  }}>
                    {notification.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    lineHeight: '1.4'
                  }}>
                    {notification.message}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#adb5bd',
                    marginTop: '6px'
                  }}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default NotificationBell;

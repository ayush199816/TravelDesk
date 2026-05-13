import React, { useState } from 'react';
import api from '../api/axios';

const QuoteConversionButtonSimple = ({ quote, onConverted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleConvert = async () => {
    if (!window.confirm('Are you sure you want to mark this quote as converted? This will enable invoice creation.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/quotes/${quote._id}/convert`, {});

      setSuccess('Quote marked as converted successfully!');
      if (onConverted) {
        onConverted(response.data.quote);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error converting quote');
    } finally {
      setLoading(false);
    }
  };

  if (quote.isConverted) {
    return (
      <div style={{
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '8px',
        padding: '15px',
        display: 'flex',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <span style={{ fontSize: '20px', marginRight: '10px' }}>✅</span>
        <div>
          <strong style={{ color: '#155724' }}>Quote Converted</strong>
          <br />
          <small style={{ color: '#155724' }}>
            Converted on {new Date(quote.convertedAt).toLocaleDateString()} by {quote.convertedBy?.name}
          </small>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '15px',
          color: '#721c24'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '15px',
          color: '#155724'
        }}>
          {success}
        </div>
      )}
      
      <button 
        style={{
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '16px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={handleConvert}
        disabled={loading}
      >
        {loading ? (
          <>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #ffffff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginRight: '8px'
            }}></div>
            Converting...
          </>
        ) : (
          <>
            <span style={{ marginRight: '8px' }}>🔄</span>
            Mark Quote as Converted
          </>
        )}
      </button>
    </div>
  );
};

export default QuoteConversionButtonSimple;

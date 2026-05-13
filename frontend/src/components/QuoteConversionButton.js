import React, { useState } from 'react';
import api from '../api/axios';
import { Button, Alert, Spinner } from 'react-bootstrap';

const QuoteConversionButton = ({ quote, onConverted }) => {
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
      <Alert variant="success" className="d-flex align-items-center">
        <i className="bi bi-check-circle-fill me-2"></i>
        <div>
          <strong>Quote Converted</strong>
          <br />
          <small>Converted on {new Date(quote.convertedAt).toLocaleDateString()} by {quote.convertedBy?.name}</small>
        </div>
      </Alert>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Button 
        variant="success" 
        onClick={handleConvert}
        disabled={loading}
        className="w-100"
      >
        {loading ? (
          <>
            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            <span className="ms-2">Converting...</span>
          </>
        ) : (
          <>
            <i className="bi bi-arrow-repeat me-2"></i>
            Mark Quote as Converted
          </>
        )}
      </Button>
    </div>
  );
};

export default QuoteConversionButton;

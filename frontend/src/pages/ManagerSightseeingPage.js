import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Button, Form, Table, Modal, Alert, Spinner } from 'react-bootstrap';

const ManagerSightseeingPage = () => {
  const [sightseeings, setSightseeings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSightseeing, setEditingSightseeing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    whatToBring: '',
    whatIsIncluded: '',
    whatIsExcluded: '',
    rate: '',
    childRate: '',
    currency: 'USD',
    duration: '',
    location: '',
    country: ''
  });
  const [error, setError] =('');
  const [success, setSuccess] =('');

  useEffect(() => {
    fetchSightseeings();
  }, []);

  const fetchSightseeings = async () => {
    try {
      const response = await api.get('/sightseeings');
      setSightseeings(response.data);
    } catch (error) {
      setError('Error fetching sightseeings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        whatToBring: formData.whatToBring.split('\n').filter(item => item.trim()),
        whatIsIncluded: formData.whatIsIncluded.split('\n').filter(item => item.trim()),
        whatIsExcluded: formData.whatIsExcluded.split('\n').filter(item => item.trim()),
        rate: parseFloat(formData.rate),
        childRate: parseFloat(formData.childRate) || 0
      };

      if (editingSightseeing) {
        await api.put(`/sightseeings/${editingSightseeing._id}`, data);
        setSuccess('Sightseeing updated successfully!');
      } else {
        await api.post('/sightseeings', data);
        setSuccess('Sightseeing added successfully!');
      }

      setShowModal(false);
      setEditingSightseeing(null);
      resetForm();
      fetchSightseeings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Error saving sightseeing: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (sightseeing) => {
    setEditingSightseeing(sightseeing);
    setFormData({
      name: sightseeing.name,
      description: sightseeing.description,
      whatToBring: sightseeing.whatToBring?.join('\n') || '',
      whatIsIncluded: sightseeing.whatIsIncluded?.join('\n') || '',
      whatIsExcluded: sightseeing.whatIsExcluded?.join('\n') || '',
      rate: sightseeing.rate,
      childRate: sightseeing.childRate,
      currency: sightseeing.currency,
      duration: sightseeing.duration,
      location: sightseeing.location,
      country: sightseeing.country
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this sightseeing?')) {
      try {
        await api.delete(`/sightseeings/${id}`);
        setSuccess('Sightseeing deleted successfully!');
        fetchSightseeings();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError('Error deleting sightseeing');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      whatToBring: '',
      whatIsIncluded: '',
      whatIsExcluded: '',
      rate: '',
      childRate: '',
      currency: 'USD',
      duration: '',
      location: '',
      country: ''
    });
  };

  const handleAddNew = () => {
    setEditingSightseeing(null);
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}><Spinner animation="border" /></div>;
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Sightseeing Management</h2>
          <Button variant="primary" onClick={handleAddNew}>+ Add Sightseeing</Button>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Duration</th>
              <th>Rate (Adult)</th>
              <th>Rate (Child)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sightseeings.map(sightseeing => (
              <tr key={sightseeing._id}>
                <td>{sightseeing.name}</td>
                <td>{sightseeing.location}</td>
                <td>{sightseeing.duration || '-'}</td>
                <td>{sightseeing.currency} {sightseeing.rate}</td>
                <td>{sightseeing.currency} {sightseeing.childRate || 0}</td>
                <td>
                  <Button variant="info" size="sm" onClick={() => handleEdit(sightseeing)}>Edit</Button>{' '}
                  <Button variant="danger" size="sm" onClick={() => handleDelete(sightseeing._id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{editingSightseeing ? 'Edit Sightseeing' : 'Add New Sightseeing'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>What to Bring (one item per line)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.whatToBring}
                  onChange={(e) => setFormData({...formData, whatToBring: e.target.value})}
                  placeholder="Comfortable Clothing&#10;Comfortable Shoes&#10;Camera"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>What is Included (one item per line)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.whatIsIncluded}
                  onChange={(e) => setFormData({...formData, whatIsIncluded: e.target.value})}
                  placeholder="Transfers&#10;Big Buddha&#10;Guide"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>What is Excluded (one item per line)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.whatIsExcluded}
                  onChange={(e) => setFormData({...formData, whatIsExcluded: e.target.value})}
                  placeholder="Lunch&#10;Personal expenses&#10;Tips"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Location *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Country *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Duration</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  placeholder="2 hours, Half day, Full day"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Rate (Adult) *</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.rate}
                  onChange={(e) => setFormData({...formData, rate: e.target.value})}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Rate (Child)</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.childRate}
                  onChange={(e) => setFormData({...formData, childRate: e.target.value})}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Currency</Form.Label>
                <Form.Control
                  as="select"
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                >
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </Form.Control>
              </Form.Group>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">{editingSightseeing ? 'Update' : 'Add'}</Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default ManagerSightseeingPage;

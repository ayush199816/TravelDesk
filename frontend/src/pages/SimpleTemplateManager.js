import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const SimpleTemplateManager = ({ user }) => {
  const [predefinedTemplates, setPredefinedTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('templates');
  const [countryTemplates, setCountryTemplates] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    country: '',
    templateName: '',
    frontPageBackground: null,
    middlePageBackground: null,
    lastPageBackground: null
  });
  
  const [templateBackgrounds, setTemplateBackgrounds] = useState({});
  
  const handleTemplateBackgroundChange = (templateName, field, file) => {
    setTemplateBackgrounds(prev => ({
      ...prev,
      [templateName]: {
        ...prev[templateName],
        [field]: file
      }
    }));
  };

  const fetchPredefinedTemplates = async () => {
    try {
      const response = await api.get('/api/predefined-templates');
      setPredefinedTemplates(response.data);
    } catch (error) {
      console.error('Error fetching predefined templates:', error);
      setMessage('Error fetching templates');
    }
  };

  const fetchCountryTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/pdf-templates', {
        params: { organization: user.organization._id }
      });
      console.log('Fetched templates:', response.data);
      console.log('Organization ID:', user.organization._id);
      setCountryTemplates(response.data);
    } catch (error) {
      console.error('Error fetching country templates:', error);
    } finally {
      setLoading(false);
    }
  }, [user.organization._id]);

  useEffect(() => {
    fetchPredefinedTemplates();
    fetchCountryTemplates();
  }, [fetchCountryTemplates]);

  const handleFileChange = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const selectPredefinedTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      templateName: template.name
    }));
  };
  
  const quickSaveTemplate = async (template) => {
    const country = prompt(`Enter country for ${template.displayName} template:`);
    if (!country) return;
    
    const backgrounds = templateBackgrounds[template.name] || {};
    
    setLoading(true);
    setMessage('');
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('country', country);
      formDataToSend.append('organization', user.organization._id);
      formDataToSend.append('styles', JSON.stringify(template.styles));
      
      if (backgrounds.frontPageBackground) {
        formDataToSend.append('frontPageBackground', backgrounds.frontPageBackground);
      }
      if (backgrounds.middlePageBackground) {
        formDataToSend.append('middlePageBackground', backgrounds.middlePageBackground);
      }
      if (backgrounds.lastPageBackground) {
        formDataToSend.append('lastPageBackground', backgrounds.lastPageBackground);
      }
      
      await api.post('/api/pdf-templates', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMessage(`${template.displayName} template saved for ${country}!`);
      fetchCountryTemplates();
      
      // Clear backgrounds for this template after saving
      setTemplateBackgrounds(prev => {
        const newBackgrounds = { ...prev };
        delete newBackgrounds[template.name];
        return newBackgrounds;
      });
      
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage('Error saving template: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    
    if (!formData.country || !selectedTemplate) {
      setMessage('Please select a country and template');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('country', formData.country);
      formDataToSend.append('styles', JSON.stringify(selectedTemplate.styles));
      
      if (formData.frontPageBackground) {
        formDataToSend.append('frontPageBackground', formData.frontPageBackground);
      }
      if (formData.middlePageBackground) {
        formDataToSend.append('middlePageBackground', formData.middlePageBackground);
      }
      if (formData.lastPageBackground) {
        formDataToSend.append('lastPageBackground', formData.lastPageBackground);
      }

      await api.post('/api/pdf-templates', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage('Template saved successfully!');
      setFormData({
        country: '',
        templateName: '',
        frontPageBackground: null,
        middlePageBackground: null,
        lastPageBackground: null
      });
      setSelectedTemplate(null);
      fetchCountryTemplates();
      
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage('Error saving template: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await api.delete(`/api/pdf-templates/${templateId}`);
      setMessage('Template deleted successfully!');
      fetchCountryTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      setMessage('Error deleting template');
    }
  };

  const previewTemplate = (template) => {
    // Create a temporary template object for preview
    const tempTemplate = {
      _id: 'temp',
      country: template.country,
      organization: user.organization._id,
      styles: template.styles,
      frontPageBackground: template.frontPageBackground,
      middlePageBackground: template.middlePageBackground,
      lastPageBackground: template.lastPageBackground
    };
    setSelectedTemplate(tempTemplate);
    setActiveTab('preview');
  };

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    header: {
      marginBottom: '30px',
      textAlign: 'center'
    },
    tabs: {
      display: 'flex',
      marginBottom: '30px',
      borderBottom: '1px solid #ddd'
    },
    tab: {
      padding: '12px 24px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
      fontSize: '16px',
      fontWeight: '500'
    },
    activeTab: {
      borderBottom: '2px solid #007bff',
      color: '#007bff'
    },
    templateGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    templateCard: {
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: '#fff'
    },
    templateCardHover: {
      borderColor: '#007bff',
      boxShadow: '0 4px 12px rgba(0,123,255,0.15)'
    },
    selectedTemplate: {
      borderColor: '#007bff',
      backgroundColor: '#f8f9ff',
      boxShadow: '0 4px 12px rgba(0,123,255,0.15)'
    },
    formSection: {
      marginBottom: '30px',
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold',
      color: '#333'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '16px'
    },
    button: {
      padding: '12px 24px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      marginRight: '10px'
    },
    dangerButton: {
      backgroundColor: '#dc3545'
    },
    successButton: {
      backgroundColor: '#28a745'
    },
    message: {
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      textAlign: 'center'
    },
    successMessage: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb'
    },
    errorMessage: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb'
    }
  };

  // PreviewIframe component
  const PreviewIframe = ({ template }) => {
    const [htmlContent, setHtmlContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
      const fetchPreview = async () => {
        try {
          setLoading(true);
          setError('');
          
          const response = await api.get(`/api/pdf-generator/preview/${template.country}`);
          setHtmlContent(response.data);
        } catch (err) {
          console.error('Error fetching preview:', err);
          setError('Failed to load preview: ' + (err.response?.data?.message || err.message));
        } finally {
          setLoading(false);
        }
      };

      if (template?.country) {
        fetchPreview();
      }
    }, [template?.country]);

    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}>
          <div>Loading preview...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          padding: '20px',
          border: '1px solid #dc3545',
          borderRadius: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24'
        }}>
          <h4>Error Loading Preview</h4>
          <p>{error}</p>
        </div>
      );
    }

    return (
      <div>
        <p style={{marginBottom: '10px', fontSize: '14px', color: '#666'}}>
          Preview for: <strong>{template.country}</strong>
        </p>
        <iframe
          srcDoc={htmlContent}
          style={{
            width: '100%',
            height: '800px',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}
          title="Template Preview"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>PDF Template Manager</h1>
        <p>Choose from predefined templates and customize with your background images</p>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          ...(message.includes('success') ? styles.successMessage : styles.errorMessage)
        }}>
          {message}
        </div>
      )}

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'templates' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('templates')}
        >
          Predefined Templates
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'create' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('create')}
        >
          Create Country Template
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'list' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('list')}
        >
          Your Templates
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'preview' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
      </div>

      {activeTab === 'templates' && (
        <div>
          <h2>Choose a Template Style</h2>
          <div style={styles.templateGrid}>
            {Array.isArray(predefinedTemplates) && predefinedTemplates.map((template) => (
              <div
                key={template._id}
                style={{
                  ...styles.templateCard,
                  ...(selectedTemplate?.name === template.name ? styles.selectedTemplate : {})
                }}
              >
                <div onClick={() => selectPredefinedTemplate(template)}>
                  <h3>{template.displayName}</h3>
                  <p><strong>Category:</strong> {template.category}</p>
                  <p>{template.description}</p>
                  <div style={{ marginTop: '15px' }}>
                    <small style={{ color: '#666' }}>
                      <strong>Colors:</strong><br/>
                      Heading: <span style={{ color: template.styles.heading.color }}>{template.styles.heading.color}</span><br/>
                      Text: <span style={{ color: template.styles.text.color }}>{template.styles.text.color}</span>
                    </small>
                  </div>
                </div>
                
                {/* Background Upload Section */}
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Background Images (Optional)</h4>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>Front Page:</label>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ fontSize: '12px' }}
                      onChange={(e) => handleTemplateBackgroundChange(template.name, 'frontPageBackground', e.target.files[0])}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>Middle Page:</label>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ fontSize: '12px' }}
                      onChange={(e) => handleTemplateBackgroundChange(template.name, 'middlePageBackground', e.target.files[0])}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>Last Page:</label>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ fontSize: '12px' }}
                      onChange={(e) => handleTemplateBackgroundChange(template.name, 'lastPageBackground', e.target.files[0])}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <button
                    style={{
                      ...styles.button,
                      fontSize: '12px',
                      padding: '6px 12px',
                      width: '100%',
                      backgroundColor: '#28a745'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      quickSaveTemplate(template);
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Quick Save Template'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div>
          <h2>Create Country Template</h2>
          {selectedTemplate ? (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px' }}>
              <strong>Selected Template:</strong> {selectedTemplate.displayName}
            </div>
          ) : (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
              Please select a template from the "Predefined Templates" tab first.
            </div>
          )}
          
          <form onSubmit={saveTemplate}>
            <div style={styles.formSection}>
              <h3>Basic Information</h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>Country *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="e.g., Thailand, United Arab Emirates"
                  required
                />
              </div>
            </div>

            <div style={styles.formSection}>
              <h3>Background Images (Optional)</h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>Front Page Background</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('frontPageBackground', e.target.files[0])}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Middle Page Background</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('middlePageBackground', e.target.files[0])}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Last Page Background</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('lastPageBackground', e.target.files[0])}
                />
              </div>
            </div>

            <button type="submit" style={styles.button} disabled={loading || !selectedTemplate}>
              {loading ? 'Saving...' : 'Save Template'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div>
          <h2>Your Country Templates</h2>
          {loading ? (
            <p>Loading templates...</p>
          ) : countryTemplates.length === 0 ? (
            <div>
              <p>No templates found. Create your first template!</p>
              <p style={{fontSize: '12px', color: '#666'}}>Debug: Template count = {countryTemplates.length}</p>
            </div>
          ) : (
            <div style={styles.templateGrid}>
              {Array.isArray(countryTemplates) && countryTemplates.map((template) => (
                <div key={template._id} style={styles.templateCard}>
                  <h3>{template.country}</h3>
                  <p><strong>Created:</strong> {new Date(template.createdAt).toLocaleDateString()}</p>
                  <p><strong>Backgrounds:</strong></p>
                  <ul>
                    <li>Front: {template.frontPageBackground ? '✅' : '❌'}</li>
                    <li>Middle: {template.middlePageBackground ? '✅' : '❌'}</li>
                    <li>Last: {template.lastPageBackground ? '✅' : '❌'}</li>
                  </ul>
                  <div style={{ marginTop: '15px' }}>
                    <button
                      style={{ ...styles.button, ...styles.successButton }}
                      onClick={() => previewTemplate(template)}
                    >
                      Preview
                    </button>
                    <button
                      style={{ ...styles.button, ...styles.dangerButton }}
                      onClick={() => deleteTemplate(template._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'preview' && (
        <div>
          <h2>Template Preview</h2>
          {selectedTemplate ? (
            <PreviewIframe template={selectedTemplate} />
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ddd',
              borderRadius: '8px'
            }}>
              <h3>No Template to Preview</h3>
              <p>Please select a predefined template or create a country template to preview.</p>
              <button
                style={styles.button}
                onClick={() => setActiveTab('templates')}
              >
                Select Template
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleTemplateManager;

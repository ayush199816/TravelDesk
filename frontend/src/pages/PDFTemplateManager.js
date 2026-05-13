import React, { useState, useEffect } from 'react';
import api from '../api/axios';

// PreviewIframe component to handle authentication
const PreviewIframe = ({ template }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await api.get(`/pdf-generator/preview/${template.country}`);
        setHtmlContent(response.data);
        console.log('Preview HTML loaded successfully, length:', response.data.length);
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
        Preview for: <strong>{template.country}</strong> (Organization-specific template)
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
        sandbox="allow-same-origin"
      />
    </div>
  );
};

const PDFTemplateManager = ({ user }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  
  // Form state
  const [formData, setFormData] = useState({
    country: '',
    styles: {
      heading: {
        font: 'Helvetica-Bold',
        size: 24,
        color: '#000000',
        backgroundColor: 'transparent'
      },
      subheading: {
        font: 'Helvetica',
        size: 18,
        color: '#333333',
        backgroundColor: 'transparent'
      },
      table: {
        font: 'Helvetica',
        size: 12,
        color: '#000000',
        backgroundColor: '#f8f9fa',
        headerBackgroundColor: '#dee2e6',
        borderColor: '#dee2e6'
      },
      text: {
        font: 'Helvetica',
        size: 14,
        color: '#333333',
        backgroundColor: 'transparent'
      }
    }
  });
  
  // File upload state
  const [files, setFiles] = useState({
    frontPageBackground: null,
    middlePageBackground: null,
    lastPageBackground: null
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/pdf-templates?organization=${user.organization._id}`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setMessage('Error fetching templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('organization', user.organization._id);
      formDataToSend.append('country', formData.country);
      formDataToSend.append('styles', JSON.stringify(formData.styles));

      // Add background images if provided
      if (files.frontPageBackground) {
        formDataToSend.append('frontPageBackground', files.frontPageBackground);
      }
      if (files.middlePageBackground) {
        formDataToSend.append('middlePageBackground', files.middlePageBackground);
      }
      if (files.lastPageBackground) {
        formDataToSend.append('lastPageBackground', files.lastPageBackground);
      }

      await api.post('/pdf-templates', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage('Template saved successfully!');
      fetchTemplates();
      resetForm();
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage('Error saving template: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (field, file) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const handleStyleChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        [category]: {
          ...prev.styles[category],
          [field]: value
        }
      }
    }));
  };

  const resetForm = () => {
    setFormData({
      country: '',
      styles: {
        heading: {
          font: 'Helvetica-Bold',
          size: 24,
          color: '#000000',
          backgroundColor: 'transparent'
        },
        subheading: {
          font: 'Helvetica',
          size: 18,
          color: '#333333',
          backgroundColor: 'transparent'
        },
        table: {
          font: 'Helvetica',
          size: 12,
          color: '#000000',
          backgroundColor: '#f8f9fa',
          headerBackgroundColor: '#dee2e6',
          borderColor: '#dee2e6'
        },
        text: {
          font: 'Helvetica',
          size: 14,
          color: '#333333',
          backgroundColor: 'transparent'
        }
      }
    });
    setFiles({
      frontPageBackground: null,
      middlePageBackground: null,
      lastPageBackground: null
    });
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.delete(`/pdf-templates/${templateId}`);
      setMessage('Template deleted successfully!');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      setMessage('Error deleting template');
    }
  };

  const previewTemplate = (template) => {
    setSelectedTemplate(template);
    setActiveTab('preview');
  };

  const previewCurrentSettings = () => {
    // Create a temporary template object with current form settings
    const tempTemplate = {
      _id: 'temp',
      country: formData.country || 'Preview',
      organization: user.organization._id,
      styles: formData.styles,
      frontPageBackground: null,
      middlePageBackground: null,
      lastPageBackground: null
    };
    setSelectedTemplate(tempTemplate);
    setActiveTab('preview');
  };

  const applyPredefinedTemplate = (templateType) => {
    // Future: Apply predefined templates
    const predefinedStyles = {
      'modern': {
        heading: { font: 'Arial-Bold', size: 28, color: '#2c3e50', backgroundColor: 'transparent' },
        subheading: { font: 'Arial', size: 20, color: '#34495e', backgroundColor: 'transparent' },
        table: { font: 'Arial', size: 12, color: '#2c3e50', backgroundColor: '#f8f9fa', headerBackgroundColor: '#3498db', borderColor: '#dee2e6' },
        text: { font: 'Arial', size: 14, color: '#2c3e50', backgroundColor: 'transparent' }
      },
      'elegant': {
        heading: { font: 'Times-Bold', size: 32, color: '#8b4513', backgroundColor: 'transparent' },
        subheading: { font: 'Times', size: 22, color: '#654321', backgroundColor: 'transparent' },
        table: { font: 'Times', size: 12, color: '#8b4513', backgroundColor: '#fff8dc', headerBackgroundColor: '#daa520', borderColor: '#d2b48c' },
        text: { font: 'Times', size: 14, color: '#654321', backgroundColor: 'transparent' }
      },
      'minimal': {
        heading: { font: 'Helvetica-Bold', size: 24, color: '#333333', backgroundColor: 'transparent' },
        subheading: { font: 'Helvetica', size: 18, color: '#666666', backgroundColor: 'transparent' },
        table: { font: 'Helvetica', size: 11, color: '#333333', backgroundColor: '#ffffff', headerBackgroundColor: '#f5f5f5', borderColor: '#e0e0e0' },
        text: { font: 'Helvetica', size: 13, color: '#666666', backgroundColor: 'transparent' }
      }
    };
    
    if (predefinedStyles[templateType]) {
      setFormData(prev => ({
        ...prev,
        styles: predefinedStyles[templateType]
      }));
      setMessage(`Applied ${templateType} template style!`);
    }
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
      marginBottom: '20px',
      borderBottom: '1px solid #ddd'
    },
    tab: {
      padding: '10px 20px',
      cursor: 'pointer',
      border: 'none',
      background: 'none',
      borderBottom: '2px solid transparent'
    },
    activeTab: {
      borderBottom: '2px solid #007bff',
      color: '#007bff'
    },
    form: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    formSection: {
      marginBottom: '30px',
      padding: '15px',
      border: '1px solid #ddd',
      borderRadius: '5px'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold'
    },
    input: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px'
    },
    button: {
      padding: '10px 20px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '10px'
    },
    dangerButton: {
      backgroundColor: '#dc3545'
    },
    templateCard: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '15px'
    },
    message: {
      padding: '10px',
      marginBottom: '20px',
      borderRadius: '4px',
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>PDF Template Manager</h1>
        <p>Manage PDF templates for different countries</p>
      </div>

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'list' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('list')}
        >
          Templates
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'create' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('create')}
        >
          Create Template
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'preview' ? styles.activeTab : {}) }}
          onClick={() => {
            if (!selectedTemplate && formData.country) {
              previewCurrentSettings();
            } else {
              setActiveTab('preview');
            }
          }}
        >
          Preview
        </button>
      </div>

      {activeTab === 'list' && (
        <div>
          <h2>Your PDF Templates</h2>
          {loading ? (
            <p>Loading templates...</p>
          ) : templates.length === 0 ? (
            <p>No templates found. Create your first template!</p>
          ) : (
            templates.map(template => (
              <div key={template._id} style={styles.templateCard}>
                <h3>{template.country}</h3>
                <p>Status: {template.isActive ? 'Active' : 'Inactive'}</p>
                <p>Created: {new Date(template.createdAt).toLocaleDateString()}</p>
                <div style={{ marginTop: '10px' }}>
                  <button
                    style={styles.button}
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
            ))
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h2>Create PDF Template</h2>
          
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
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Quick Styles (Predefined Templates)</label>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onClick={() => applyPredefinedTemplate('modern')}
                >
                  Modern
                </button>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#8b4513',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onClick={() => applyPredefinedTemplate('elegant')}
                >
                  Elegant
                </button>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onClick={() => applyPredefinedTemplate('minimal')}
                >
                  Minimal
                </button>
              </div>
              <p style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                Quick templates for common design styles. You can customize further below.
              </p>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3>Background Images</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Front Page Background</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('frontPageBackground', e.target.files[0])}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Middle Pages Background</label>
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

          <div style={styles.formSection}>
            <h3>Typography Styles</h3>
            
            <h4>Heading Style</h4>
            <div style={styles.formGroup}>
              <label style={styles.label}>Font</label>
              <select
                style={styles.input}
                value={formData.styles.heading.font}
                onChange={(e) => handleStyleChange('heading', 'font', e.target.value)}
              >
                <option value="Helvetica-Bold">Helvetica Bold</option>
                <option value="Arial-Bold">Arial Bold</option>
                <option value="Times-Bold">Times Bold</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Size (px)</label>
              <input
                type="number"
                style={styles.input}
                value={formData.styles.heading.size}
                onChange={(e) => handleStyleChange('heading', 'size', parseInt(e.target.value))}
                min="12"
                max="48"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Color</label>
              <input
                type="color"
                style={styles.input}
                value={formData.styles.heading.color}
                onChange={(e) => handleStyleChange('heading', 'color', e.target.value)}
              />
            </div>

            <h4>Subheading Style</h4>
            <div style={styles.formGroup}>
              <label style={styles.label}>Font</label>
              <select
                style={styles.input}
                value={formData.styles.subheading.font}
                onChange={(e) => handleStyleChange('subheading', 'font', e.target.value)}
              >
                <option value="Helvetica">Helvetica</option>
                <option value="Arial">Arial</option>
                <option value="Times">Times</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Size (px)</label>
              <input
                type="number"
                style={styles.input}
                value={formData.styles.subheading.size}
                onChange={(e) => handleStyleChange('subheading', 'size', parseInt(e.target.value))}
                min="10"
                max="36"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Color</label>
              <input
                type="color"
                style={styles.input}
                value={formData.styles.subheading.color}
                onChange={(e) => handleStyleChange('subheading', 'color', e.target.value)}
              />
            </div>

            <h4>Table Style</h4>
            <div style={styles.formGroup}>
              <label style={styles.label}>Font Size (px)</label>
              <input
                type="number"
                style={styles.input}
                value={formData.styles.table.size}
                onChange={(e) => handleStyleChange('table', 'size', parseInt(e.target.value))}
                min="8"
                max="20"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Text Color</label>
              <input
                type="color"
                style={styles.input}
                value={formData.styles.table.color}
                onChange={(e) => handleStyleChange('table', 'color', e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Background Color</label>
              <input
                type="color"
                style={styles.input}
                value={formData.styles.table.backgroundColor}
                onChange={(e) => handleStyleChange('table', 'backgroundColor', e.target.value)}
              />
            </div>

            <h4>Text Style</h4>
            <div style={styles.formGroup}>
              <label style={styles.label}>Font Size (px)</label>
              <input
                type="number"
                style={styles.input}
                value={formData.styles.text.size}
                onChange={(e) => handleStyleChange('text', 'size', parseInt(e.target.value))}
                min="10"
                max="24"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Color</label>
              <input
                type="color"
                style={styles.input}
                value={formData.styles.text.color}
                onChange={(e) => handleStyleChange('text', 'color', e.target.value)}
              />
            </div>
          </div>

          <button 
            type="button" 
            style={{...styles.button, backgroundColor: '#17a2b8', marginRight: '10px'}} 
            onClick={previewCurrentSettings}
            disabled={!formData.country}
          >
            Preview Template
          </button>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Saving...' : 'Save Template'}
          </button>
        </form>
      )}

      {activeTab === 'preview' && (
        <div>
          <h2>Template Preview - {selectedTemplate ? selectedTemplate.country : 'No Template Selected'}</h2>
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
              <p>Please create a template or select an existing template to preview.</p>
              <button
                style={styles.button}
                onClick={() => setActiveTab('create')}
              >
                Create New Template
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFTemplateManager;

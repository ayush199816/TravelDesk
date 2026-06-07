import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const QuoteTemplateManager = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');
  const [selectedCountry, setSelectedCountry] = useState('Default');
  const [availableCountries, setAvailableCountries] = useState([
    'Default',
    'Afghanistan',
    'Albania',
    'Algeria',
    'Andorra',
    'Angola',
    'Antigua and Barbuda',
    'Argentina',
    'Armenia',
    'Australia',
    'Austria',
    'Azerbaijan',
    'Bali',
    'Bahamas',
    'Bahrain',
    'Bangladesh',
    'Barbados',
    'Belarus',
    'Belgium',
    'Belize',
    'Benin',
    'Bhutan',
    'Bolivia',
    'Bosnia and Herzegovina',
    'Botswana',
    'Brazil',
    'Brunei',
    'Bulgaria',
    'Burkina Faso',
    'Burundi',
    'Cabo Verde',
    'Cambodia',
    'Cameroon',
    'Canada',
    'Central African Republic',
    'Chad',
    'Chile',
    'China',
    'Colombia',
    'Comoros',
    'Congo (Congo-Brazzaville)',
    'Costa Rica',
    'Croatia',
    'Cuba',
    'Cyprus',
    'Czechia (Czech Republic)',
    'Denmark',
    'Djibouti',
    'Dominica',
    'Dominican Republic',
    'Dubai',
    'Ecuador',
    'Egypt',
    'El Salvador',
    'Equatorial Guinea',
    'Eritrea',
    'Estonia',
    'Eswatini (fmr. Swaziland)',
    'Ethiopia',
    'Europe',
    'Fiji',
    'Finland',
    'France',
    'Gabon',
    'Gambia',
    'Georgia',
    'Germany',
    'Ghana',
    'Greece',
    'Grenada',
    'Guatemala',
    'Guinea',
    'Guinea-Bissau',
    'Guyana',
    'Haiti',
    'Holy See',
    'Honduras',
    'Hungary',
    'Iceland',
    'India',
    'Indonesia',
    'Iran',
    'Iraq',
    'Ireland',
    'Israel',
    'Italy',
    'Jamaica',
    'Japan',
    'Jordan',
    'Kazakhstan',
    'Kenya',
    'Kiribati',
    'Kuwait',
    'Kyrgyzstan',
    'Laos',
    'Latvia',
    'Lebanon',
    'Lesotho',
    'Liberia',
    'Libya',
    'Liechtenstein',
    'Lithuania',
    'Luxembourg',
    'Madagascar',
    'Malawi',
    'Malaysia',
    'Maldives',
    'Mali',
    'Malta',
    'Marshall Islands',
    'Mauritania',
    'Mauritius',
    'Mexico',
    'Micronesia',
    'Moldova',
    'Monaco',
    'Mongolia',
    'Montenegro',
    'Morocco',
    'Mozambique',
    'Myanmar (formerly Burma)',
    'Namibia',
    'Nauru',
    'Nepal',
    'Netherlands',
    'New Zealand',
    'Nicaragua',
    'Niger',
    'Nigeria',
    'North Korea',
    'North Macedonia',
    'Norway',
    'Oman',
    'Pakistan',
    'Palau',
    'Palestine State',
    'Panama',
    'Papua New Guinea',
    'Paraguay',
    'Peru',
    'Philippines',
    'Poland',
    'Portugal',
    'Qatar',
    'Romania',
    'Russia',
    'Rwanda',
    'Saint Kitts and Nevis',
    'Saint Lucia',
    'Saint Vincent and the Grenadines',
    'Samoa',
    'San Marino',
    'Sao Tome and Principe',
    'Saudi Arabia',
    'Senegal',
    'Serbia',
    'Seychelles',
    'Sierra Leone',
    'Singapore',
    'Slovakia',
    'Slovenia',
    'Solomon Islands',
    'Somalia',
    'South Africa',
    'South Korea',
    'South Sudan',
    'Spain',
    'Sri Lanka',
    'Sudan',
    'Suriname',
    'Sweden',
    'Switzerland',
    'Syria',
    'Tajikistan',
    'Tanzania',
    'Thailand',
    'Timor-Leste',
    'Togo',
    'Tonga',
    'Trinidad and Tobago',
    'Tunisia',
    'Turkey',
    'Turkmenistan',
    'Tuvalu',
    'Uganda',
    'UAE',
    'UK',
    'Ukraine',
    'Uruguay',
    'USA',
    'Uzbekistan',
    'Vanuatu',
    'Venezuela',
    'Vietnam',
    'Yemen',
    'Zambia',
    'Zimbabwe'
  ]);
  const [justSaved, setJustSaved] = useState(false);

  const tabs = [
    { id: 'colors', label: 'Colors' },
    { id: 'fonts', label: 'Fonts' },
    { id: 'backgrounds', label: 'Backgrounds' },
    { id: 'table', label: 'Table' },
    { id: 'hotel', label: 'Hotel' },
    { id: 'messages', label: 'Messages' },
    { id: 'layout', label: 'Layout' }
  ];

  // Helper function to adjust color brightness for gradients
  const adjustColor = (color, amount) => {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  const fetchTemplates = useCallback(async () => {
    try {
      console.log('Fetching templates for country:', selectedCountry);
      
      // Get all templates to extract available countries
      const allResponse = await api.get('/quote-templates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('All templates:', allResponse.data);
      
      // Always show all countries, but put existing ones first
      const existingCountries = Array.isArray(allResponse.data) ? allResponse.data.map(t => t.country).filter(c => c && c !== 'Default') : [];
      const allCountriesList = [
        'Default',
        'Afghanistan',
        'Albania',
        'Algeria',
        'Andorra',
        'Angola',
        'Antigua and Barbuda',
        'Argentina',
        'Armenia',
        'Australia',
        'Austria',
        'Azerbaijan',
        'Bali',
        'Bahamas',
        'Bahrain',
        'Bangladesh',
        'Barbados',
        'Belarus',
        'Belgium',
        'Belize',
        'Benin',
        'Bhutan',
        'Bolivia',
        'Bosnia and Herzegovina',
        'Botswana',
        'Brazil',
        'Brunei',
        'Bulgaria',
        'Burkina Faso',
        'Burundi',
        'Cabo Verde',
        'Cambodia',
        'Cameroon',
        'Canada',
        'Central African Republic',
        'Chad',
        'Chile',
        'China',
        'Colombia',
        'Comoros',
        'Congo (Congo-Brazzaville)',
        'Costa Rica',
        'Croatia',
        'Cuba',
        'Cyprus',
        'Czechia (Czech Republic)',
        'Denmark',
        'Djibouti',
        'Dominica',
        'Dominican Republic',
        'Dubai',
        'Ecuador',
        'Egypt',
        'El Salvador',
        'Equatorial Guinea',
        'Eritrea',
        'Estonia',
        'Eswatini (fmr. Swaziland)',
        'Ethiopia',
        'Europe',
        'Fiji',
        'Finland',
        'France',
        'Gabon',
        'Gambia',
        'Georgia',
        'Germany',
        'Ghana',
        'Greece',
        'Grenada',
        'Guatemala',
        'Guinea',
        'Guinea-Bissau',
        'Guyana',
        'Haiti',
        'Holy See',
        'Honduras',
        'Hungary',
        'Iceland',
        'India',
        'Indonesia',
        'Iran',
        'Iraq',
        'Ireland',
        'Israel',
        'Italy',
        'Jamaica',
        'Japan',
        'Jordan',
        'Kazakhstan',
        'Kenya',
        'Kiribati',
        'Kuwait',
        'Kyrgyzstan',
        'Laos',
        'Latvia',
        'Lebanon',
        'Lesotho',
        'Liberia',
        'Libya',
        'Liechtenstein',
        'Lithuania',
        'Luxembourg',
        'Madagascar',
        'Malawi',
        'Malaysia',
        'Maldives',
        'Mali',
        'Malta',
        'Marshall Islands',
        'Mauritania',
        'Mauritius',
        'Mexico',
        'Micronesia',
        'Moldova',
        'Monaco',
        'Mongolia',
        'Montenegro',
        'Morocco',
        'Mozambique',
        'Myanmar (formerly Burma)',
        'Namibia',
        'Nauru',
        'Nepal',
        'Netherlands',
        'New Zealand',
        'Nicaragua',
        'Niger',
        'Nigeria',
        'North Korea',
        'North Macedonia',
        'Norway',
        'Oman',
        'Pakistan',
        'Palau',
        'Palestine State',
        'Panama',
        'Papua New Guinea',
        'Paraguay',
        'Peru',
        'Philippines',
        'Poland',
        'Portugal',
        'Qatar',
        'Romania',
        'Russia',
        'Rwanda',
        'Saint Kitts and Nevis',
        'Saint Lucia',
        'Saint Vincent and the Grenadines',
        'Samoa',
        'San Marino',
        'Sao Tome and Principe',
        'Saudi Arabia',
        'Senegal',
        'Serbia',
        'Seychelles',
        'Sierra Leone',
        'Singapore',
        'Slovakia',
        'Slovenia',
        'Solomon Islands',
        'Somalia',
        'South Africa',
        'South Korea',
        'South Sudan',
        'Spain',
        'Sri Lanka',
        'Sudan',
        'Suriname',
        'Sweden',
        'Switzerland',
        'Syria',
        'Tajikistan',
        'Tanzania',
        'Thailand',
        'Timor-Leste',
        'Togo',
        'Tonga',
        'Trinidad and Tobago',
        'Tunisia',
        'Turkey',
        'Turkmenistan',
        'Tuvalu',
        'Uganda',
        'UAE',
        'UK',
        'Ukraine',
        'Uruguay',
        'USA',
        'Uzbekistan',
        'Vanuatu',
        'Venezuela',
        'Vietnam',
        'Yemen',
        'Zambia',
        'Zimbabwe'
      ];
      
      // Put existing countries at the top, then the rest
      const existingUnique = [...new Set(existingCountries)];
      const otherCountries = allCountriesList.filter(country => !existingUnique.includes(country));
      const finalCountries = ['Default', ...existingUnique, ...otherCountries];
      
      console.log('Extracted countries:', existingCountries);
      console.log('Final countries list:', finalCountries);
      setAvailableCountries(finalCountries);
      
      // Get templates for selected country
      const response = await api.get('/quote-templates', {
        params: { country: selectedCountry },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Templates for selected country:', response.data);
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Fallback to show all countries if there's an error
      setAvailableCountries([
        'Default',
        'Afghanistan',
        'Albania',
        'Algeria',
        'Andorra',
        'Angola',
        'Antigua and Barbuda',
        'Argentina',
        'Armenia',
        'Australia',
        'Austria',
        'Azerbaijan',
        'Bali',
        'Bahamas',
        'Bahrain',
        'Bangladesh',
        'Barbados',
        'Belarus',
        'Belgium',
        'Belize',
        'Benin',
        'Bhutan',
        'Bolivia',
        'Bosnia and Herzegovina',
        'Botswana',
        'Brazil',
        'Brunei',
        'Bulgaria',
        'Burkina Faso',
        'Burundi',
        'Cabo Verde',
        'Cambodia',
        'Cameroon',
        'Canada',
        'Central African Republic',
        'Chad',
        'Chile',
        'China',
        'Colombia',
        'Comoros',
        'Congo (Congo-Brazzaville)',
        'Costa Rica',
        'Croatia',
        'Cuba',
        'Cyprus',
        'Czechia (Czech Republic)',
        'Denmark',
        'Djibouti',
        'Dominica',
        'Dominican Republic',
        'Dubai',
        'Ecuador',
        'Egypt',
        'El Salvador',
        'Equatorial Guinea',
        'Eritrea',
        'Estonia',
        'Eswatini (fmr. Swaziland)',
        'Ethiopia',
        'Europe',
        'Fiji',
        'Finland',
        'France',
        'Gabon',
        'Gambia',
        'Georgia',
        'Germany',
        'Ghana',
        'Greece',
        'Grenada',
        'Guatemala',
        'Guinea',
        'Guinea-Bissau',
        'Guyana',
        'Haiti',
        'Holy See',
        'Honduras',
        'Hungary',
        'Iceland',
        'India',
        'Indonesia',
        'Iran',
        'Iraq',
        'Ireland',
        'Israel',
        'Italy',
        'Jamaica',
        'Japan',
        'Jordan',
        'Kazakhstan',
        'Kenya',
        'Kiribati',
        'Kuwait',
        'Kyrgyzstan',
        'Laos',
        'Latvia',
        'Lebanon',
        'Lesotho',
        'Liberia',
        'Libya',
        'Liechtenstein',
        'Lithuania',
        'Luxembourg',
        'Madagascar',
        'Malawi',
        'Malaysia',
        'Maldives',
        'Mali',
        'Malta',
        'Marshall Islands',
        'Mauritania',
        'Mauritius',
        'Mexico',
        'Micronesia',
        'Moldova',
        'Monaco',
        'Mongolia',
        'Montenegro',
        'Morocco',
        'Mozambique',
        'Myanmar (formerly Burma)',
        'Namibia',
        'Nauru',
        'Nepal',
        'Netherlands',
        'New Zealand',
        'Nicaragua',
        'Niger',
        'Nigeria',
        'North Korea',
        'North Macedonia',
        'Norway',
        'Oman',
        'Pakistan',
        'Palau',
        'Palestine State',
        'Panama',
        'Papua New Guinea',
        'Paraguay',
        'Peru',
        'Philippines',
        'Poland',
        'Portugal',
        'Qatar',
        'Romania',
        'Russia',
        'Rwanda',
        'Saint Kitts and Nevis',
        'Saint Lucia',
        'Saint Vincent and the Grenadines',
        'Samoa',
        'San Marino',
        'Sao Tome and Principe',
        'Saudi Arabia',
        'Senegal',
        'Serbia',
        'Seychelles',
        'Sierra Leone',
        'Singapore',
        'Slovakia',
        'Slovenia',
        'Solomon Islands',
        'Somalia',
        'South Africa',
        'South Korea',
        'South Sudan',
        'Spain',
        'Sri Lanka',
        'Sudan',
        'Suriname',
        'Sweden',
        'Switzerland',
        'Syria',
        'Tajikistan',
        'Tanzania',
        'Thailand',
        'Timor-Leste',
        'Togo',
        'Tonga',
        'Trinidad and Tobago',
        'Tunisia',
        'Turkey',
        'Turkmenistan',
        'Tuvalu',
        'Uganda',
        'UAE',
        'UK',
        'Ukraine',
        'Uruguay',
        'USA',
        'Uzbekistan',
        'Vanuatu',
        'Venezuela',
        'Vietnam',
        'Yemen',
        'Zambia',
        'Zimbabwe'
      ]);
    }
  }, [selectedCountry]);

  useEffect(() => {
    console.log('Available Countries State:', availableCountries);
  }, [availableCountries]);

  const fetchDefaultTemplate = useCallback(async () => {
    try {
      console.log('Fetching template for country:', selectedCountry);
      
      // First, try to get templates for the selected country
      const templatesResponse = await api.get('/quote-templates', {
        params: { country: selectedCountry },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      console.log('Found templates for country:', templatesResponse.data.length);
      
      // If we have templates for this country, use the most recent one
      if (templatesResponse.data.length > 0) {
        const mostRecentTemplate = templatesResponse.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        console.log('Using most recent template:', mostRecentTemplate.name, 'Country:', mostRecentTemplate.country);
        setCurrentTemplate(mostRecentTemplate);
      } else {
        // If no templates for this country, get the default template
        console.log('No templates found for country, getting default');
        const response = await api.get('/quote-templates/default', {
          params: { country: selectedCountry },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        console.log('Using default template:', response.data.name, 'Country:', response.data.country);
        setCurrentTemplate(response.data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching template:', error);
      setLoading(false);
    }
  }, [selectedCountry]);

  useEffect(() => {
    fetchTemplates();
    fetchDefaultTemplate();
  }, [fetchTemplates, fetchDefaultTemplate]);

  useEffect(() => {
    fetchTemplates();
    if (!justSaved) {
      fetchDefaultTemplate();
    }
  }, [selectedCountry, justSaved, fetchTemplates, fetchDefaultTemplate]);

  const handleSave = async () => {
    if (!currentTemplate) return;
    
    console.log('Saving template:', currentTemplate.name, 'Country:', currentTemplate.country, 'ID:', currentTemplate._id);
    console.log('Greeting message being saved:', currentTemplate.messages?.greetingMessage);
    console.log('Hotel data being saved:', currentTemplate.hotel);
    console.log('NightBox data being saved:', currentTemplate.hotel?.nightBox);
    console.log('Package settings being saved:', {
      backgrounds: currentTemplate.backgrounds?.package,
      borders: currentTemplate.borders?.package,
      shadows: currentTemplate.shadows?.package,
      shadowsOpacity: currentTemplate.shadows?.packageOpacity
    });
    
    // Preserve current selection
    const currentCountry = selectedCountry;
    const currentTemplateId = currentTemplate._id;
    
    setSaving(true);
    try {
      const response = await api.put(`/quote-templates/${currentTemplate._id}`, currentTemplate, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Saved template response:', response.data.name, 'Country:', response.data.country);
      console.log('Hotel data in response:', response.data.hotel);
      console.log('NightBox data in response:', response.data.hotel?.nightBox);
      setCurrentTemplate(response.data); // Update with latest data from server
      
      // Ensure we stay on the same template and country
      setSelectedCountry(currentCountry);
      
      alert('Template saved successfully!');
      
      // Set justSaved flag to prevent template override
      setJustSaved(true);
      
      // Fetch templates but don't change selection
      fetchTemplates().then(() => {
        // Re-select the same template after fetch
        const savedTemplate = templates.find(t => t._id === currentTemplateId);
        if (savedTemplate) {
          setCurrentTemplate(savedTemplate);
        }
        
        // Reset the justSaved flag after a short delay
        setTimeout(() => {
          setJustSaved(false);
        }, 1000);
      });
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    }
    setSaving(false);
  };

  const handleCreateNew = async () => {
    try {
      const response = await api.post('/quote-templates', {
        name: `${selectedCountry === 'Default' ? 'Custom' : selectedCountry} Template ${templates.length + 1}`,
        country: selectedCountry,
        colors: currentTemplate.colors,
        fonts: currentTemplate.fonts,
        fontSizes: currentTemplate.fontSizes,
        backgrounds: currentTemplate.backgrounds,
        borders: currentTemplate.borders,
        table: currentTemplate.table,
        messages: currentTemplate.messages,
        layout: currentTemplate.layout
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTemplates([...templates, response.data]);
      setCurrentTemplate(response.data);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleSetAsDefault = async (templateId) => {
    try {
      await api.put(`/quote-templates/${templateId}/set-default`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchTemplates();
      fetchDefaultTemplate();
      alert('Template set as default!');
    } catch (error) {
      console.error('Error setting default template:', error);
    }
  };

  const updateTemplate = (path, value) => {
    setCurrentTemplate(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      
      // Debug package settings updates
      if (path.includes('package')) {
        console.log('Updated package setting:', path, '=', value);
        console.log('Current package state:', {
          backgrounds: updated.backgrounds?.package,
          borders: updated.borders?.package,
          shadows: updated.shadows?.package,
          shadowsOpacity: updated.shadows?.packageOpacity
        });
      }
      
      return updated;
    });
  };

  if (loading) return <div>Loading...</div>;
  if (!currentTemplate) return <div>No template found</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Navigation Bar */}
      <nav style={{
        backgroundColor: '#343a40',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>
              Quote Template Manager
            </h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => navigate('/org-admin-dashboard')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '1px solid #6c757d',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
          <div style={{ color: 'white', fontSize: '0.9rem' }}>
            Organization Admin
          </div>
        </div>
      </nav>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Template Selection */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>Country:</label>
              <select 
                value={selectedCountry} 
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{ padding: '8px', fontSize: '14px', minWidth: '150px' }}
              >
                {Array.isArray(availableCountries) && availableCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>Template:</label>
              <select 
                value={currentTemplate._id} 
                onChange={(e) => {
                  const template = templates.find(t => t._id === e.target.value);
                  console.log('Selected template:', template?.name, 'Country:', template?.country, 'ID:', template?._id);
                  if (template) setCurrentTemplate(template);
                }}
                style={{ padding: '8px', fontSize: '14px', minWidth: '200px' }}
              >
                {Array.isArray(templates) && templates.map(template => (
                  <option key={template._id} value={template._id}>
                    {template.name} {template.isDefault && '(Default)'}
                  </option>
                ))}
              </select>
            </div>
            
            <button onClick={handleCreateNew} style={{ 
              padding: '8px 16px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Create New
            </button>
            
            <button onClick={handleSave} disabled={saving} style={{ 
              padding: '8px 16px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}>
              {saving ? 'Saving...' : 'Save Template'}
            </button>

            {currentTemplate && !currentTemplate.isDefault && (
              <button 
                onClick={() => handleSetAsDefault(currentTemplate._id)}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#ffc107', 
                  color: 'black', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Set as Default
              </button>
            )}
          </div>
        </div>

        {/* Template Preview */}
        {currentTemplate && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>
              Template Preview: {currentTemplate.name} ({currentTemplate.country})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', fontSize: '12px' }}>
              <div>
                <strong>Colors:</strong>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: currentTemplate.colors?.primary, border: '1px solid #ccc' }}></div>
                    <span>Primary</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: currentTemplate.colors?.secondary, border: '1px solid #ccc' }}></div>
                    <span>Secondary</span>
                  </div>
                </div>
              </div>
              <div>
                <strong>Fonts:</strong>
                <div style={{ marginTop: '5px' }}>
                  <div>Header: {currentTemplate.fonts?.header?.split(',')[0]?.replace(/['"]/g, '')}</div>
                  <div>Body: {currentTemplate.fonts?.body?.split(',')[0]?.replace(/['"]/g, '')}</div>
                </div>
              </div>
              <div>
                <strong>Backgrounds:</strong>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: currentTemplate.backgrounds?.activity, border: '1px solid #ccc' }}></div>
                    <span>Activity</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: currentTemplate.backgrounds?.payment, border: '1px solid #ccc' }}></div>
                    <span>Payment</span>
                  </div>
                </div>
              </div>
              <div>
                <strong>Table:</strong>
                <div style={{ marginTop: '5px' }}>
                  <div>Radius: {currentTemplate.table?.borderRadius || 0}px</div>
                  <div>Font: {currentTemplate.table?.fontSize || 14}px</div>
                </div>
              </div>
              <div>
                <strong>Layout:</strong>
                <div style={{ marginTop: '5px' }}>
                  <div>Activities/Page: {currentTemplate.layout?.activitiesPerPage || 2}</div>
                  <div>Images: {currentTemplate.layout?.showImages ? 'Yes' : 'No'}</div>
                </div>
              </div>
              <div>
                <strong>Created:</strong>
                <div style={{ marginTop: '5px' }}>
                  {new Date(currentTemplate.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          marginBottom: '20px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
            {Array.isArray(tabs) && tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'black',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  transition: 'all 0.3s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {activeTab === 'colors' && (
              <>
                <div>
                  <label>Primary Color:</label>
                  <input 
                    type="color" 
                    value={currentTemplate.colors.primary}
                    onChange={(e) => updateTemplate('colors.primary', e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
                <div>
                  <label>Secondary Color:</label>
                  <input 
                    type="color" 
                    value={currentTemplate.colors.secondary}
                    onChange={(e) => updateTemplate('colors.secondary', e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
                <div>
                  <label>Accent Color:</label>
                  <input 
                    type="color" 
                    value={currentTemplate.colors.accent}
                    onChange={(e) => updateTemplate('colors.accent', e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
                <div>
                  <label>Text Color:</label>
                  <input 
                    type="color" 
                    value={currentTemplate.colors.text}
                    onChange={(e) => updateTemplate('colors.text', e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
                <div>
                  <label>Muted Text Color:</label>
                  <input 
                    type="color" 
                    value={currentTemplate.colors.muted}
                    onChange={(e) => updateTemplate('colors.muted', e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
              </>
            )}

            {activeTab === 'fonts' && (
              <>
                <div>
                  <label>Header Font:</label>
                  <select 
                    value={currentTemplate.fonts.header}
                    onChange={(e) => updateTemplate('fonts.header', e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Helvetica Neue', Arial, sans-serif">Helvetica</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                  </select>
                </div>
                <div>
                  <label>Body Font:</label>
                  <select 
                    value={currentTemplate.fonts.body}
                    onChange={(e) => updateTemplate('fonts.body', e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Helvetica Neue', Arial, sans-serif">Helvetica</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                  </select>
                </div>
                <div>
                  <label>Activity Font:</label>
                  <select 
                    value={currentTemplate.fonts.activity}
                    onChange={(e) => updateTemplate('fonts.activity', e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Helvetica Neue', Arial, sans-serif">Helvetica</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                  </select>
                </div>
              </>
            )}

            {activeTab === 'backgrounds' && (
              <>
                <div>
                  <label>Package Background:</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      value={currentTemplate.backgrounds.package === 'transparent' ? '#ffffff' : (currentTemplate.backgrounds.package || '#f8f9fa')}
                      onChange={(e) => updateTemplate('backgrounds.package', e.target.value)}
                      style={{ width: '100px', height: '40px' }}
                      disabled={currentTemplate.backgrounds.package === 'transparent'}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={currentTemplate.backgrounds.package === 'transparent'}
                        onChange={(e) => updateTemplate('backgrounds.package', e.target.checked ? 'transparent' : '#f8f9fa')}
                      />
                      Transparent
                    </label>
                  </div>
                </div>
                <div>
                  <label>Activity Background:</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      value={currentTemplate.backgrounds.activity === 'transparent' ? '#ffffff' : (currentTemplate.backgrounds.activity || '#f8f9fa')}
                      onChange={(e) => updateTemplate('backgrounds.activity', e.target.value)}
                      style={{ width: '100px', height: '40px' }}
                      disabled={currentTemplate.backgrounds.activity === 'transparent'}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={currentTemplate.backgrounds.activity === 'transparent'}
                        onChange={(e) => updateTemplate('backgrounds.activity', e.target.checked ? 'transparent' : '#f8f9fa')}
                      />
                      Transparent
                    </label>
                  </div>
                </div>
                <div>
                  <label>Payment Background:</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <input 
                        type="color" 
                        value={currentTemplate.backgrounds.payment?.match(/#[0-9a-f]{6}/i)?.[0] || '#667eea'}
                        onChange={(e) => {
                          const gradient = `linear-gradient(135deg, ${e.target.value} 0%, ${adjustColor(e.target.value, -20)} 100%)`;
                          updateTemplate('backgrounds.payment', gradient);
                        }}
                        style={{ width: '60px', height: '40px' }}
                        disabled={currentTemplate.backgrounds.payment === 'transparent'}
                      />
                      <div 
                        style={{ 
                          flex: 1, 
                          height: '40px', 
                          borderRadius: '4px',
                          background: currentTemplate.backgrounds.payment === 'transparent' 
                            ? 'repeating-linear-gradient(45deg, #ccc 0, #ccc 5px, #fff 5px, #fff 10px)' 
                            : (currentTemplate.backgrounds.payment || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'),
                          border: '1px solid #ddd'
                        }}
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={currentTemplate.backgrounds.payment === 'transparent'}
                        onChange={(e) => updateTemplate('backgrounds.payment', e.target.checked ? 'transparent' : 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)')}
                      />
                      Transparent
                    </label>
                  </div>
                </div>
                <div>
                  <label>Next Steps Background:</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <input 
                        type="color" 
                        value={currentTemplate.backgrounds.nextSteps?.match(/#[0-9a-f]{6}/i)?.[0] || '#764ba2'}
                        onChange={(e) => {
                          const gradient = `linear-gradient(135deg, ${e.target.value} 0%, ${adjustColor(e.target.value, -20)} 100%)`;
                          updateTemplate('backgrounds.nextSteps', gradient);
                        }}
                        style={{ width: '60px', height: '40px' }}
                        disabled={currentTemplate.backgrounds.nextSteps === 'transparent'}
                      />
                      <div 
                        style={{ 
                          flex: 1, 
                          height: '40px', 
                          borderRadius: '4px',
                          background: currentTemplate.backgrounds.nextSteps === 'transparent' 
                            ? 'repeating-linear-gradient(45deg, #ccc 0, #ccc 5px, #fff 5px, #fff 10px)' 
                            : (currentTemplate.backgrounds.nextSteps || 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'),
                          border: '1px solid #ddd'
                        }}
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={currentTemplate.backgrounds.nextSteps === 'transparent'}
                        onChange={(e) => updateTemplate('backgrounds.nextSteps', e.target.checked ? 'transparent' : 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)')}
                      />
                      Transparent
                    </label>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'table' && (
              <>
                <div>
                  <label>Table Background Color:</label>
                  <input 
                    type="color" 
                    value={currentTemplate.table?.backgroundColor || 'rgba(0, 0, 0, 0.7)'}
                    onChange={(e) => updateTemplate('table.backgroundColor', e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
                <div>
                  <label>Table Header Background:</label>
                  <input 
                    type="color" 
                    value={currentTemplate.table?.headerBackgroundColor || 'rgba(0, 0, 0, 0.9)'}
                    onChange={(e) => updateTemplate('table.headerBackgroundColor', e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
                <div>
                  <label>Table Text Color:</label>
                  <input 
                    type="color" 
                    value={currentTemplate.table?.textColor || 'white'}
                    onChange={(e) => updateTemplate('table.textColor', e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
                <div>
                  <label>Table Header Text Color:</label>
                  <input 
                    type="color" 
                    value={currentTemplate.table?.headerTextColor || 'white'}
                    onChange={(e) => updateTemplate('table.headerTextColor', e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
                <div>
                  <label>Table Border Color:</label>
                  <input 
                    type="color" 
                    value={currentTemplate.borders?.table || 'rgba(255, 255, 255, 0.3)'}
                    onChange={(e) => updateTemplate('borders.table', e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
                <div>
                  <label>Table Border Radius (px):</label>
                  <input 
                    type="number" 
                    min="0"
                    max="20"
                    value={currentTemplate.table?.borderRadius || 0}
                    onChange={(e) => updateTemplate('table.borderRadius', parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Table Font Size (px):</label>
                  <input 
                    type="number" 
                    min="10"
                    max="20"
                    value={currentTemplate.table?.fontSize || 14}
                    onChange={(e) => updateTemplate('table.fontSize', parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Table Header Font Size (px):</label>
                  <input 
                    type="number" 
                    min="10"
                    max="24"
                    value={currentTemplate.table?.headerFontSize || 15}
                    onChange={(e) => updateTemplate('table.headerFontSize', parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              </>
            )}

            {activeTab === 'hotel' && (
              <>
                <div>
                  <label>Show Hotel Box:</label>
                  <select 
                    value={currentTemplate.hotel?.showBox !== false}
                    onChange={(e) => updateTemplate('hotel.showBox', e.target.value === 'true')}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="true">Show Box</option>
                    <option value="false">No Box</option>
                  </select>
                </div>
                
                <div>
                  <label>Background Color:</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      value={currentTemplate.hotel?.backgroundColor === 'transparent' ? '#ffffff' : (currentTemplate.hotel?.backgroundColor || '#f8f9fa')}
                      onChange={(e) => updateTemplate('hotel.backgroundColor', e.target.value)}
                      style={{ width: '100px', height: '40px' }}
                      disabled={currentTemplate.hotel?.backgroundColor === 'transparent'}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={currentTemplate.hotel?.backgroundColor === 'transparent'}
                        onChange={(e) => updateTemplate('hotel.backgroundColor', e.target.checked ? 'transparent' : '#f8f9fa')}
                      />
                      Transparent
                    </label>
                  </div>
                </div>
                
                <div>
                  <label>Border Color:</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      value={currentTemplate.hotel?.borderColor === 'transparent' ? '#000000' : (currentTemplate.hotel?.borderColor || '#e9ecef')}
                      onChange={(e) => updateTemplate('hotel.borderColor', e.target.value)}
                      style={{ width: '100px', height: '40px' }}
                      disabled={currentTemplate.hotel?.borderColor === 'transparent'}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={currentTemplate.hotel?.borderColor === 'transparent'}
                        onChange={(e) => updateTemplate('hotel.borderColor', e.target.checked ? 'transparent' : '#e9ecef')}
                      />
                      Transparent
                    </label>
                  </div>
                </div>
                
                <div>
                  <label>Border Width (px):</label>
                  <input 
                    type="number" 
                    min="0"
                    max="5"
                    value={currentTemplate.hotel?.borderWidth || 1}
                    onChange={(e) => updateTemplate('hotel.borderWidth', parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                
                <div>
                  <label>Border Radius (px):</label>
                  <input 
                    type="number" 
                    min="0"
                    max="20"
                    value={currentTemplate.hotel?.borderRadius || 8}
                    onChange={(e) => updateTemplate('hotel.borderRadius', parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              </>
            )}

            {activeTab === 'messages' && (
              <>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Welcome Message:</label>
                  <input 
                    type="text" 
                    value={currentTemplate.messages.welcome}
                    onChange={(e) => updateTemplate('messages.welcome', e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Welcome Subtext:</label>
                  <input 
                    type="text" 
                    value={currentTemplate.messages.welcomeSubtext}
                    onChange={(e) => updateTemplate('messages.welcomeSubtext', e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Greeting (e.g., "Greetings from"):</label>
                  <input 
                    type="text" 
                    value={currentTemplate.messages.greeting || 'Greetings from'}
                    onChange={(e) => updateTemplate('messages.greeting', e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Greeting Message:</label>
                  <textarea 
                    value={currentTemplate.messages.greetingMessage || 'Our sales team has put up this Quote regarding your upcoming trip. Please go through it and let\'s know if you would like any changes in any of the provided services. Contact details are provided at the end.'}
                    onChange={(e) => updateTemplate('messages.greetingMessage', e.target.value)}
                    style={{ width: '100%', padding: '8px', minHeight: '80px' }}
                    placeholder="Enter your custom greeting message here..."
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Next Steps Title:</label>
                  <input 
                    type="text" 
                    value={currentTemplate.messages.nextStepsTitle}
                    onChange={(e) => updateTemplate('messages.nextStepsTitle', e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Next Steps (one step per line):</label>
                  <textarea 
                    value={Array.isArray(currentTemplate.messages.nextSteps) ? currentTemplate.messages.nextSteps.join('\n') : ''}
                    onChange={(e) => {
                      const steps = e.target.value.split('\n').filter(step => step.trim() !== '');
                      updateTemplate('messages.nextSteps', steps);
                    }}
                    style={{ width: '100%', padding: '8px', minHeight: '150px' }}
                    placeholder="Enter each next step on a new line..."
                  />
                </div>
              </>
            )}

            {activeTab === 'layout' && (
              <>
                <div>
                  <label>Activities Per Page:</label>
                  <input 
                    type="number" 
                    min="1"
                    max="10"
                    value={currentTemplate.layout?.activitiesPerPage || 2}
                    onChange={(e) => updateTemplate('layout.activitiesPerPage', parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Show Images:</label>
                  <select 
                    value={currentTemplate.layout?.showImages !== false}
                    onChange={(e) => updateTemplate('layout.showImages', e.target.value === 'true')}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="true">Show Images</option>
                    <option value="false">Hide Images</option>
                  </select>
                </div>
                <div>
                  <label>Image Size:</label>
                  <select 
                    value={currentTemplate.layout?.imageSize || 'medium'}
                    onChange={(e) => updateTemplate('layout.imageSize', e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <label>Layout Style:</label>
                  <select 
                    value={currentTemplate.layout?.style || 'grid'}
                    onChange={(e) => updateTemplate('layout.style', e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                    <option value="cards">Cards</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteTemplateManager;

import React, { useState, useEffect, useRef } from 'react';

const SearchableDropdown = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  optionRenderer,
  valueKey = '_id',
  labelKey = 'name',
  searchable = true,
  style = {},
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [displayValue, setDisplayValue] = useState('');
  const dropdownRef = useRef(null);

  // Update display value when selected value changes
  useEffect(() => {
    if (value) {
      const selectedOption = options.find(option => option[valueKey] === value);
      if (selectedOption) {
        setDisplayValue(selectedOption[labelKey] || '');
        setSearchTerm('');
      }
    } else {
      setDisplayValue('');
      setSearchTerm('');
    }
  }, [value, options, valueKey, labelKey]);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = options.filter(option => {
        const label = option[labelKey] || '';
        return label.toLowerCase().includes(searchLower);
      });
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options, labelKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        if (!value) {
          setSearchTerm('');
          setDisplayValue('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const handleInputChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setDisplayValue(term);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleOptionClick = (option) => {
    onChange(option[valueKey]);
    setIsOpen(false);
    setSearchTerm('');
    setDisplayValue(option[labelKey]);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setDisplayValue('');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      if (!value) {
        setSearchTerm('');
        setDisplayValue('');
      }
    } else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      handleOptionClick(filteredOptions[0]);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', ...style }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        backgroundColor: disabled ? '#f8f9fa' : 'white',
        position: 'relative'
      }}>
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: '14px'
          }}
        />
        
        {displayValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6c757d',
              fontSize: '16px',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        )}
        
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{
            padding: '4px 8px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: '#6c757d',
            fontSize: '12px'
          }}
          disabled={disabled}
        >
          ▼
        </button>
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ced4da',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {filteredOptions.length === 0 ? (
            <div style={{
              padding: '8px 12px',
              color: '#6c757d',
              fontStyle: 'italic'
            }}>
              No options found
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option[valueKey]}
                onClick={() => handleOptionClick(option)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f8f9fa',
                  backgroundColor: 'white'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                }}
              >
                {optionRenderer ? optionRenderer(option) : option[labelKey]}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;

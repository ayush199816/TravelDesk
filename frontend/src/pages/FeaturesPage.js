import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './FeaturesPage.css';

const FeaturesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      id: 1,
      title: 'Itinerary Builder',
      icon: '📋',
      category: 'planning',
      description: 'Create detailed day-by-day itineraries with drag-and-drop functionality and instant updates.',
      benefits: ['Drag & Drop Interface', 'Real-time Updates', 'Template Library', 'Custom Branding'],
      color: '#7877c6'
    },
    {
      id: 2,
      title: 'Supplier Management',
      icon: '🤝',
      category: 'operations',
      description: 'Manage supplier relationships and assignments with automated workflows and real-time availability tracking.',
      benefits: ['Supplier Database', 'Automated Assignment', 'Performance Tracking', 'Contract Management'],
      color: '#6366f1'
    },
    {
      id: 3,
      title: 'Payment Reminder',
      icon: '💰',
      category: 'finance',
      description: 'Automated payment reminders and tracking to ensure timely collections and improved cash flow.',
      benefits: ['Automated Reminders', 'Payment Tracking', 'Late Fee Calculation', 'Multiple Payment Methods'],
      color: '#8b5cf6'
    },
    {
      id: 4,
      title: 'Supplier Assignment',
      icon: '🎯',
      category: 'operations',
      description: 'Intelligent supplier assignment based on availability, expertise, and performance metrics.',
      benefits: ['Smart Matching', 'Availability Check', 'Performance-Based', 'Cost Optimization'],
      color: '#7877c6'
    },
    {
      id: 5,
      title: 'Followup Reminder',
      icon: '📞',
      category: 'crm',
      description: 'Never miss a follow-up with intelligent reminders and automated scheduling system.',
      benefits: ['Smart Scheduling', 'Priority-Based', 'Multi-channel', 'Analytics Dashboard'],
      color: '#6366f1'
    },
    {
      id: 6,
      title: 'Lead Assignment',
      icon: '👥',
      category: 'crm',
      description: 'Automatic lead distribution to team members based on workload, expertise, and performance.',
      benefits: ['Rule-Based Distribution', 'Workload Balancing', 'Expertise Matching', 'Performance Tracking'],
      color: '#8b5cf6'
    },
    {
      id: 7,
      title: 'Lead Management',
      icon: '🎯',
      category: 'crm',
      description: 'Comprehensive lead tracking with scoring, nurturing, and conversion analytics.',
      benefits: ['Lead Scoring', 'Pipeline Management', 'Automated Nurturing', 'Conversion Analytics'],
      color: '#7877c6'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Features', icon: '🌟' },
    { id: 'planning', name: 'Planning', icon: '📅' },
    { id: 'operations', name: 'Operations', icon: '⚙️' },
    { id: 'finance', name: 'Finance', icon: '💳' },
    { id: 'crm', name: 'CRM', icon: '🤝' }
  ];

  const filteredFeatures = selectedCategory === 'all' 
    ? features 
    : features.filter(feature => feature.category === selectedCategory);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="features-page">
      {/* Navigation */}
      <nav className="hero-nav">
        <div className="nav-brand">
          <div className="brand-logo">
            <div className="logo-icon">DS</div>
            <span className="logo-text" style={{ color: 'white' }}>DMCStation</span>
          </div>
        </div>
        <div className="nav-actions">
          <Link to="/" className="nav-link">Home</Link>
          <button className="nav-link active">Features</button>
          <Link to="/org-login" className="nav-cta">Sign In</Link>
        </div>
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu} aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
        <div className={`mobile-nav-backdrop ${mobileMenuOpen ? 'backdrop-open' : ''}`} onClick={closeMobileMenu}></div>
        <div className={`mobile-nav-menu ${mobileMenuOpen ? 'mobile-nav-open' : ''}`}>
          <button className="mobile-nav-close" onClick={closeMobileMenu} aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
          <Link to="/" className="mobile-nav-link" onClick={closeMobileMenu}>Home</Link>
          <button className="mobile-nav-link active" onClick={closeMobileMenu}>Features</button>
          <Link to="/org-login" className="mobile-nav-cta" onClick={closeMobileMenu}>Sign In</Link>
        </div>
      </nav>

      {/* Category Filter */}
      <section className="category-filter">
        <div className="container">
          <div className="filter-tabs">
            {categories.map(category => (
              <button
                key={category.id}
                className={`filter-tab ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span className="tab-icon">{category.icon}</span>
                <span className="tab-name">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Image-Based Feature Cards */}
      <section className="image-cards-container">
        <div className="image-cards-grid">
          {filteredFeatures.map((feature, index) => (
            <div 
              key={feature.id} 
              className="image-feature-card"
            >
              {/* Large Icon Section */}
              <div className="icon-section">
                <div className="icon-circle" style={{ background: feature.color }}>
                  <div className="large-icon">{feature.icon}</div>
                </div>
              </div>
              
              {/* Card Title */}
              <div className="title-section">
                <h3 className="feature-title">{feature.title}</h3>
              </div>
              
              {/* Card Description */}
              <div className="description-section">
                <p className="feature-description">{feature.description}</p>
              </div>
              
              {/* Benefits Section */}
              <div className="benefits-section">
                <div className="benefits-title">
                  Key Benefits
                </div>
                <div className="benefits-list">
                  {feature.benefits.map((benefit, idx) => (
                    <div key={idx} className="benefit-row">
                      <div className="check-icon" style={{ color: feature.color }}>
                        ✓
                      </div>
                      <span className="benefit-name">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Learn More Link */}
              <div className="learn-more-section">
                <button className="learn-more-link" style={{ color: feature.color }}>
                  Learn More →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="features-cta">
        <div className="cta-background">
          <div className="cta-gradient"></div>
          <div className="cta-pattern"></div>
        </div>
        <div className="container">
          <div className="cta-content">
            <div className="cta-badge">
              <div className="badge-dot"></div>
              <span>Get Started</span>
            </div>
            <h2>Ready to Transform Your Travel Business?</h2>
            <p>Experience the power of DMCstation with a 14-day free trial. No credit card required.</p>
            <div className="cta-buttons">
              <a href="https://cal.com/ayush-gupta-1h1hth" target="_blank" rel="noopener noreferrer" className="cta-primary">
                <span className="cta-text">Schedule Demo</span>
                <div className="cta-arrow">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
                  </svg>
                </div>
              </a>
              <Link to="/org-login" className="cta-secondary">
                <span className="cta-text">Start Free Trial</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-background">
          <div className="footer-gradient"></div>
          <div className="footer-pattern"></div>
        </div>
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="brand-section">
                <Link to="/" className="brand-logo">
                  <div className="logo-icon">DS</div>
                  <span className="logo-text">DMCStation</span>
                </Link>
                <p className="brand-description">
                  The world's most advanced travel management platform. Empowering agencies to streamline operations and accelerate growth.
                </p>
                <div className="social-links">
                  <button className="social-link" aria-label="Twitter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                    </svg>
                  </button>
                  <button className="social-link" aria-label="LinkedIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                      <circle cx="4" cy="4" r="2"/>
                    </svg>
                  </button>
                  <button className="social-link" aria-label="GitHub">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="footer-sections">
              <div className="footer-section">
                <h4>Product</h4>
                <ul>
                  <li><button className="footer-link">Features</button></li>
                  <li><button className="footer-link">Pricing</button></li>
                  <li><button className="footer-link">Security</button></li>
                  <li><button className="footer-link">Roadmap</button></li>
                </ul>
              </div>
              
              <div className="footer-section">
                <h4>Company</h4>
                <ul>
                  <li><button className="footer-link">About</button></li>
                  <li><button className="footer-link">Blog</button></li>
                  <li><button className="footer-link">Careers</button></li>
                  <li><button className="footer-link">Press</button></li>
                </ul>
              </div>
              
              <div className="footer-section">
                <h4>Resources</h4>
                <ul>
                  <li><button className="footer-link">Documentation</button></li>
                  <li><button className="footer-link">API Reference</button></li>
                  <li><button className="footer-link">Guides</button></li>
                  <li><button className="footer-link">Support</button></li>
                </ul>
              </div>
              
              <div className="footer-section">
                <h4>Legal</h4>
                <ul>
                  <li><button className="footer-link">Privacy</button></li>
                  <li><button className="footer-link">Terms</button></li>
                  <li><button className="footer-link">Cookie Policy</button></li>
                  <li><button className="footer-link">Licenses</button></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <div className="footer-bottom-left">
              <p>&copy; 2026 Navigatio Asia DMC. All rights reserved.</p>
              <div className="footer-legal">
                <button className="legal-link">Privacy Policy</button>
                <span className="separator">•</span>
                <button className="legal-link">Terms of Service</button>
              </div>
            </div>
            <div className="footer-bottom-right">
              <Link to="/admin-login" className="admin-login-link">
                <div className="admin-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                </div>
                <span>Admin Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FeaturesPage;

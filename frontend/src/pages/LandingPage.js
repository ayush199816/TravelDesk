import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const metricsRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounters();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (metricsRef.current) {
      observer.observe(metricsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const animateCounters = () => {
    const counters = document.querySelectorAll('.value-number');
    
    counters.forEach((counter) => {
      const target = parseInt(counter.getAttribute('data-value'));
      const duration = 2000; // 2 seconds
      const increment = target / (duration / 16); // 60fps
      let current = 0;
      
      const updateCounter = () => {
        current += increment;
        if (current < target) {
          counter.textContent = Math.floor(current);
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target;
        }
      };
      
      updateCounter();
    });
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background">
          <div className="hero-grid"></div>
          <div className="hero-gradient"></div>
          <div className="hero-orbs">
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>
            <div className="orb orb-3"></div>
          </div>
        </div>
        
        <nav className="hero-nav">
          <div className="nav-brand">
            <div className="brand-logo">
              <div className="logo-icon">DS</div>
              <span className="logo-text" style={{ color: 'white' }}>DMCStation</span>
            </div>
          </div>
          <div className="nav-actions">
            <Link to="/features" className="nav-link">Features</Link>
            <Link to="/about" className="nav-link">About</Link>
            <button className="nav-link" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</button>
            <button className="nav-link" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>About</button>
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
            <Link to="/features" className="mobile-nav-link" onClick={closeMobileMenu}>Features</Link>
            <Link to="/about" className="mobile-nav-link" onClick={closeMobileMenu}>About</Link>
            <button className="mobile-nav-link" onClick={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); closeMobileMenu(); }}>Pricing</button>
            <Link to="/org-login" className="mobile-nav-cta" onClick={closeMobileMenu}>Sign In</Link>
          </div>
        </nav>

        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-left">
              <div className="hero-label">
                <div className="label-dot"></div>
                <span>Industry-Leading Travel Management Platform</span>
              </div>
              
              <h1 className="hero-title">
                <span className="title-line">The Future of</span>
                <span className="title-highlight">Travel Business</span>
                <span className="title-line">Management</span>
              </h1>
              
              <p className="hero-description">
                Empower your travel agency with intelligent automation, seamless collaboration, 
                and data-driven insights. Join thousands of successful agencies transforming 
                their operations with DMCstation.
              </p>
              
              <div className="hero-metrics" ref={metricsRef}>
                <div className="metric">
                  <div className="metric-value">
                    <span className="value-number" data-value="1000">0</span>
                    <span className="value-suffix">+</span>
                  </div>
                  <div className="metric-label">Active Users</div>
                </div>
                <div className="metric">
                  <div className="metric-value">
                    <span className="value-number" data-value="99">0</span>
                    <span className="value-suffix">%</span>
                  </div>
                  <div className="metric-label">Uptime</div>
                </div>
                <div className="metric">
                  <div className="metric-value">
                    <span className="value-number" data-value="24">0</span>
                    <span className="value-suffix">/7</span>
                  </div>
                  <div className="metric-label">Support</div>
                </div>
              </div>
              
              <div className="hero-actions">
                <a href="https://cal.com/ayush-gupta-1h1hth" target="_blank" rel="noopener noreferrer" className="cta-primary">
                  <span className="cta-content">
                    <span className="cta-text">Book Demo</span>
                    <span className="cta-subtext">Schedule a meeting</span>
                  </span>
                  <div className="cta-arrow">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
                    </svg>
                  </div>
                </a>
              </div>
            </div>
            
            <div className="hero-right">
              <div className="hero-visual">
                <div className="visual-container">
                  <div className="dashboard-showcase">
                    <div className="showcase-frame">
                      <div className="frame-header">
                        <div className="header-controls">
                          <div className="control control-1"></div>
                          <div className="control control-2"></div>
                          <div className="control control-3"></div>
                        </div>
                        <div className="header-url">dmcstation.com/dashboard</div>
                      </div>
                      
                      <div className="frame-content">
                        <div className="sidebar-nav">
                          <div className="nav-item nav-active"></div>
                          <div className="nav-item"></div>
                          <div className="nav-item"></div>
                          <div className="nav-item"></div>
                          <div className="nav-item"></div>
                        </div>
                        
                        <div className="main-area">
                          <div className="top-bar">
                            <div className="search-container">
                              <div className="search-icon"></div>
                              <div className="search-input"></div>
                            </div>
                            <div className="user-menu">
                              <div className="notification-bell"></div>
                              <div className="user-profile"></div>
                            </div>
                          </div>
                          
                          <div className="content-grid">
                            <div className="grid-item item-large">
                              <div className="item-header">
                                <div className="item-title"></div>
                                <div className="item-menu"></div>
                              </div>
                              <div className="item-chart">
                                <div className="chart-bar bar-1"></div>
                                <div className="chart-bar bar-2"></div>
                                <div className="chart-bar bar-3"></div>
                                <div className="chart-bar bar-4"></div>
                                <div className="chart-bar bar-5"></div>
                              </div>
                            </div>
                            
                            <div className="grid-item item-medium">
                              <div className="item-header">
                                <div className="item-title"></div>
                              </div>
                              <div className="item-stats">
                                <div className="stat-circle"></div>
                                <div className="stat-info"></div>
                              </div>
                            </div>
                            
                            <div className="grid-item item-small">
                              <div className="item-header">
                                <div className="item-title"></div>
                              </div>
                              <div className="item-list">
                                <div className="list-row"></div>
                                <div className="list-row"></div>
                                <div className="list-row"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="floating-cards">
                      <div className="float-card card-1">
                        <div className="card-icon">📊</div>
                        <div className="card-title">Analytics</div>
                      </div>
                      <div className="float-card card-2">
                        <div className="card-icon">👥</div>
                        <div className="card-title">CRM</div>
                      </div>
                      <div className="float-card card-3">
                        <div className="card-icon">💰</div>
                        <div className="card-title">Billing</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <div className="badge-dot"></div>
              <span>Services</span>
            </div>
            <h2>Powerful Solutions for Modern Travel Agencies</h2>
            <p>Everything you need to streamline operations, delight clients, and grow your business</p>
          </div>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon-wrapper">
                <div className="service-icon">🤝</div>
                <div className="icon-bg"></div>
              </div>
              <h3>Supplier Management</h3>
              <p>Manage supplier relationships and assignments with automated workflows and real-time availability tracking.</p>
              <div className="service-features">
                <span>• Supplier Assignment</span>
                <span>• Management</span>
                <span>• Real-time</span>
              </div>
            </div>
            <div className="service-card">
              <div className="service-icon-wrapper">
                <div className="service-icon">🧾</div>
                <div className="icon-bg"></div>
              </div>
              <h3>Smart Invoicing</h3>
              <p>Generate professional invoices with automated calculations, tax compliance, and custom branding.</p>
              <div className="service-features">
                <span>• Automated</span>
                <span>• Tax Compliant</span>
                <span>• Custom Branding</span>
              </div>
            </div>
            <div className="service-card">
              <div className="service-icon-wrapper">
                <div className="service-icon">👥</div>
                <div className="icon-bg"></div>
              </div>
              <h3>Lead Management</h3>
              <p>Intelligent lead tracking with automated follow-ups, scoring, and conversion analytics.</p>
              <div className="service-features">
                <span>• Lead Scoring</span>
                <span>• Automation</span>
                <span>• Analytics</span>
              </div>
            </div>
            <div className="service-card">
              <div className="service-icon-wrapper">
                <div className="service-icon">🎯</div>
                <div className="icon-bg"></div>
              </div>
              <h3>Activity Management</h3>
              <p>Manage sightseeing, transfers, and activities with scheduling and booking integration.</p>
              <div className="service-features">
                <span>• Scheduling</span>
                <span>• Booking</span>
                <span>• Coordination</span>
              </div>
            </div>
            <div className="service-card">
              <div className="service-icon-wrapper">
                <div className="service-icon">📋</div>
                <div className="icon-bg"></div>
              </div>
              <h3>Itinerary Builder</h3>
              <p>Create detailed day-by-day itineraries with drag-and-drop functionality and instant updates.</p>
              <div className="service-features">
                <span>• Drag & Drop</span>
                <span>• Real-time</span>
                <span>• Templates</span>
              </div>
            </div>
            <div className="service-card">
              <div className="service-icon-wrapper">
                <div className="service-icon">📱</div>
                <div className="icon-bg"></div>
              </div>
              <h3>Trip Sharing</h3>
              <p>Share complete trip details with clients via mobile app with real-time updates and notifications.</p>
              <div className="service-features">
                <span>• Mobile App</span>
                <span>• Real-time</span>
                <span>• Notifications</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <div className="badge-dot"></div>
              <span>Features</span>
            </div>
            <h2>Built for the Modern Travel Agency</h2>
            <p>Advanced capabilities that set you apart from the competition</p>
          </div>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-content">
                <div className="feature-icon">
                  <div className="icon-wrapper">
                    <span>🚀</span>
                  </div>
                </div>
                <div className="feature-text">
                  <h3>Lightning Fast Performance</h3>
                  <p>Optimized for speed with instant load times and real-time updates across all devices.</p>
                </div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-content">
                <div className="feature-icon">
                  <div className="icon-wrapper">
                    <span>🎯</span>
                  </div>
                </div>
                <div className="feature-text">
                  <h3>AI-Powered Insights</h3>
                  <p>Machine learning algorithms provide predictive analytics and smart recommendations.</p>
                </div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-content">
                <div className="feature-icon">
                  <div className="icon-wrapper">
                    <span>🌍</span>
                  </div>
                </div>
                <div className="feature-text">
                  <h3>Global Scalability</h3>
                  <p>Built to handle agencies of any size with multi-currency and multi-language support.</p>
                </div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-content">
                <div className="feature-icon">
                  <div className="icon-wrapper">
                    <span>🔧</span>
                  </div>
                </div>
                <div className="feature-text">
                  <h3>Seamless Integration</h3>
                  <p>Connect with 50+ popular tools including accounting software, email marketing, and more.</p>
                </div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-content">
                <div className="feature-icon">
                  <div className="icon-wrapper">
                    <span>📱</span>
                  </div>
                </div>
                <div className="feature-text">
                  <h3>Mobile Native Experience</h3>
                  <p>Full-featured mobile apps for iOS and Android with offline capabilities.</p>
                </div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-content">
                <div className="feature-icon">
                  <div className="icon-wrapper">
                    <span>⚡</span>
                  </div>
                </div>
                <div className="feature-text">
                  <h3>Real-time Collaboration</h3>
                  <p>Work together with your team in real-time with live updates and shared workspaces.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-background">
          <div className="cta-gradient"></div>
          <div className="cta-pattern"></div>
        </div>
        <div className="container">
          <div className="cta-content">
            <div className="cta-badge">
              <div className="badge-dot"></div>
              <span>Get Started Today</span>
            </div>
            <h2>Ready to Transform Your Travel Business?</h2>
            <p>Join 1000+ travel agencies using DMCstation to streamline operations and increase revenue by an average of 40%</p>
            <div className="cta-stats">
              <div className="cta-stat">
                <div className="stat-number">14-day</div>
                <div className="stat-label">Free Trial</div>
              </div>
              <div className="cta-stat">
                <div className="stat-number">No Credit Card</div>
                <div className="stat-label">Required</div>
              </div>
              <div className="cta-stat">
                <div className="stat-number">5-minute</div>
                <div className="stat-label">Setup</div>
              </div>
            </div>
            <div className="cta-buttons">
              <a href="https://cal.com/ayush-gupta-1h1hth" target="_blank" rel="noopener noreferrer" className="cta-primary">
                <span className="cta-text">Schedule Demo</span>
                <div className="cta-arrow">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
                  </svg>
                </div>
              </a>
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
                <div className="brand-logo">
                  <div className="logo-icon">DS</div>
                  <span className="logo-text" style={{ color: 'white' }}>DMCstation</span>
                </div>
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
                  <li><Link to="/features" className="footer-link">Features</Link></li>
                  <li><button className="footer-link" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</button></li>
                  <li><button className="footer-link">Security</button></li>
                  <li><button className="footer-link">Roadmap</button></li>
                </ul>
              </div>
              
              <div className="footer-section">
                <h4>Company</h4>
                <ul>
                  <li><Link to="/about" className="footer-link">About</Link></li>
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

export default LandingPage;

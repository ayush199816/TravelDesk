import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AboutUsPage.css';

const AboutUsPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="about-page">
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
          <Link to="/features" className="nav-link">Features</Link>
          <Link to="/about" className="nav-link active">About</Link>
          <button className="nav-link" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</button>
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
          <Link to="/" className="mobile-nav-item" onClick={closeMobileMenu}>Home</Link>
          <Link to="/features" className="mobile-nav-item" onClick={closeMobileMenu}>Features</Link>
          <Link to="/about" className="mobile-nav-item active" onClick={closeMobileMenu}>About</Link>
          <button className="mobile-nav-item" onClick={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); closeMobileMenu(); }}>Pricing</button>
          <Link to="/org-login" className="mobile-nav-cta" onClick={closeMobileMenu}>Sign In</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="about-hero">
        <div className="hero-background">
          <div className="hero-gradient"></div>
          <div className="hero-grid"></div>
          <div className="hero-orbs">
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>
            <div className="orb orb-3"></div>
          </div>
        </div>
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">About DMCStation</h1>
            <p className="hero-subtitle">
              Empowering travel agencies with innovative technology solutions since 2026
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="our-story">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Our Story</h2>
            <p className="section-subtitle">
              From a small startup to a trusted partner for travel agencies worldwide
            </p>
          </div>
          <div className="story-content">
            <div className="story-text">
              <p>
                DMCStation was founded in 2020 with a simple mission: to provide travel agencies with the tools they need to thrive in the digital age. What started as a small team of passionate developers has grown into a comprehensive platform serving hundreds of travel professionals across the globe.
              </p>
              <p>
                Our journey began when we noticed the challenges faced by travel agencies in managing their daily operations efficiently. From itinerary planning to supplier management, we saw an opportunity to streamline processes and enhance productivity through technology.
              </p>
              <p>
                Today, DMCStation stands as a testament to our commitment to innovation and customer success. We continue to evolve our platform based on user feedback and emerging technologies, ensuring our partners always have access to the best tools available.
              </p>
            </div>
            <div className="story-stats">
              <div className="stat-item">
                <div className="stat-number">500+</div>
                <div className="stat-label">Travel Agencies</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">50K+</div>
                <div className="stat-label">Itineraries Created</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">100+</div>
                <div className="stat-label">Countries Served</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="mission-vision">
        <div className="container">
          <div className="mission-vision-grid">
            <div className="mission-card">
              <div className="card-icon">🎯</div>
              <h3 className="card-title">Our Mission</h3>
              <p className="card-description">
                To empower travel agencies with cutting-edge technology that simplifies operations, enhances customer experiences, and drives business growth in the digital travel ecosystem.
              </p>
            </div>
            <div className="vision-card">
              <div className="card-icon">🔮</div>
              <h3 className="card-title">Our Vision</h3>
              <p className="card-description">
                To become the global leader in travel management software, setting the standard for innovation, reliability, and user experience in the travel technology industry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Meet Our Co-Founders</h2>
            <p className="section-subtitle">
              The visionaries behind DMCStation
            </p>
          </div>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">
                <div className="avatar-placeholder">AG</div>
              </div>
              <h4 className="member-name">Ayush Gupta</h4>
              <p className="member-role">Co-Founder</p>
              <p className="member-bio">
                Worked with TravClan, Atica, and Skillbound, helping them in operations and building reliable tech solutions
              </p>
            </div>
            <div className="team-member">
              <div className="member-avatar">
                <div className="avatar-placeholder">AD</div>
              </div>
              <h4 className="member-name">Anitya Dubey</h4>
              <p className="member-role">Co-Founder</p>
              <p className="member-bio">
                Very experienced in the travel business since 2019, with background in Banking, Byjus, and core sales, bringing deep industry expertise and insights
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Our Values</h2>
            <p className="section-subtitle">
              The principles that guide everything we do
            </p>
          </div>
          <div className="values-grid">
            <div className="value-item">
              <div className="value-icon">🚀</div>
              <h3 className="value-title">Innovation</h3>
              <p className="value-description">
                Constantly pushing boundaries and exploring new possibilities
              </p>
            </div>
            <div className="value-item">
              <div className="value-icon">🤝</div>
              <h3 className="value-title">Partnership</h3>
              <p className="value-description">
                Building long-term relationships based on trust and mutual success
              </p>
            </div>
            <div className="value-item">
              <div className="value-icon">💡</div>
              <h3 className="value-title">Simplicity</h3>
              <p className="value-description">
                Making complex processes simple and intuitive
              </p>
            </div>
            <div className="value-item">
              <div className="value-icon">🌟</div>
              <h3 className="value-title">Excellence</h3>
              <p className="value-description">
                Delivering quality in every aspect of our service
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="cta-background">
          <div className="cta-gradient"></div>
          <div className="cta-pattern"></div>
        </div>
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Travel Agency?</h2>
            <p className="cta-subtitle">
              Join hundreds of travel agencies already using DMCStation
            </p>
            <div className="cta-buttons">
              <a href="https://cal.com/ayush-gupta-1h1hth" target="_blank" rel="noopener noreferrer" className="cta-btn primary">Get Started</a>
              <Link to="/features" className="cta-btn secondary">Learn More</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="about-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="brand-logo">
                <div className="logo-icon">DS</div>
                <span className="logo-text">DMCStation</span>
              </div>
              <p className="footer-tagline">
                Empowering travel agencies worldwide
              </p>
            </div>
            <div className="footer-links">
              <div className="link-group">
                <h4>Product</h4>
                <Link to="/features">Features</Link>
                <Link to="/pricing">Pricing</Link>
                <Link to="/integrations">Integrations</Link>
              </div>
              <div className="link-group">
                <h4>Company</h4>
                <Link to="/about">About Us</Link>
                <Link to="/careers">Careers</Link>
                <Link to="/blog">Blog</Link>
              </div>
              <div className="link-group">
                <h4>Support</h4>
                <Link to="/help">Help Center</Link>
                <Link to="/contact">Contact</Link>
                <Link to="/status">Status</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 DMCStation. All rights reserved.</p>
            <div className="footer-legal">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutUsPage;

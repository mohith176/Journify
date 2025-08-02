import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';
const HomePage = () => {
  return (
    <div className="homepage-container">
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">⚡</span> Journify
        </div>
        <div className="nav-links">
          <Link to="/login" className="login-btn">Log in</Link>
          <Link to="/signup" className="signup-btn">Sign up</Link>
        </div>
      </nav>

      <div className="hero-section">
        <div className="hero-content">
          <h1>Your Daily Journey to Mental Wellness</h1>
          <p className="hero-subtitle">
            AI-powered journal that helps you reflect, track emotions, and gain insightful perspectives on your mental well-being.
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="hero-primary-btn">Get Started Free</Link>
            <Link to="/about" className="hero-secondary-btn">Learn More</Link>
          </div>
        </div>
        <div className="hero-image-container">
          <img src="/src/assets/images/hero-image.png" alt="Mental Health Assistant" className="hero-image" />
        </div>
      </div>

      <div className="features-section">
        <h2 className="section-title">How Journify Helps You</h2>
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-icon-container">
              <div className="feature-icon">💬</div>
            </div>
            <h3>AI Conversations</h3>
            <p>Talk to our AI for guided journaling and emotional support.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-container">
              <div className="feature-icon">📊</div>
            </div>
            <h3>Mood Analytics</h3>
            <p>Track your emotional patterns and mental health trends.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-container">
              <div className="feature-icon">🏆</div>
            </div>
            <h3>Gamified Progress</h3>
            <p>Earn badges, streaks, and complete challenges to stay motivated.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-container">
              <div className="feature-icon">🌍</div>
            </div>
            <h3>Multilingual Support</h3>
            <p>Journal in your preferred language with ease.</p>
          </div>
          {/* New Feature Card */}
          <div className="feature-card">
            <div className="feature-icon-container">
              <div className="feature-icon">🎓</div>
            </div>
            <h3>Student Benefits</h3>
            <p>Designed especially for college Students to manage stress, improve focus, and build emotional resilience during college life.</p>
          </div>
        </div>
      </div>

      <footer className="homepage-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="logo-icon">⚡</span> Journify
          </div>
          <p className="footer-tagline">Your journey to better mental wellness starts here.</p>
          <div className="footer-links">
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Journify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
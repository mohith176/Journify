import React, { useState, useEffect } from 'react';
import './Settings.css';
import { Link, useNavigate } from "react-router-dom";
import { Home, BookOpen, BarChart2, Lightbulb, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { 
  Globe,
  HelpCircle, 
  Trash2, 
  ChevronRight,
  Shield,
  Bell,
  User, // Add this
  Lock
} from 'react-feather';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Book, FileText, PieChart } from 'react-feather';
import { useTheme } from '../main';
import { Sun, Moon } from 'react-feather';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';
const Settings = () => {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('user')) || {
    name: 'User',
    email: 'user@example.com'
  };
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'English';
  });
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [userId, setUserId] = useState(null);


    // Effect to get the user ID when component mounts
    useEffect(() => {
      // Get user data from localStorage
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
  
      if (!token) {
        // If no token is found, redirect to login
        navigate('/login');
        return;
      }
  
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          // Assuming the user object has an _id field from MongoDB
          setUserId(parsedUser._id);
        } catch (error) {
          console.error('Error parsing user data:', error);
          // Redirect to login if user data is invalid
          navigate('/login');
        }
      } else {
        // No user data found, redirect to login
        navigate('/login');
      }
    }, [navigate]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    setShowLanguageModal(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const openSupportLink = async() => {
    window.open("https://support.example.com", "_blank");
  };

  const confirmDeleteChats = async () => {
    console.log("inside delete function");
    try {
      // Send userId in the request body
      await axios.delete(`${API_BASE_URL}/api/chat/clear`, {
        data: { userId } // Important: use 'data' property for DELETE request body
      });
      
      console.log("All chats deleted successfully");
      alert("All journal entries have been deleted!");
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting entries:", error);
      alert("Failed to delete entries. Please try again.");
    }
  };

  return (
    <div className={`settings-page ${theme}`}>
<Navbar bg="white" expand="lg" className="border-bottom shadow-sm">
          <Container fluid>
            <Navbar.Brand as={Link} to="/dashboard" className="d-flex align-items-center">
              <span className="fs-4 me-2">⚡</span>
              <span className="fw-bold">Journify</span>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/dashboard" className="d-flex align-items-center">
                  <Home size={16} className="me-1" /> Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/journal" className="d-flex align-items-center">
                  <Book size={16} className="me-1" /> Journal
                </Nav.Link>
                <Nav.Link as={Link} to="/mood" className="d-flex align-items-center">
                  <BarChart2 size={16} className="me-1" /> Mood Tracking
                </Nav.Link>
                <Nav.Link as={Link} to="/summary" className="d-flex align-items-center">
                  <FileText size={16} className="me-1" /> Summaries
                </Nav.Link>
                <Nav.Link as={Link} to="/Progress" className="d-flex align-items-center">
                  <PieChart size={16} className="me-1" /> Progress
                </Nav.Link>
                <Nav.Link as={Link} to="/settings" className="d-flex align-items-center">
                  <SettingsIcon size={16} className="me-1" /> Settings
                </Nav.Link>
              </Nav>
              <Button
                variant="outline-secondary"
                size="sm"
                className="d-flex align-items-center"
                onClick={handleLogout}
              >
                <LogOut size={16} className="me-1" /> Logout
              </Button>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      
      <div className="settings-container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account preferences and application settings</p>
        </div>
        
        <div className="settings-content">
          <div className="settings-sidebar">
            <div className="user-profile-card">
              <div className="user-avatar">
                {userData.name.charAt(0)}
              </div>
              <div className="user-info">
                <h3>{userData.name}</h3>
                <p>{userData.email}</p>
              </div>
              <Link to="/profile" className="edit-profile-btn">Edit Profile</Link>
            </div>
            

          </div>
          
          <div className="settings-main">
            <div className="settings-group">
              <h2 className="group-title">Appearance</h2>
              
              <div className="settings-card">
                <div className="settings-card-content">
                  <div className="settings-card-icon">
                    {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                  </div>
                  <div className="settings-card-info">
                    <h3>Theme</h3>
                    <p className="settings-card-description">
                      Toggle between light and dark mode
                    </p>
                  </div>
                  <div className="settings-card-value">
                    {/* Toggle Button */}
                    <button
                      className={`theme-toggle-button ${theme}`}
                      onClick={toggleTheme}
                    >
                      <span className="toggle-thumb"></span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* <div className="settings-card">
                <div className="settings-card-content" onClick={() => setShowLanguageModal(true)}>
                  <div className="settings-card-icon">
                    <Globe size={20} />
                  </div>
                  <div className="settings-card-info">
                    <h3>Language</h3>
                    <p className="settings-card-description">
                      Select your preferred language
                    </p>
                  </div>
                  <div className="settings-card-value">
                    <span>{language}</span>
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div> */}
            </div>
            
            <div className="settings-group">
              <h2 className="group-title">Account</h2>
              
              <div className="settings-card">
                <div className="settings-card-content" onClick={() => navigate('/profile')}>
                  <div className="settings-card-icon">
                    <User size={20} />
                  </div>
                  <div className="settings-card-info">
                    <h3>Profile Information</h3>
                    <p className="settings-card-description">
                      Update your personal information
                    </p>
                  </div>
                  <div className="settings-card-value">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
              
              <div className="settings-card">
                <div className="settings-card-content" onClick={() => navigate('/change-password')}>
                  <div className="settings-card-icon">
                    <Lock size={20} />
                  </div>
                  <div className="settings-card-info">
                    <h3>Password</h3>
                    <p className="settings-card-description">
                      Change your password
                    </p>
                  </div>
                  <div className="settings-card-value">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="settings-group">
              <h2 className="group-title">Support</h2>
              
              <div className="settings-card">
                <div className="settings-card-content" onClick={openSupportLink}>
                  <div className="settings-card-icon">
                    <HelpCircle size={20} />
                  </div>
                  <div className="settings-card-info">
                    <h3>Help & Support</h3>
                    <p className="settings-card-description">
                      Get help with using the application
                    </p>
                  </div>
                  <div className="settings-card-value">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="settings-group danger-zone">
              <h2 className="group-title">Danger Zone</h2>
              
              <div className="settings-card danger-card">
                <div className="settings-card-content" onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}>
                  <div className="settings-card-icon danger">
                    <Trash2 size={20} />
                  </div>
                  <div className="settings-card-info">
                    <h3 className="danger-text">Delete All Journal Entries</h3>
                    <p className="settings-card-description">
                      Permanently remove all your journal entries and conversations
                    </p>
                  </div>
                </div>
                
                {showDeleteConfirm && (
                  <div className="confirmation-panel">
                    <p>Are you sure you want to delete all journal entries and chats? This action cannot be undone.</p>
                    <div className="confirmation-actions">
                      <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                      <button className="danger-btn" onClick={confirmDeleteChats}>Delete Everything</button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="settings-card danger-card">
                <div className="settings-card-content" onClick={handleLogout}>
                  <div className="settings-card-icon danger">
                    <LogOut size={20} />
                  </div>
                  <div className="settings-card-info">
                    <h3>Logout</h3>
                    <p className="settings-card-description">
                      Sign out of your account
                    </p>
                  </div>
                </div>
                
                {showLogoutConfirm && (
                  <div className="confirmation-panel">
                    <p>Are you sure you want to log out?</p>
                    <div className="confirmation-actions">
                      <button className="cancel-btn" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                      <button className="primary-btn" onClick={confirmLogout}>Logout</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLanguageModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Select Language</h3>
              <button className="modal-close-btn" onClick={() => setShowLanguageModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-content">
              <div className="language-options">
                <button 
                  className={`language-option ${language === 'English' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('English')}
                >
                  <span className="language-name">English</span>
                  {language === 'English' && <span className="language-check">✓</span>}
                </button>
                <button 
                  className={`language-option ${language === 'Spanish' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('Spanish')}
                >
                  <span className="language-name">Español</span>
                  {language === 'Spanish' && <span className="language-check">✓</span>}
                </button>
                <button 
                  className={`language-option ${language === 'French' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('French')}
                >
                  <span className="language-name">Français</span>
                  {language === 'French' && <span className="language-check">✓</span>}
                </button>
                <button 
                  className={`language-option ${language === 'German' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('German')}
                >
                  <span className="language-name">Deutsch</span>
                  {language === 'German' && <span className="language-check">✓</span>}
                </button>
                <button 
                  className={`language-option ${language === 'Hindi' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('Hindi')}
                >
                  <span className="language-name">हिन्दी</span>
                  {language === 'Hindi' && <span className="language-check">✓</span>}
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={() => setShowLanguageModal(false)}>
                Cancel
              </button>
              <button className="modal-save-btn" onClick={() => setShowLanguageModal(false)}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Settings;
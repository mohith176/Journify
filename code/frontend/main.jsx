
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoginPage from "./src/pages/LoginPage";
import Signup from "./src/pages/Signup";
import TermsPage from "./src/pages/TermsPage";
import HomePage from "./src/pages/HomePage";
import Dashboard from "./src/pages/Dashboard";
import Journal from "./src/pages/Journal";
import Settings from "./src/pages/Settings";
import Summary from './src/pages/Summary';
import 'bootstrap/dist/css/bootstrap.min.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    // Redirect to login page with the return url in state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Auth Route (only accessible when NOT logged in)
const AuthRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    // If already logged in, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const ThemeInitializer = ({ children }) => {
  useEffect(() => {
    // Get theme from localStorage when app initializes
    const savedTheme = localStorage.getItem('theme') || 'Light';
    
    // Apply theme to the document
    document.documentElement.setAttribute('data-theme', savedTheme.toLowerCase());
    
    if (savedTheme === 'Dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, []);

  return children;
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeInitializer>
      <Routes>
        {/* Public routes - accessible to anyone */}
        <Route path="/" element={<HomePage />} />
        <Route path="/terms" element={<TermsPage />} />
        
        {/* Auth routes - only accessible when NOT logged in */}
        <Route 
          path="/login" 
          element={
            <AuthRoute>
              <LoginPage />
            </AuthRoute>
          } 
        />
        
        <Route 
          path="/signup" 
          element={
            <AuthRoute>
              <Signup />
            </AuthRoute>
          } 
        />
        
        {/* Protected routes - require authentication */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/journal" 
          element={
            <ProtectedRoute>
              <Journal />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/summary" 
          element={
            <ProtectedRoute>
              <Summary />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all route - redirect to homepage */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeInitializer>
  </BrowserRouter>

);
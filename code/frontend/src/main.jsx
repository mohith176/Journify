import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Signup from "./pages/Signup";
import TermsPage from "./pages/TermsPage";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Settings from "./pages/Settings";
import Mood from "./pages/Mood5";
import Summary from './pages/Summary';
import Support from "./pages/Support";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword"; // Add this import

import { useState, useEffect, createContext, useContext } from "react";
import './index.css';

// Create a theme context
export const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {}
});

// Custom hook to use the theme
export const useTheme = () => useContext(ThemeContext);

// Theme provider component
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage on initial load
    return localStorage.getItem('theme') || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Wrap the app in the theme provider
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/mood" element={<Mood />} />
        <Route path="/support" element={<Support />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/change-password" element={<ChangePassword />} /> {/* Add this route */}
      </Routes>
    </ThemeProvider>
  </BrowserRouter>
);
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'react-feather';
import './ChangePassword.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP, 3: New Password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Get user email from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setEmail(parsedUser.email);
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/settings');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const requestOTP = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/request-password-change`, { email });
      setSuccessMessage(response.data.message);
      setStep(2); // Move to OTP verification step
    } catch (error) {
      setError(error.response?.data?.message || 'Error sending verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/verify-password-otp`, { email, otp });
      setSuccessMessage(response.data.message);
      setStep(3); // Move to new password step
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setLoading(true);
    setError('');
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    // Check if password is strong enough
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/update-password`, {
        email,
        otp,
        newPassword
      });
      setSuccessMessage(response.data.message);
      
      // Wait 2 seconds then redirect to settings
      setTimeout(() => {
        navigate('/settings');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Error updating password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="change-password-form">
            <h2>Change Your Password</h2>
            <p className="instruction">
              We'll send a verification code to your email address: <strong>{email}</strong>
            </p>
            
            <button 
              className="primary-btn full-width"
              onClick={requestOTP}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        );
      
      case 2:
        return (
          <div className="change-password-form">
            <h2>Verify Your Identity</h2>
            <p className="instruction">
              Enter the 6-digit verification code sent to <strong>{email}</strong>
            </p>
            
            <div className="form-group">
              <label htmlFor="otp">Verification Code</label>
              <input
                type="text"
                id="otp"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
              />
            </div>
            
            <button 
              className="primary-btn full-width"
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            
            <button 
              className="text-btn"
              onClick={requestOTP}
              disabled={loading}
            >
              Resend Code
            </button>
          </div>
        );
      
      case 3:
        return (
          <div className="change-password-form">
            <h2>Set New Password</h2>
            <p className="instruction">
              Create a strong password with at least 8 characters
            </p>
            
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            
            <button 
              className="primary-btn full-width"
              onClick={changePassword}
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-header">
        <button className="back-button" onClick={() => navigate('/settings')}>
          <ArrowLeft size={20} />
          <span>Back to Settings</span>
        </button>
      </div>
      
      <div className="change-password-content">
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        
        {renderStepContent()}
      </div>
    </div>
  );
};

export default ChangePassword;
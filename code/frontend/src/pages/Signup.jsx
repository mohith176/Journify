import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import FacebookLogin from '@greatsumini/react-facebook-login';
import "./LoginPage.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';
const SignupPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Add states for OTP verification
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otp, setOtp] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }
      
      // If successful, show OTP verification form
      setVerificationEmail(data.email);
      setShowOtpForm(true);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: verificationEmail, otp })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }
      
      // Store JWT token in local storage
      localStorage.setItem("token", data.token);
      
      // Store user data
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      
      // Show success message
      alert("Email verified successfully!");
      
      // Redirect to dashboard
      navigate("/dashboard");
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setLoading(true);
    setResendDisabled(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: verificationEmail })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to resend code");
      }
      
      // Start countdown for resend button (60 seconds)
      setResendCountdown(60);
      const countdownInterval = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err) {
      setError(err.message);
      setResendDisabled(false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/users/google-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          token: credentialResponse.credential,
          isSignup: true // Indicate this is a signup attempt
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Google signup failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleFailure = () => {
    setError("Google sign-up failed. Please try again.");
  };
  
  // Add Facebook login handler
  const handleFacebookSuccess = async (response) => {
    try {
      setLoading(true);
      
      // Send the accessToken to your backend
      const apiResponse = await fetch(`${API_BASE_URL}/api/users/facebook-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          accessToken: response.accessToken,
          isSignup: true // Indicate this is a signup attempt
        }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.message || "Facebook signup failed");
      }

      // Store JWT token and user data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-header">
            <h1>{showOtpForm ? "Verify Your Email" : "Get Started Now"}</h1>
            <p>{showOtpForm ? `We've sent a code to ${verificationEmail}` : "Create your Journify account"}</p>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          {!showOtpForm ? (
            // Regular signup form
            <form onSubmit={handleSignup}>
              <div className="auth-input-group">
                <label>Name</label>
                <input 
                  type="text" 
                  placeholder="Enter your name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="auth-input-group">
                <label>Email address</label>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="auth-input-group">
                <label>Password</label>
                <input 
                  type="password" 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="terms">
                <input type="checkbox" id="terms" required />
                <label htmlFor="terms">
                  I agree to the <Link to="/terms" className="terms-link">terms & policy</Link>
                </label>
              </div>
              <button 
                type="submit" 
                className="auth-button"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          ) : (
            // OTP verification form
            <form onSubmit={handleVerifyOTP} className="otp-form">
              <div className="auth-input-group">
                <label>Verification Code</label>
                <input 
                  type="text" 
                  placeholder="Enter 6-digit code" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="auth-button"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>
              <div className="resend-container">
                <button 
                  type="button" 
                  onClick={handleResendOTP}
                  disabled={resendDisabled || loading}
                  className="resend-button"
                >
                  {resendCountdown > 0 
                    ? `Resend code in ${resendCountdown}s` 
                    : "Resend code"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowOtpForm(false)}
                  className="change-email-button"
                >
                  Change email
                </button>
              </div>
            </form>
          )}
          
          {!showOtpForm && (
            <>
              <div className="oauth-container">
                <p>Or sign up with:</p>
                <div className="oauth-buttons">
                  <GoogleLogin 
                    onSuccess={handleGoogleSuccess} 
                    onError={handleGoogleFailure}
                    useOneTap={false}
                    shape="rectangular"
                    theme="filled_blue"
                    text="signup_with"
                    width="100%"
                    className="oauth-button google-button"
                  />
                  
                  <FacebookLogin
                    appId={FACEBOOK_APP_ID}
                    onSuccess={handleFacebookSuccess}
                    onFail={(error) => {
                      console.log('Signup Failed!', error);
                      setError("Facebook sign-up failed. Please try again.");
                    }}
                    className="facebook-login-button"
                    style={{
                      backgroundColor: '#1877f2',
                      color: 'white',
                      fontSize: '16px',
                      padding: '10px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      width: '100%',
                      marginTop: '10px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Sign up with Facebook</span>
                  </FacebookLogin>
                </div>
              </div>
              <p className="signup-text">
                Already have an account? <Link to="/login" className="signup-link">Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default SignupPage;
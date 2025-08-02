import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import FacebookLogin from '@greatsumini/react-facebook-login';
import "./LoginPage.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://journify-deploy.onrender.com';
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store JWT token
      localStorage.setItem("token", data.token);

      // Optionally store user data
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSuccess = async (credentialResponse) => {
    try {      
      const response = await fetch(`${API_BASE_URL}/api/users/google-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Google login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleFailure = () => {
    setError("Google sign-in failed. Please try again.");
  };
  
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
          accessToken: response.accessToken
        }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.message || "Facebook login failed");
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
            <h1>Journify Welcomes You!</h1>
            <p>Login to your Account</p>
          </div>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleLogin}>
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
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          
          <div className="oauth-container">
            <p>Or login with:</p>
            <div className="oauth-buttons">
              <GoogleLogin 
                onSuccess={handleGoogleSuccess} 
                onError={handleGoogleFailure}
                useOneTap={false}
                shape="rectangular"
                theme="filled_blue"
                text="signin_with"
                width="100%"
                className="oauth-button google-button"
              />
              
              {/* <FacebookLogin
                appId={FACEBOOK_APP_ID}
                onSuccess={handleFacebookSuccess}
                onFail={(error) => {
                  console.log('Login Failed!', error);
                  setError("Facebook sign-in failed. Please try again.");
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
                <span>Sign in with Facebook</span>
              </FacebookLogin> */}
            </div>
          </div>
          
          <p className="signup-text">
            Don't have an account? <Link to="/signup" className="signup-link">Sign up</Link>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginPage;

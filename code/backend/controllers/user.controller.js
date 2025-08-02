import mongoose from 'mongoose';
import Models from '../models/user.model.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import OTP from '../models/otp.model.js';
import { sendOTPEmail } from '../utils/emailService.js';
import fetch from 'node-fetch';

const { User } = Models; // Destructure to get User model
// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register a new user - First step (generates OTP)
export const createUser = async (req, res) => {
    const { name, email, password } = req.body;
    
    // Check if name, email, and password are provided
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please provide name, email, and password" });
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP (6-digit number)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with user info in OTP collection
        await OTP.findOneAndDelete({ email }); // Delete any existing OTP for this email
        
        const newOTP = new OTP({
            email,
            otp,
            name,
            password: hashedPassword // Store hashed password
        });
        
        await newOTP.save();
        
        // Send OTP to user's email
        await sendOTPEmail(email, otp);
        
        res.status(200).json({
            message: "Verification code sent to your email",
            email // Return email for verification step
        });
    } catch (error) {
        console.error("Error in signup process:", error);
        res.status(500).json({ message: error.message });
    }
};

// Verify OTP and complete registration
export const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        return res.status(400).json({ message: "Email and verification code are required" });
    }
    
    try {
        // Find the stored OTP
        const otpRecord = await OTP.findOne({ email });
        
        if (!otpRecord) {
            return res.status(400).json({ message: "Verification code expired or not found" });
        }
        
        // Verify OTP
        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid verification code" });
        }
        
        // Create new user
        const user = new User({
            name: otpRecord.name,
            email: otpRecord.email,
            password: otpRecord.password // Already hashed
        });
        
        const newUser = await user.save();
        
        // Delete OTP record
        await OTP.findOneAndDelete({ email });
        
        // Generate JWT token
        const token = generateToken(newUser);
        
        res.status(201).json({
            message: "Registration successful",
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email
            },
            token
        });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ message: error.message });
    }
};

// Resend OTP
export const resendOTP = async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    
    try {
        // Find existing OTP record
        const otpRecord = await OTP.findOne({ email });
        
        if (!otpRecord) {
            return res.status(400).json({ message: "No pending verification found for this email" });
        }
        
        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Update OTP
        otpRecord.otp = otp;
        otpRecord.createdAt = new Date(); // Reset expiration
        await otpRecord.save();
        
        // Send new OTP to user's email
        await sendOTPEmail(email, otp);
        
        res.status(200).json({
            message: "New verification code sent to your email",
            email
        });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({ message: error.message });
    }
};

// Login user
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if all required fields are provided
        if (!email || !password) {
            return res.status(400).json({ message: "Please provide all fields" });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist" });
        }

        // Check if password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = generateToken(user);
        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Google login
export const logingoogleUser = async (req, res) => {
    try {
        const { token } = req.body;

        // Check if token is provided
        if (!token) {
            return res.status(400).json({ message: "Google token not provided" });
        }

        // Get the Google Client ID from environment variables
        const clientId = process.env.GOOGLE_CLIENT_ID;
        
        console.log("Backend using client ID:", clientId); // Log for debugging

        // Create a new OAuth2Client with your client ID
        const client = new OAuth2Client(clientId);

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: clientId  // Specify the audience explicitly
        });

        const payload = ticket.getPayload();
        const { email, name, sub } = payload;

        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            // Create new user if not found
            user = new User({
                googleId: sub,
                email,
                name,
                password: null, // No password needed for Google auth users
            });
            await user.save();
        } else if (!user.googleId) {
            // If user exists but doesn't have googleId, update it
            user.googleId = sub;
            await user.save();
        }

        // Generate JWT Token
        const authToken = generateToken(user);

        res.status(200).json({ 
            message: "Login successful", 
            token: authToken, 
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
            } 
        });
    } 
    catch (error) {
        console.error("Google login error:", error);
        res.status(500).json({ message: "Google authentication failed: " + error.message });
    }
};

// Facebook login
export const loginFacebookUser = async (req, res) => {
    try {
        const { accessToken, isSignup } = req.body;

        if (!accessToken) {
            return res.status(400).json({ message: "Facebook access token not provided" });
        }

        // Get user data from Facebook using the access token
        const response = await fetch(`https://graph.facebook.com/v17.0/me?fields=id,name,email&access_token=${accessToken}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const { id: facebookId, name, email } = data;

        // If no email was provided (rarely happens), reject the login
        if (!email) {
            return res.status(400).json({ 
                message: "Facebook login failed: Email not provided. Please use a different login method."
            });
        }

        // Check if user exists by email
        let user = await User.findOne({ email });
        
        // If this is a signup attempt and the user already exists
        if (isSignup && user) {
            return res.status(400).json({ 
                message: "An account with this email already exists. Please login instead.",
                existingUser: true
            });
        }
        
        if (!user) {
            // Create new user if not found
            user = new User({
                facebookId,
                email,
                name,
                password: null, // No password needed for Facebook auth
            });
            await user.save();
        } else if (!user.facebookId) {
            // If user exists but doesn't have facebookId, update it
            user.facebookId = facebookId;
            await user.save();
        }

        // Generate JWT Token
        const token = generateToken(user);

        res.status(200).json({ 
            message: isSignup ? "Account created successfully" : "Login successful", 
            token, 
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
            } 
        });
    } 
    catch (error) {
        console.error("Facebook login error:", error);
        res.status(500).json({ message: "Facebook authentication failed: " + error.message });
    }
};

// Get user
export const getUser = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete user by ID
export const deleteUser = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const deletedUser = await User.findByIdAndDelete(req.user._id);
        if (!deletedUser) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// export const updateUser = async (req, res) => {
//     try {
//       const { id } = req.params;
//       const { name, email } = req.body;
      
//       // Verify user has permissions to update this profile
//       if (req.user.id !== id) {
//         return res.status(403).json({ message: 'Unauthorized to update this profile' });
//       }
      
//       const user = await Models.User.findById(id);
//       if (!user) {
//         return res.status(404).json({ message: 'User not found' });
//       }
      
//       // Check if email is being changed and if it's already in use
//       if (email !== user.email) {
//         const existingUser = await Models.User.findOne({ email });
//         if (existingUser) {
//           return res.status(400).json({ message: 'Email is already in use' });
//         }
//       }
      
//       // Update fields
//       user.name = name || user.name;
//       user.email = email || user.email;
      
//       // Save updated user
//       await user.save();
      
//       // Return updated user without password
//       const userResponse = user.toObject();
//       delete userResponse.password;
      
//       res.json(userResponse);
//     } catch (error) {
//       console.error('Error updating user:', error);
//       res.status(500).json({ message: 'Server error' });
//     }
//   };

// Replace the updateUser function with this version that doesn't require authentication:
export const updateUser = async (req, res) => {
    try {
      const { name, email, userId } = req.body;
      
      // Instead of getting user ID from token, require it in the request body
      if (!userId) {
        return res.status(400).json({ message: 'userId is required in request body' });
      }
      
      console.log('Update user request received. User ID from request:', userId);
      
      // Find user by ID from the request body
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if email is being changed and if it's already in use
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== userId) {
          return res.status(400).json({ message: 'Email is already in use' });
        }
      }
      
      // Update fields
      user.name = name || user.name;
      user.email = email || user.email;
      
      // Save updated user
      await user.save();
      
      // Return updated user without password
      const userResponse = user.toObject();
      delete userResponse.password;
      
      res.json(userResponse);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  // Add this new controller function 
export const refreshToken = async (req, res) => {
    try {
      const { email, userId } = req.body;
      
      if (!email || !userId) {
        return res.status(400).json({ message: 'Email and userId are required' });
      }
      
      // Find the user
      const user = await User.findOne({ email, _id: userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Generate a new token
      const token = generateToken(user);
      
      res.json({ token });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
// Add these new functions to the existing user controller

// Request password change (sends OTP)
export const requestPasswordChange = async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    try {
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate OTP (6-digit number)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with email in OTP collection
      await OTP.findOneAndDelete({ email }); // Delete any existing OTP for this email
      
      const newOTP = new OTP({
        email,
        otp,
        name: user.name,
        password: user.password, // Store current password (already hashed)
        type: 'password-change' // Add type to indicate this is for password change
      });
      
      await newOTP.save();
      
      // Send OTP to user's email
      await sendOTPEmail(email, otp, 'Password Change');
      
      res.status(200).json({
        message: "Verification code sent to your email",
        email
      });
    } catch (error) {
      console.error("Error in password change request:", error);
      res.status(500).json({ message: error.message });
    }
  };
  
  // Verify OTP for password change
  export const verifyPasswordChangeOTP = async (req, res) => {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }
    
    try {
      // Find the stored OTP
      const otpRecord = await OTP.findOne({ email });
      
      if (!otpRecord) {
        return res.status(400).json({ message: "Verification code expired or not found" });
      }
      
      // Verify OTP
      if (otpRecord.otp !== otp) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // If OTP is valid, return success
      res.status(200).json({
        message: "OTP verified successfully",
        email,
        verified: true
      });
    } catch (error) {
      console.error("Error verifying OTP for password change:", error);
      res.status(500).json({ message: error.message });
    }
  };
  
  // Update password after OTP verification
  export const updatePassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        message: "Email, verification code, and new password are required" 
      });
    }
    
    try {
      // Find the OTP record
      const otpRecord = await OTP.findOne({ email });
      
      if (!otpRecord) {
        return res.status(400).json({ message: "Verification session expired or not found" });
      }
      
      // Verify OTP again
      if (otpRecord.otp !== otp) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update user's password
      user.password = hashedPassword;
      await user.save();
      
      // Delete OTP record
      await OTP.findOneAndDelete({ email });
      
      res.status(200).json({
        message: "Password updated successfully"
      });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: error.message });
    }
  };

  
// generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};
import express from 'express';
import { 
  createUser, 
  getUser, 
  deleteUser,
  updateUser,
  loginUser, 
  logingoogleUser, 
  loginFacebookUser, 
  verifyOTP, 
  resendOTP,
  refreshToken,
  requestPasswordChange,
  verifyPasswordChangeOTP,
  updatePassword
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import mongoose from 'mongoose';

const router = express.Router();

// Register a new user (sends OTP)
router.post('/register', createUser);

// Verify OTP and complete registration
router.post('/verify-otp', verifyOTP);

// Resend OTP
router.post('/resend-otp', resendOTP);

// Login user
router.post('/login', loginUser);

// Google login/signup
router.post('/google-login', logingoogleUser);

// Add Facebook login route
router.post('/facebook-login', loginFacebookUser);

// Get user profile
router.get('/profile', protect, getUser);

// Password change routes
router.post('/request-password-change', requestPasswordChange);
router.post('/verify-password-otp', verifyPasswordChangeOTP);
router.post('/update-password', updatePassword);

router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Verify user has permissions to view this profile
    if (req.user.id !== id) {
      return res.status(403).json({ message: 'Unauthorized to access this profile' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', updateUser);

// Delete user
router.delete('/delete', protect, deleteUser);


router.post('/refresh-token', refreshToken);
export default router;
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js'; // Adjust the path as necessary

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};



// Middleware to authenticate user from JWT token
export const authenticateUser = async (req, res, next) => {
    try {
      // Check for the authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No token found in request:', req.headers);
        return res.status(401).json({ message: 'Authentication token required' });
      }
  
      // Extract the token
      const token = authHeader.split(' ')[1];
      console.log('Token received:', token ? token.substring(0, 10) + '...' : 'None');
      
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
  
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded successfully for user:', decoded.id);
        
        // Find user
        const user = await User.User.findById(decoded.id);
        
        if (!user) {
          console.log('User not found for ID:', decoded.id);
          return res.status(401).json({ message: 'User not found' });
        }
        
        // Set user on request
        req.user = user;
        next();
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError);
        return res.status(401).json({ message: 'Invalid token' });
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ message: 'Server error in authentication' });
    }
  };
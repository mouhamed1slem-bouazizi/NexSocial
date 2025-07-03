const jwt = require('jsonwebtoken');
const UserService = require('../../services/userService');

const requireUser = async (req, res, next) => {
  try {
    console.log('🔒 Auth middleware - checking authentication');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth failed: No valid authorization header');
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔑 Token received, length:', token.length);

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified for user:', decoded.userId);
    } catch (err) {
      console.log('❌ Auth failed: Invalid token');
      console.error('❌ Token verification error:', err.message);
      console.error('❌ Token details:', {
        name: err.name,
        message: err.message,
        expiredAt: err.expiredAt
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user from database using Supabase service
    const user = await UserService.get(decoded.userId);
    if (!user) {
      console.log('❌ Auth failed: User not found in database');
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add user to request object with consistent field naming
    req.user = {
      id: user.id,
      _id: user.id, // For backward compatibility with existing code
      email: user.email
    };

    console.log('✅ Auth successful for user:', user.email);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = { requireUser };
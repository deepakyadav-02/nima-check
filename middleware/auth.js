const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    console.log('Token received, length:', token.length);
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', { 
      decoded: decoded,
      hasUser: !!decoded.user,
      directProps: Object.keys(decoded)
    });
    
    // Handle both token structures: { user: {...} } or direct user object
    if (decoded.user) {
      req.user = decoded.user;
    } else if (decoded.id || decoded.autonomousRollNo) {
      // Direct user object structure
      req.user = decoded;
    } else {
      console.error('Invalid token structure:', decoded);
      return res.status(401).json({ message: 'Invalid token structure' });
    }
    
    console.log('req.user set to:', {
      id: req.user?.id,
      autonomousRollNo: req.user?.autonomousRollNo,
      studentType: req.user?.studentType
    });
    
    next();
  } catch (error) {
    console.error('Token verification error:', error.name, error.message);
    
    let errorMessage = 'Token is not valid';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired. Please login again.';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token. Please login again.';
    } else if (error.name === 'NotBeforeError') {
      errorMessage = 'Token not active yet.';
    }
    
    res.status(401).json({ 
      message: errorMessage,
      error: error.name 
    });
  }
};

module.exports = auth;


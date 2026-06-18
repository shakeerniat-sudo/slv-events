const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'slv_events_secret_key_123456';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists (especially useful for demo database consistency)
    const users = await db.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!users || users.length === 0) {
      return res.status(403).json({ message: 'User no longer exists' });
    }

    req.user = users[0];
    next();
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden: Access restricted for ${req.user.role}` });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};

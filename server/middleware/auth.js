/**
 * RentRoll - Authentication & Role Authorization Middleware
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rentroll_phase2_jwt_secret_secure_key_2026';

/**
 * Middleware to verify JWT token from HttpOnly cookie or Authorization Bearer header.
 */
function authenticateToken(req, res, next) {
  let token = null;

  // 1. Check HttpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization Header (Bearer token)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No session token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.'
    });
  }
}

/**
 * Middleware to restrict access to specific roles.
 * @param {string|string[]} roles
 */
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This action requires role: ${allowed.join(' or ')}.`
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requireLandlord: requireRole('landlord'),
  requireTenant: requireRole('tenant'),
  JWT_SECRET
};

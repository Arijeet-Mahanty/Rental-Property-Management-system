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

  // 1. Check Authorization Header (Bearer token) - client explicitly passed
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[1] && parts[1] !== 'null' && parts[1] !== 'undefined') {
      token = parts[1].trim();
    }
  }

  // 2. Fall back to HttpOnly cookie
  if (!token && req.cookies && req.cookies.token && req.cookies.token !== 'null' && req.cookies.token !== 'undefined') {
    token = req.cookies.token.trim();
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
    return next();
  } catch (err) {
    // If Bearer token was expired/invalid, try HttpOnly cookie as fallback if different
    if (req.cookies && req.cookies.token && req.cookies.token !== token && req.cookies.token !== 'null' && req.cookies.token !== 'undefined') {
      try {
        const decoded = jwt.verify(req.cookies.token.trim(), JWT_SECRET);
        req.user = decoded;
        return next();
      } catch (cookieErr) {
        // Fall through to 401
      }
    }

    return res.status(401).json({
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

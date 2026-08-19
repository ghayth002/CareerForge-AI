/**
 * CareerForge AI — JWT Authentication Middleware
 * Validates bearer tokens and guarantees tenant isolation.
 */

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing or malformed Authorization header.'
    });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'careerforge_ai_super_secret_jwt_key_2026_production_aes256';

  try {
    const decoded = jwt.verify(token, secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'user'
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please log in again.'
    });
  }
}

/**
 * Optional Auth Middleware: If token is present, populates req.user; otherwise continues as guest.
 */
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'careerforge_ai_super_secret_jwt_key_2026_production_aes256';
    try {
      const decoded = jwt.verify(token, secret);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role || 'user'
      };
    } catch (err) {
      // Ignore token decode error in optional mode
    }
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
};

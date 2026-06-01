/**
 * Role-based access control middleware.
 * Restricts route access to users with specified roles.
 * Must be used after the authenticate middleware.
 */

// Returns middleware that only allows users with one of the specified roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      });
    }
    next();
  };
}

module.exports = { requireRole };

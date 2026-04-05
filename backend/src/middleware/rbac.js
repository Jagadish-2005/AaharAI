/**
 * Role-Based Access Control middleware.
 * Usage: rbac('admin'), rbac('vendor'), rbac('admin', 'super_admin')
 */
export function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
}

// Convenience middleware
export const adminOnly = rbac('admin', 'super_admin');
export const vendorOnly = rbac('vendor');
export const anyAuthenticated = rbac('admin', 'super_admin', 'vendor');

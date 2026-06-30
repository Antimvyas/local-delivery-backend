const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
      errorCode: 'NO_TOKEN_PROVIDED'
    });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token format.',
      errorCode: 'INVALID_TOKEN_FORMAT'
    });
  }
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      errorCode: 'TOKEN_EXPIRED'
    });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Forbidden role.',
        errorCode: 'ROLE_FORBIDDEN'
      });
    }
    next();
  };
};

const requireCustomerOwnership = (req, res, next) => {
  const customerId = req.params.customer_id || req.params.id || req.query.customer_id || req.body.customer_id;
  if (customerId && parseInt(customerId, 10) !== parseInt(req.user.user_id, 10)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. You do not own this resource.',
      errorCode: 'RESOURCE_OWNERSHIP_MISMATCH'
    });
  }
  next();
};

const requireVendorOwnership = (req, res, next) => {
  const vendorId = req.params.vendor_id || req.params.vendorId || req.params.id || req.query.vendor_id || req.query.vendorId || req.body.vendor_id || req.body.vendorId;
  if (vendorId && parseInt(vendorId, 10) !== parseInt(req.user.user_id, 10)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. You do not own this resource.',
      errorCode: 'RESOURCE_OWNERSHIP_MISMATCH'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  requireRole,
  requireCustomerOwnership,
  requireVendorOwnership
};

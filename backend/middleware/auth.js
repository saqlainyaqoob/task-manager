// Why this file exists: decides WHO is calling.
//  - Logged in:  "Authorization: Bearer <token>"  -> req.user
//  - Guest:      "X-Guest-Id: <random id>"        -> req.guestId
const jwt = require('jsonwebtoken');

exports.identify = (req, res, next) => {
  const header = req.headers.authorization;
  if (header) {
    try {
      const payload = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
      req.user = { id: Number(payload.sub) };
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
  const guestId = req.headers['x-guest-id'];
  if (guestId && /^[A-Za-z0-9-]{8,64}$/.test(guestId)) {
    req.guestId = guestId;
    return next();
  }
  res.status(400).json({ error: 'Send an Authorization token or an X-Guest-Id header' });
};

// Authorization: only logged-in users may pass.
exports.requireAuth = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Login required' });

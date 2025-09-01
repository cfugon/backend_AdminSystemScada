// middleware/verifyToken.js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'NO_TOKEN' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ message: 'INVALID_TOKEN ' });
    }
    req.user = user;
    next();
  });
}

module.exports = verifyToken;

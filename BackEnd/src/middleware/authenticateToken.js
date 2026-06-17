// NOTA: Este archivo es código legacy. No se usa en ninguna ruta activa.
// Se mantiene por referencia. La autenticación real usa verifyToken.js.

import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

export default authenticateToken;

export class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export function handleAuthenticationError(err, _req, res, next) {
  if (err instanceof AuthenticationError) {
    return res.status(401).json({ error: err.message });
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  next(err);
}

import jwt from 'jsonwebtoken';

// Règle de sécurité du repo : jamais de secret en dur — JWT_SECRET vient de l'environnement.
const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  console.warn('JWT_SECRET manquant dans .env — l\'authentification usager échouera.');
}

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), username: user.username }, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

import jwt from 'jsonwebtoken';
import type { JwtPayload, User } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  console.warn('JWT_SECRET manquant dans .env, l\'authentification usager échouera.');
}

export function signToken(user: Pick<User, '_id' | 'username'>): string {
  return jwt.sign(
    { sub: String(user._id), username: user.username },
    JWT_SECRET as string,
    { expiresIn: EXPIRES_IN },
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
}

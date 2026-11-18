import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign({ ...payload, tokenType: 'access' }, env.JWT_SECRET, { expiresIn: '15m' });
};

export const signRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign({ ...payload, tokenType: 'refresh' }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const verifyToken = (token: string, secret: string, tokenType: 'access' | 'refresh'): TokenPayload | null => {
  try {
    const payload = jwt.verify(token, secret);
    if (
      typeof payload === 'string' ||
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      (payload.role !== 'USER' && payload.role !== 'ADMIN') ||
      payload.tokenType !== tokenType
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  return verifyToken(token, env.JWT_SECRET, 'access');
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  return verifyToken(token, env.JWT_REFRESH_SECRET, 'refresh');
};

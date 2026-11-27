import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

type TokenType = 'access' | 'refresh';

const signToken = (payload: TokenPayload, tokenType: TokenType, expiresIn: '15m' | '7d'): string => {
  const secret = tokenType === 'access' ? env.JWT_SECRET : env.JWT_REFRESH_SECRET;
  const claims = {
    ...payload,
    tokenType,
    ...(tokenType === 'refresh' ? { jti: randomUUID() } : {}),
  };
  return jwt.sign(claims, secret, { expiresIn });
};

const verifyToken = (token: string, tokenType: TokenType): TokenPayload | null => {
  try {
    const secret = tokenType === 'access' ? env.JWT_SECRET : env.JWT_REFRESH_SECRET;
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

    return { userId: payload.userId, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
};

export const signAccessToken = (payload: TokenPayload): string => signToken(payload, 'access', '15m');
export const signRefreshToken = (payload: TokenPayload): string => signToken(payload, 'refresh', '7d');
export const verifyAccessToken = (token: string): TokenPayload | null => verifyToken(token, 'access');
export const verifyRefreshToken = (token: string): TokenPayload | null => verifyToken(token, 'refresh');
import type { RequestHandler } from 'express';
import prisma from '../config/database';
import { AuthError } from '../services/auth.service';
import { verifyAccessToken } from '../utils/jwt';

export const authenticate: RequestHandler = async (req, _res, next) => {
  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : undefined;
  if (!token) throw new AuthError('Authentication is required.', 401, 'UNAUTHENTICATED');

  const payload = verifyAccessToken(token);
  if (!payload) throw new AuthError('Access token is invalid or expired.', 401, 'INVALID_ACCESS_TOKEN');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, status: true, isVerified: true },
  });
  if (!user) throw new AuthError('User account was not found.', 401, 'USER_NOT_FOUND');
  if (user.status === 'SUSPENDED') {
    throw new AuthError('This account has been suspended.', 403, 'ACCOUNT_SUSPENDED');
  }
  if (!user.isVerified) {
    throw new AuthError('Verify your email address to continue.', 403, 'EMAIL_NOT_VERIFIED');
  }

  req.authUser = { userId: user.id, email: user.email, role: user.role };
  next();
};

export const requireRole = (...roles: Array<'USER' | 'ADMIN'>): RequestHandler => (req, _res, next) => {
  if (!req.authUser) throw new AuthError('Authentication is required.', 401, 'UNAUTHENTICATED');
  if (!roles.includes(req.authUser.role)) {
    throw new AuthError('You are not authorized to perform this action.', 403, 'FORBIDDEN');
  }
  next();
};
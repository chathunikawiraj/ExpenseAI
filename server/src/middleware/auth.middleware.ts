import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  void (async () => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const token = bearerToken || req.cookies?.accessToken;

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Missing access token.' });
      return;
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired access token.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, status: true, isVerified: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found.' });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({ error: 'Forbidden: Account suspended by administrator.' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ error: 'Forbidden: Email verification is required.', code: 'EMAIL_NOT_VERIFIED' });
      return;
    }

    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  })().catch(next);
};

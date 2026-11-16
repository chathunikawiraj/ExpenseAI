import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { dbStore } from '../data/store';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Missing access token' });
      return;
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired access token' });
      return;
    }

    // Verify user exists and is ACTIVE
    const user = dbStore.users.find((u) => u.id === payload.userId);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found' });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({ error: 'Forbidden: Account suspended by administrator (FR-36)' });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: Authentication failed' });
  }
};

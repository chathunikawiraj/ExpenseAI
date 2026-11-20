import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { comparePassword, hashPassword } from '../utils/hash';
import { createOpaqueToken, hashToken } from '../utils/authTokens';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email.service';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: REFRESH_TOKEN_TTL_MS,
};

const clearRefreshCookie = (res: Response): void => {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions;
  res.clearCookie('refreshToken', options);
};

const verificationUrl = (token: string): string =>
  `${env.CLIENT_URL.replace(/\/$/, '')}/verify-email?token=${token}`;

const passwordResetUrl = (token: string): string =>
  `${env.CLIENT_URL.replace(/\/$/, '')}/reset-password?token=${token}`;

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const getUserId = (req: AuthenticatedRequest): string | undefined => req.user?.userId;

const toPublicUser = (user: {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  currency: string;
  monthlyIncome: Prisma.Decimal;
  isVerified: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  currency: user.currency,
  monthlyIncome: user.monthlyIncome.toNumber(),
  isVerified: user.isVerified,
  status: user.status,
});

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const { name, password, currency, monthlyIncome } = req.body;
    const email = String(req.body.email).trim().toLowerCase();
    const verificationToken = createOpaqueToken();

    try {
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email,
          passwordHash: await hashPassword(password),
          currency: currency?.toUpperCase() ?? 'USD',
          monthlyIncome: monthlyIncome ?? 0,
          verificationToken: hashToken(verificationToken),
          verificationExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
        },
      });

      await sendVerificationEmail(user.email, verificationUrl(verificationToken));

      res.status(201).json({
        message: 'Account created. Check your email to verify your address before signing in.',
        requiresEmailVerification: true,
        user: toPublicUser(user),
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }
      throw error;
    }
  }

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    const tokenHash = hashToken(req.body.token);
    const now = new Date();
    const result = await prisma.user.updateMany({
      where: {
        verificationToken: tokenHash,
        verificationExpiresAt: { gt: now },
        isVerified: false,
      },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationExpiresAt: null,
      },
    });

    if (result.count !== 1) {
      res.status(400).json({ error: 'Email verification link is invalid, expired, or already used.' });
      return;
    }

    res.status(200).json({ message: 'Email verified successfully. You may now sign in.' });
  }

  static async resendVerificationEmail(req: Request, res: Response): Promise<void> {
    const email = String(req.body.email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.isVerified && user.status === 'ACTIVE') {
      const token = createOpaqueToken();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: hashToken(token),
          verificationExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
        },
      });
      await sendVerificationEmail(user.email, verificationUrl(token));
    }

    res.status(200).json({
      message: 'If an unverified active account exists with this email, a verification link has been sent.',
    });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const email = String(req.body.email).trim().toLowerCase();
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password credentials.' });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({ error: 'Account suspended. Please contact an administrator.' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ error: 'Please verify your email address before signing in.', code: 'EMAIL_NOT_VERIFIED' });
      return;
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
    res.status(200).json({
      message: 'Authentication successful.',
      accessToken,
      user: toPublicUser(user),
    });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    clearRefreshCookie(res);
    res.status(200).json({ message: 'Successfully logged out.' });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: 'Missing refresh token cookie.' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      clearRefreshCookie(res);
      res.status(401).json({ error: 'Expired or invalid refresh token.' });
      return;
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    const now = new Date();

    if (!stored || stored.revokedAt || stored.expiresAt <= now || stored.userId !== payload.userId) {
      clearRefreshCookie(res);
      res.status(401).json({ error: 'Expired, invalid, or revoked refresh token.' });
      return;
    }

    if (stored.user.status !== 'ACTIVE' || !stored.user.isVerified) {
      clearRefreshCookie(res);
      res.status(403).json({ error: 'Account is suspended or email verification is required.' });
      return;
    }

    const nextPayload = {
      userId: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    };
    const nextRefreshToken = signRefreshToken(nextPayload);
    const rotated = await prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) return false;

      await transaction.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: hashToken(nextRefreshToken),
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      });
      return true;
    });

    if (!rotated) {
      clearRefreshCookie(res);
      res.status(401).json({ error: 'Refresh token has already been used.' });
      return;
    }

    res.cookie('refreshToken', nextRefreshToken, refreshCookieOptions);
    res.status(200).json({ accessToken: signAccessToken(nextPayload) });
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const email = String(req.body.email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.status === 'ACTIVE') {
      const token = createOpaqueToken();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: hashToken(token),
          resetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      await sendPasswordResetEmail(user.email, passwordResetUrl(token));
    }

    res.status(200).json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, newPassword } = req.body;
    const tokenHash = hashToken(token);
    const user = await prisma.user.findUnique({ where: { resetToken: tokenHash } });

    if (!user || !user.resetExpiresAt || user.resetExpiresAt <= new Date()) {
      res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    const reset = await prisma.$transaction(async (transaction) => {
      const result = await transaction.user.updateMany({
        where: {
          id: user.id,
          resetToken: tokenHash,
          resetExpiresAt: { gt: new Date() },
        },
        data: { passwordHash, resetToken: null, resetExpiresAt: null },
      });

      if (result.count !== 1) return false;

      await transaction.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return true;
    });

    if (!reset) {
      res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
      return;
    }

    res.status(200).json({ message: 'Password reset successfully. You may now log in.' });
  }

  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.status(200).json(toPublicUser(user));
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const { name, email, monthlyIncome, currency } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const emailChanged = Boolean(normalizedEmail && normalizedEmail !== currentUser.email);
    const verificationToken = emailChanged ? createOpaqueToken() : undefined;

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(normalizedEmail && emailChanged ? {
            email: normalizedEmail,
            isVerified: false,
            verificationToken: hashToken(verificationToken!),
            verificationExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
          } : {}),
          ...(monthlyIncome !== undefined ? { monthlyIncome } : {}),
          ...(currency !== undefined ? { currency: currency.toUpperCase() } : {}),
        },
      });

      if (emailChanged && verificationToken) {
        await prisma.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await sendVerificationEmail(user.email, verificationUrl(verificationToken));
      }

      res.status(200).json({
        message: 'Profile updated successfully.',
        emailChanged,
        user: toPublicUser(user),
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }
      throw error;
    }
  }

  static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    await prisma.user.delete({ where: { id: userId } });
    clearRefreshCookie(res);
    res.status(200).json({ message: 'User account and associated financial records permanently deleted.' });
  }
}

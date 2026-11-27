import { Prisma, type User } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { env } from '../config/env';
import { sendPasswordResetEmail, sendVerificationEmail } from './email.service';
import { createOpaqueToken, hashToken } from '../utils/authTokens';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import type { TokenPayload } from '../utils/jwt';
import type { RegisterInput, UpdateProfileInput } from '../validators/auth.validator';
import {
  drainReceiptStorageCleanupQueue,
  enqueueReceiptStorageCleanup,
} from './receipt-cleanup.service';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const SALT_ROUNDS = 12;

export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  currency: string;
  monthlyIncome: number;
  status: 'ACTIVE' | 'SUSPENDED';
  isVerified: boolean;
}

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  currency: user.currency,
  monthlyIncome: Number(user.monthlyIncome ?? 0),
  status: user.status,
  isVerified: user.isVerified,
});

const createVerificationUrl = (token: string): string =>
  `${env.FRONTEND_URL.replace(/\/$/, '')}/verify-email?token=${token}`;

const createPasswordResetUrl = (token: string): string =>
  `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${token}`;

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const createSession = async (user: User) => {
  const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken: signAccessToken(payload), refreshToken, user: toPublicUser(user) };
};

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const verificationToken = createOpaqueToken();
  let user: User;
  try {
    user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS),
        currency: input.currency?.toUpperCase() ?? 'LKR',
        monthlyIncome: input.monthlyIncome,
        isVerified: false,
        verificationToken: hashToken(verificationToken),
        verificationExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AuthError('An account with this email already exists.', 409, 'EMAIL_ALREADY_EXISTS');
    }
    throw error;
  }

  await sendVerificationEmail(user.email, createVerificationUrl(verificationToken));
  return toPublicUser(user);
}

export async function verifyEmail(token: string): Promise<void> {
  const result = await prisma.user.updateMany({
    where: {
      verificationToken: hashToken(token),
      verificationExpiresAt: { gt: new Date() },
      isVerified: false,
    },
    data: {
      isVerified: true,
      verificationToken: null,
      verificationExpiresAt: null,
    },
  });

  if (result.count !== 1) {
    throw new AuthError('Email verification link is invalid, expired, or already used.', 400, 'INVALID_TOKEN');
  }
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isVerified || user.status !== 'ACTIVE') return;

  const token = createOpaqueToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken: hashToken(token),
      verificationExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });
  await sendVerificationEmail(user.email, createVerificationUrl(token));
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AuthError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }
  if (user.status === 'SUSPENDED') {
    throw new AuthError('This account has been suspended.', 403, 'ACCOUNT_SUSPENDED');
  }
  if (!user.isVerified) {
    throw new AuthError('Verify your email address before signing in.', 403, 'EMAIL_NOT_VERIFIED');
  }

  return createSession(user);
}

export async function refreshSession(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) throw new AuthError('Refresh token is invalid or expired.', 401, 'INVALID_REFRESH_TOKEN');

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });
  const now = new Date();
  if (
    !stored ||
    stored.revokedAt ||
    stored.expiresAt <= now ||
    stored.userId !== payload.userId
  ) {
    throw new AuthError('Refresh token is invalid, expired, or revoked.', 401, 'INVALID_REFRESH_TOKEN');
  }
  if (stored.user.status !== 'ACTIVE' || !stored.user.isVerified) {
    throw new AuthError('Account is suspended or email verification is required.', 403, 'ACCOUNT_INACTIVE');
  }

  const nextPayload: TokenPayload = {
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

  if (!rotated) throw new AuthError('Refresh token has already been used.', 401, 'INVALID_REFRESH_TOKEN');

  return {
    accessToken: signAccessToken(nextPayload),
    refreshToken: nextRefreshToken,
  };
}

export async function revokeRefreshToken(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') return;

  const token = createOpaqueToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashToken(token),
      resetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });
  await sendPasswordResetEmail(user.email, createPasswordResetUrl(token));
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const user = await prisma.user.findUnique({ where: { resetToken: tokenHash } });
  if (!user || !user.resetExpiresAt || user.resetExpiresAt <= new Date()) {
    throw new AuthError('Password reset link is invalid or has expired.', 400, 'INVALID_TOKEN');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const now = new Date();
  const completed = await prisma.$transaction(async (transaction) => {
    const result = await transaction.user.updateMany({
      where: {
        id: user.id,
        resetToken: tokenHash,
        resetExpiresAt: { gt: now },
      },
      data: { passwordHash, resetToken: null, resetExpiresAt: null },
    });
    if (result.count !== 1) return false;

    await transaction.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: now },
    });
    return true;
  });

  if (!completed) throw new AuthError('Password reset link is invalid or has expired.', 400, 'INVALID_TOKEN');
}

export async function getAuthenticatedUser(payload: TokenPayload): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AuthError('User not found.', 401, 'USER_NOT_FOUND');
  if (user.status === 'SUSPENDED') throw new AuthError('This account has been suspended.', 403, 'ACCOUNT_SUSPENDED');
  if (!user.isVerified) throw new AuthError('Verify your email address to continue.', 403, 'EMAIL_NOT_VERIFIED');
  return toPublicUser(user);
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUser> {
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) throw new AuthError('User not found.', 404, 'USER_NOT_FOUND');

  const emailChanged = input.email !== undefined && input.email !== currentUser.email;
  const verificationToken = emailChanged ? createOpaqueToken() : '';
  let updatedUser: User;

  try {
    updatedUser = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.currency !== undefined ? { currency: input.currency.toUpperCase() } : {}),
          ...(input.monthlyIncome !== undefined ? { monthlyIncome: input.monthlyIncome } : {}),
          ...(emailChanged
            ? {
                isVerified: false,
                verificationToken: hashToken(verificationToken),
                verificationExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
              }
            : {}),
        },
      });

      if (emailChanged) {
        await transaction.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return updated;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AuthError('An account with this email already exists.', 409, 'EMAIL_ALREADY_EXISTS');
    }
    throw error;
  }

  if (emailChanged) {
    await sendVerificationEmail(updatedUser.email, createVerificationUrl(verificationToken));
  }

  return toPublicUser(updatedUser);
}

export async function changeAuthenticatedPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string }
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthError('User not found.', 404, 'USER_NOT_FOUND');
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw new AuthError('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
  }
  if (await bcrypt.compare(input.newPassword, user.passwordHash)) {
    throw new AuthError('New password must differ from the current password.', 400, 'PASSWORD_UNCHANGED');
  }

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);
}

export async function deleteAuthenticatedAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthError('User not found.', 404, 'USER_NOT_FOUND');

  await prisma.$transaction(async (transaction) => {
    const receipts = await transaction.receipt.findMany({ where: { userId } });
    for (const receipt of receipts) {
      await enqueueReceiptStorageCleanup(transaction, receipt);
    }
    await transaction.user.delete({ where: { id: userId } });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  await drainReceiptStorageCleanupQueue().catch((error: unknown) => {
    console.error('[ExpenseAI receipt cleanup] Account deletion cleanup remains queued:', error);
  });
}
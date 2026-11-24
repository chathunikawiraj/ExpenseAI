import type { RequestHandler } from 'express';
import {
  getAuthenticatedUser,
  loginUser,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  revokeRefreshToken,
  updateUserProfile,
  verifyEmail,
  changeAuthenticatedPassword,
  deleteAuthenticatedAccount,
} from '../services/auth.service';
import { AuthError } from '../services/auth.service';
import { env } from '../config/env';

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: REFRESH_COOKIE_MAX_AGE,
};

const clearRefreshCookie = (res: Parameters<RequestHandler>[1]): void => {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions;
  res.clearCookie('refreshToken', options);
};

export const register: RequestHandler = async (req, res) => {
  const user = await registerUser(req.body);
  res.status(201).json({
    message: 'Account created. Check your email to verify your address before signing in.',
    requiresEmailVerification: true,
    user,
  });
};

export const verify: RequestHandler = async (req, res) => {
  await verifyEmail(req.body.token);
  res.status(200).json({ message: 'Email verified successfully. You may now sign in.' });
};

export const resendVerification: RequestHandler = async (req, res) => {
  await resendVerificationEmail(req.body.email);
  res.status(200).json({
    message: 'If an unverified active account exists with this email, a verification link has been sent.',
  });
};

export const login: RequestHandler = async (req, res) => {
  const session = await loginUser(req.body.email, req.body.password);
  res.cookie('refreshToken', session.refreshToken, refreshCookieOptions);
  res.status(200).json({
    message: 'Authentication successful.',
    accessToken: session.accessToken,
    user: session.user,
  });
};

export const refresh: RequestHandler = async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) throw new AuthError('Missing refresh token cookie.', 401, 'MISSING_REFRESH_TOKEN');

  try {
    const session = await refreshSession(token);
    res.cookie('refreshToken', session.refreshToken, refreshCookieOptions);
    res.status(200).json({ accessToken: session.accessToken });
  } catch (error) {
    if (error instanceof AuthError && error.statusCode === 401) clearRefreshCookie(res);
    throw error;
  }
};

export const logout: RequestHandler = async (req, res) => {
  await revokeRefreshToken(req.cookies?.refreshToken as string | undefined);
  clearRefreshCookie(res);
  res.status(200).json({ message: 'Successfully logged out.' });
};

export const forgotPassword: RequestHandler = async (req, res) => {
  await requestPasswordReset(req.body.email);
  res.status(200).json({
    message: 'If an account exists with this email, a password reset link has been sent.',
  });
};

export const completePasswordReset: RequestHandler = async (req, res) => {
  await resetPassword(req.body.token, req.body.newPassword);
  res.status(200).json({ message: 'Password reset successfully. You may now sign in.' });
};

export const me: RequestHandler = async (req, res) => {
  if (!req.authUser) throw new AuthError('Authentication is required.', 401, 'UNAUTHENTICATED');
  const user = await getAuthenticatedUser(req.authUser);
  res.status(200).json(user);
};

export const updateProfile: RequestHandler = async (req, res) => {
  if (!req.authUser) throw new AuthError('Authentication is required.', 401, 'UNAUTHENTICATED');
  const user = await updateUserProfile(req.authUser.userId, req.body);
  res.status(200).json({
    message: user.isVerified
      ? 'Profile updated successfully.'
      : 'Profile updated. Check your new email address to verify it before signing in again.',
    user,
  });
};

export const changePassword: RequestHandler = async (req, res) => {
  if (!req.authUser) throw new AuthError('Authentication is required.', 401, 'UNAUTHENTICATED');
  await changeAuthenticatedPassword(req.authUser.userId, req.body);
  res.status(200).json({ message: 'Password changed successfully. Sign in again.' });
};

export const deleteAccount: RequestHandler = async (req, res) => {
  if (!req.authUser) throw new AuthError('Authentication is required.', 401, 'UNAUTHENTICATED');
  await deleteAuthenticatedAccount(req.authUser.userId);
  clearRefreshCookie(res);
  res.status(200).json({ message: 'Account deleted successfully.' });
};

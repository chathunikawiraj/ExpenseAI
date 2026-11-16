import { Request, Response } from 'express';
import { dbStore, DBUser } from '../data/store';
import { hashPassword, comparePassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  // POST /auth/register (FR-01, FR-02)
  static async register(req: Request, res: Response): Promise<void> {
    const { name, email, password, currency, monthlyIncome } = req.body;

    // Check duplicate email
    const existing = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Password validation: at least 8 characters, letter and number (FR-01)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400).json({
        error: 'Password must have at least 8 characters including at least one letter and one number.',
      });
      return;
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = Math.random().toString(36).substring(2, 15);

    const newUser: DBUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'USER',
      currency: currency || 'USD',
      monthlyIncome: Number(monthlyIncome) || 0,
      isVerified: true, // For smooth demo flow, accounts are verified (can test verification route via /auth/verify-email)
      status: 'ACTIVE',
      verificationToken,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbStore.users.push(newUser);

    const accessToken = signAccessToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });
    const refreshToken = signRefreshToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (FR-03)
    });

    res.status(201).json({
      message: 'Account successfully registered.',
      accessToken,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        currency: newUser.currency,
        monthlyIncome: newUser.monthlyIncome,
      },
    });
  }

  // POST /auth/login (FR-03)
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    const user = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Generic error to avoid account enumeration (FR-03)
      res.status(401).json({ error: 'Invalid email or password credentials.' });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({ error: 'Account suspended. Please contact administrator (FR-36).' });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password credentials.' });
      return;
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token
    dbStore.refreshTokens.push({
      id: `rt_${Date.now()}`,
      userId: user.id,
      tokenHash: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Authentication successful.',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        currency: user.currency,
        monthlyIncome: user.monthlyIncome,
      },
    });
  }

  // POST /auth/logout (FR-04)
  static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const stored = dbStore.refreshTokens.find((t) => t.tokenHash === refreshToken);
      if (stored) {
        stored.revokedAt = new Date();
      }
    }
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Successfully logged out. Refresh token invalidated (FR-04).' });
  }

  // POST /auth/refresh (FR-03)
  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: 'Missing refresh token cookie.' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({ error: 'Expired or invalid refresh token.' });
      return;
    }

    const stored = dbStore.refreshTokens.find((t) => t.tokenHash === refreshToken && !t.revokedAt);
    if (!stored) {
      res.status(401).json({ error: 'Revoked refresh token.' });
      return;
    }

    const user = dbStore.users.find((u) => u.id === payload.userId);
    if (!user || user.status === 'SUSPENDED') {
      res.status(403).json({ error: 'User inactive or suspended.' });
      return;
    }

    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({ accessToken: newAccessToken });
  }

  // POST /auth/forgot-password (FR-05)
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    const user = dbStore.users.find((u) => u.email.toLowerCase() === email?.toLowerCase());
    if (user) {
      user.resetToken = Math.random().toString(36).substring(2, 15);
      user.resetExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins (FR-05)
    }

    // Do not reveal whether email exists (FR-05)
    res.status(200).json({
      message: 'If an account exists with this email, a single-use 30-minute password reset link has been dispatched.',
    });
  }

  // POST /auth/reset-password (FR-05)
  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, newPassword } = req.body;
    const user = dbStore.users.find(
      (u) => u.resetToken === token && u.resetExpiresAt && u.resetExpiresAt > new Date()
    );

    if (!user) {
      res.status(400).json({ error: 'Password reset link is invalid or has expired (FR-05).' });
      return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({ error: 'Password must have at least 8 characters including letter and number.' });
      return;
    }

    user.passwordHash = await hashPassword(newPassword);
    user.resetToken = null;
    user.resetExpiresAt = null;

    res.status(200).json({ message: 'Password reset successfully. You may now log in.' });
  }

  // GET /auth/me
  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = dbStore.users.find((u) => u.id === req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      currency: user.currency,
      monthlyIncome: user.monthlyIncome,
      isVerified: user.isVerified,
      status: user.status,
    });
  }

  // PUT /auth/profile (FR-07)
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = dbStore.users.find((u) => u.id === req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const { name, email, monthlyIncome, currency } = req.body;
    if (name) user.name = name.trim();
    if (currency) user.currency = currency;
    if (monthlyIncome !== undefined) user.monthlyIncome = Number(monthlyIncome);

    let emailChanged = false;
    if (email && email.toLowerCase() !== user.email) {
      user.email = email.toLowerCase().trim();
      user.isVerified = false; // Re-verification required (FR-07)
      user.verificationToken = Math.random().toString(36).substring(2, 15);
      emailChanged = true;
    }

    user.updatedAt = new Date();

    res.status(200).json({
      message: 'Profile updated successfully.',
      emailChanged,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyIncome: user.monthlyIncome,
        isVerified: user.isVerified,
      },
    });
  }

  // DELETE /auth/account (FR-06)
  static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Cascade remove all records scoped to user (FR-06)
    dbStore.users = dbStore.users.filter((u) => u.id !== userId);
    dbStore.incomes = dbStore.incomes.filter((i) => i.userId !== userId);
    dbStore.expenses = dbStore.expenses.filter((e) => e.userId !== userId);
    dbStore.budgets = dbStore.budgets.filter((b) => b.userId !== userId);
    dbStore.savingsGoals = dbStore.savingsGoals.filter((g) => g.userId !== userId);
    dbStore.notifications = dbStore.notifications.filter((n) => n.userId !== userId);
    dbStore.insights = dbStore.insights.filter((ins) => ins.userId !== userId);

    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'User account and all associated financial records permanently purged (FR-06).' });
  }
}

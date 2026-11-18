import { RequestHandler, Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  emailSchemaBody,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '../validators/auth.validator';

const router = Router();
const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.post('/register', authRateLimiter, validate(registerSchema), asyncRoute(AuthController.register));
router.post('/verify-email', authRateLimiter, validate(verifyEmailSchema), asyncRoute(AuthController.verifyEmail));
router.post('/resend-verification', authRateLimiter, validate(emailSchemaBody), asyncRoute(AuthController.resendVerificationEmail));
router.post('/login', authRateLimiter, validate(loginSchema), asyncRoute(AuthController.login));
router.post('/logout', asyncRoute(AuthController.logout));
router.post('/refresh', asyncRoute(AuthController.refresh));
router.post('/forgot-password', authRateLimiter, validate(emailSchemaBody), asyncRoute(AuthController.forgotPassword));
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), asyncRoute(AuthController.resetPassword));

router.get('/me', authenticate, asyncRoute(AuthController.getMe));
router.put('/profile', authenticate, validate(updateProfileSchema), asyncRoute(AuthController.updateProfile));
router.delete('/account', authenticate, asyncRoute(AuthController.deleteAccount));

export default router;

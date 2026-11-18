
import { Router } from "express";
import {
  completePasswordReset,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resendVerification,
  verify,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.validator";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === "production" ? 5 : 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

router.post("/register", authLimiter, validateBody(registerSchema), register);
router.post("/verify-email", authLimiter, validateBody(verifyEmailSchema), verify);
router.post("/resend-verification", authLimiter, validateBody(emailOnlySchema), resendVerification);
router.post("/login", authLimiter, validateBody(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", authLimiter, validateBody(emailOnlySchema), forgotPassword);
router.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), completePasswordReset);
router.get("/me", authenticate, me);

export default router;

import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../../middleware/authenticate';
import { authLimiter } from '../../../middleware/rateLimiter';
import { validateBody } from '../../../middleware/validate';
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@flowboard/shared';
import { z } from 'zod';

const router = Router();

router.post('/signup', authLimiter, validateBody(signupSchema), authController.signup);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.patch(
  '/reset-password/:token',
  authLimiter,
  validateBody(z.object({ password: z.string().min(8) })),
  authController.resetPassword
);
router.post(
  '/verify-email',
  validateBody(z.object({ token: z.string() })),
  authController.verifyEmail
);

// Protected
router.get('/me', authenticate, authController.getMe);
router.get('/sessions', authenticate, authController.getSessions);
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);

export default router;

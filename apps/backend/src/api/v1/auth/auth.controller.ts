import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../../utils/response';
import { config } from '../../../config';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(config.jwt.refreshCookieName, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(config.jwt.refreshCookieName, {
    httpOnly: true,
    path: '/api/v1/auth',
  });
}

export const authController = {
  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body as { name: string; email: string; password: string };
      const result = await authService.signup(name, email, password);
      sendSuccess(res, result, 201);
    } catch (err) { next(err); }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const { user, accessToken, refreshToken } = await authService.login(
        email,
        password,
        req.ip,
        req.get('user-agent')
      );
      setRefreshCookie(res, refreshToken);
      sendSuccess(res, {
        user,
        accessToken,
        expiresIn: 15 * 60,
      });
    } catch (err) { next(err); }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies[config.jwt.refreshCookieName] as string | undefined;
      if (!token) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
        return;
      }
      const { accessToken } = await authService.refreshTokens(token);
      sendSuccess(res, { accessToken, expiresIn: 15 * 60 });
    } catch (err) { next(err); }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies[config.jwt.refreshCookieName] as string | undefined;
      if (token) await authService.logout(token);
      clearRefreshCookie(res);
      sendSuccess(res, { message: 'Signed out' });
    } catch (err) { next(err); }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body as { email: string };
      await authService.forgotPassword(email);
      sendSuccess(res, { message: 'If that email exists, a reset link was sent.' });
    } catch (err) { next(err); }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const { password } = req.body as { password: string };
      await authService.resetPassword(token, password);
      sendSuccess(res, { message: 'Password reset successfully' });
    } catch (err) { next(err); }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body as { token: string };
      await authService.verifyEmail(token);
      sendSuccess(res, { message: 'Email verified successfully' });
    } catch (err) { next(err); }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe((req as unknown as AuthenticatedRequest).user.id);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await authService.getSessions((req as unknown as AuthenticatedRequest).user.id);
      sendSuccess(res, sessions);
    } catch (err) { next(err); }
  },

  async revokeSession(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.revokeSession(
        (req as unknown as AuthenticatedRequest).user.id,
        req.params.sessionId
      );
      sendSuccess(res, { message: 'Session revoked' });
    } catch (err) { next(err); }
  },
};

import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/AppError';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) =>
    next(AppError.tooManyRequests('Too many auth attempts. Please wait 15 minutes.')),
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
});

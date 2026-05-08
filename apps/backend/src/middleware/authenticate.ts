import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('No token provided');
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, name: true, status: true },
    });

    if (!user) throw AppError.unauthorized('User not found');
    if (user.status === 'SUSPENDED') throw AppError.forbidden('Account suspended');

    (req as unknown as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: payload.role,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(AppError.unauthorized('Invalid or expired token'));
  }
}

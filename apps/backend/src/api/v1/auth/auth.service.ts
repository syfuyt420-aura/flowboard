import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../lib/prisma';
import { redis } from '../../../lib/redis';
import { config } from '../../../config';
import { AppError } from '../../../utils/AppError';
import { emailQueue } from '../../../workers/email.worker';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function signAccessToken(userId: string, email: string, name: string, role: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (jwt as any).sign(
    { sub: userId, email, name, role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  ) as string;
}

function signRefreshToken(sessionId: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (jwt as any).sign(
    { sub: sessionId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  ) as string;
}

export const authService = {
  async signup(name: string, email: string, password: string, ipAddress?: string, userAgent?: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw AppError.conflict('Email already registered');

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    // Auto-activate: no email verification required
    const user = await prisma.user.create({
      data: { name, email, passwordHash, status: 'ACTIVE' },
    });

    // Immediately create a session so the user is logged in after signup
    const tokens = await this.createSession(user.id, user.email, user.name, 'MEMBER', ipAddress, userAgent);

    return { user, workspaceRole: 'MEMBER', ...tokens };
  },

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const lockKey = `auth:lock:${email}`;
    const locked = await redis.get(lockKey);
    if (locked) {
      throw AppError.tooManyRequests('Account temporarily locked. Try again later.');
    }

    const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });
    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      const attempts = user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts },
      });
      if (attempts >= config.accountLockAttempts) {
        await redis.setex(lockKey, config.accountLockDurationMs / 1000, '1');
        await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0 } });
        throw AppError.tooManyRequests('Too many failed attempts. Account locked for 15 minutes.');
      }
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw AppError.forbidden('Please verify your email before signing in.');
    }
    if (user.status === 'SUSPENDED') {
      throw AppError.forbidden('Account suspended. Contact support.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lastLoginAt: new Date() },
    });

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { role: true },
      orderBy: { joinedAt: 'asc' },
    });

    const role = workspaceMember?.role ?? 'MEMBER';
    const tokens = await this.createSession(user.id, user.email, user.name, role, ipAddress, userAgent);

    return { user, workspaceRole: role, ...tokens };
  },

  async createSession(
    userId: string,
    email: string,
    name: string,
    role: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const sessionId = uuidv4();
    const refreshToken = signRefreshToken(sessionId);
    const accessToken = signAccessToken(userId, email, name, role);

    await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  },

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as { sub: string };
    } catch {
      throw AppError.unauthorized('Invalid refresh token');
    }

    const session = await prisma.session.findUnique({
      where: { id: payload.sub, refreshToken },
      include: { user: { select: { id: true, email: true, name: true, status: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      await prisma.session.deleteMany({ where: { id: payload.sub } });
      throw AppError.unauthorized('Session expired');
    }

    if (session.user.status === 'SUSPENDED') {
      throw AppError.forbidden('Account suspended');
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      select: { role: true },
    });
    const role = workspaceMember?.role ?? 'MEMBER';

    const accessToken = signAccessToken(
      session.user.id,
      session.user.email,
      session.user.name,
      role
    );

    return { accessToken };
  },

  async logout(refreshToken: string): Promise<void> {
    await prisma.session.deleteMany({ where: { refreshToken } });
  },

  async logoutAll(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });
    if (!user) return; // Silent to prevent email enumeration

    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: 'PASSWORD_RESET' },
    });

    const token = uuidv4();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await emailQueue.add('reset-password', { to: email, name: user.name, token });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !verificationToken ||
      verificationToken.type !== 'PASSWORD_RESET' ||
      verificationToken.expiresAt < new Date() ||
      verificationToken.usedAt
    ) {
      throw AppError.badRequest('Reset link is invalid or expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { passwordHash },
      }),
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.deleteMany({ where: { userId: verificationToken.userId } }),
    ]);
  },

  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (
      !verificationToken ||
      verificationToken.type !== 'EMAIL_VERIFICATION' ||
      verificationToken.expiresAt < new Date() ||
      verificationToken.usedAt
    ) {
      throw AppError.badRequest('Verification link is invalid or expired');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { status: 'ACTIVE' },
      }),
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        status: true,
        timezone: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw AppError.notFound('User');
    return user;
  },

  async getSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastActiveAt: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  },

  async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw AppError.notFound('Session');
    await prisma.session.delete({ where: { id: sessionId } });
  },
};

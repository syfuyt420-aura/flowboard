import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config';
import { requestId } from './middleware/requestId';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Route imports
import authRoutes from './api/v1/auth/auth.routes';
import workspacesRoutes from './api/v1/workspaces/workspaces.routes';
import projectsRoutes from './api/v1/projects/projects.routes';
import tasksRoutes from './api/v1/tasks/tasks.routes';
import analyticsRoutes from './api/v1/analytics/analytics.routes';
import notificationsRoutes from './api/v1/notifications/notifications.routes';
import aiRoutes from './api/v1/ai/ai.routes';
import automationsRoutes from './api/v1/automations/automations.routes';
import searchRoutes from './api/v1/search/search.routes';
import webhooksRoutes from './api/v1/webhooks/webhooks.routes';
import activityRoutes from './api/v1/activity/activity.routes';
import usersRoutes from './api/v1/users/users.routes';

export const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: config.frontend.url,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestId);
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === '/api/health',
  })
);
app.use(globalLimiter);

// Health check
app.get('/api/health', async (_req, res) => {
  const { prisma } = await import('./lib/prisma');
  const { redis } = await import('./lib/redis');
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisPing = await redis.ping();
    res.json({
      status: 'ok',
      db: 'connected',
      redis: redisPing === 'PONG' ? 'connected' : 'error',
      version: process.env.npm_package_version ?? '1.0.0',
      uptime: Math.floor(process.uptime()),
    });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Service unavailable' });
  }
});

// API v1 routes
const v1 = express.Router();
v1.use('/auth', authRoutes);
v1.use('/workspaces', workspacesRoutes);
v1.use('/projects', projectsRoutes);
v1.use('/tasks', tasksRoutes);
v1.use('/analytics', analyticsRoutes);
v1.use('/notifications', notificationsRoutes);
v1.use('/ai', aiRoutes);
v1.use('/automations', automationsRoutes);
v1.use('/search', searchRoutes);
v1.use('/webhooks', webhooksRoutes);
v1.use('/activity', activityRoutes);
v1.use('/users', usersRoutes);

app.use('/api/v1', v1);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use(errorHandler);

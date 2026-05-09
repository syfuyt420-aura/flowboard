import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { prisma } from '../../../lib/prisma';
import { sendSuccess } from '../../../utils/response';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';
import { z } from 'zod';
import { validateBody } from '../../../middleware/validate';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt((req.query.limit as string) ?? '30', 10), 50);

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;

    sendSuccess(res, items, 200, {
      cursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
      hasMore,
    });
  } catch (err) { next(err); }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const count = await prisma.notification.count({ where: { userId, isRead: false } });
    sendSuccess(res, { count });
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    sendSuccess(res, { message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId },
      data: { isRead: true },
    });
    sendSuccess(res, { message: 'Marked as read' });
  } catch (err) { next(err); }
});

// Members send a work-status update → creates notifications for all workspace admins/owners
router.post(
  '/send-update',
  validateBody(z.object({
    message: z.string().min(1).max(1000),
    updateType: z.enum(['PROGRESS', 'BLOCKER', 'DONE', 'QUESTION']),
  })),
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthenticatedRequest).user.id;
      const { message, updateType } = req.body as { message: string; updateType: string };

      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });

      // Find the workspace this user belongs to
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId },
        select: { workspaceId: true },
      });

      if (!membership) {
        sendSuccess(res, { message: 'No workspace found' });
        return;
      }

      // Get all admins/owners in that workspace (exclude sender)
      const admins = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: membership.workspaceId,
          role: { in: ['OWNER', 'ADMIN'] },
          userId: { not: userId },
        },
        select: { userId: true },
      });

      const titles: Record<string, string> = {
        PROGRESS: '📊 Progress Update',
        BLOCKER: '🚨 Blocker Alert',
        DONE: '✅ Work Completed',
        QUESTION: '❓ Question',
      };

      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.userId,
            type: 'MEMBER_UPDATE',
            title: `${sender?.name ?? 'A member'}: ${titles[updateType] ?? 'Work Update'}`,
            message,
            metadata: {
              senderId: userId,
              senderName: sender?.name ?? '',
              updateType,
            },
          })),
        });
      }

      // Also log activity
      await prisma.activityLog.create({
        data: {
          action: `sent a ${updateType.toLowerCase()} update`,
          entityType: 'User',
          entityId: userId,
          userId,
        },
      });

      sendSuccess(res, { message: 'Update sent to admins', adminCount: admins.length });
    } catch (err) { next(err); }
  }
);

export default router;

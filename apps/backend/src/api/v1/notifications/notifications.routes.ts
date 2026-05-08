import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { prisma } from '../../../lib/prisma';
import { sendSuccess } from '../../../utils/response';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 50);

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

export default router;

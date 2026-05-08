import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { prisma } from '../../../lib/prisma';
import { sendSuccess } from '../../../utils/response';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';

const router = Router();
router.use(authenticate);

router.get('/feed', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const limit = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 50);

    const memberProjectIds = (
      await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      })
    ).map((m: { projectId: string }) => m.projectId);

    const activity = await prisma.activityLog.findMany({
      where: { projectId: { in: memberProjectIds } },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    sendSuccess(res, activity);
  } catch (err) { next(err); }
});

export default router;

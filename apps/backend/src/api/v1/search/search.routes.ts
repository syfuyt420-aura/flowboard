import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { prisma } from '../../../lib/prisma';
import { sendSuccess } from '../../../utils/response';
import { AppError } from '../../../utils/AppError';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) throw AppError.badRequest('Query must be at least 2 characters');

    const userId = (req as unknown as AuthenticatedRequest).user.id;

    const memberProjectIds = (
      await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      })
    ).map((m: { projectId: string }) => m.projectId);

    const [projects, tasks] = await Promise.all([
      prisma.project.findMany({
        where: {
          id: { in: memberProjectIds },
          deletedAt: null,
          name: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, name: true, icon: true, color: true },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: memberProjectIds },
          deletedAt: null,
          title: { contains: q, mode: 'insensitive' },
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          project: { select: { id: true, name: true, icon: true } },
        },
        take: 10,
      }),
    ]);

    sendSuccess(res, { projects, tasks });
  } catch (err) { next(err); }
});

export default router;

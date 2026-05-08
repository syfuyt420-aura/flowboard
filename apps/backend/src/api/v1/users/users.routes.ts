import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { prisma } from '../../../lib/prisma';
import { sendSuccess } from '../../../utils/response';
import { AppError } from '../../../utils/AppError';
import { validateBody } from '../../../middleware/validate';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';

const router = Router();
router.use(authenticate);

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().optional(),
});

router.patch('/me', validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const { name, email, avatarUrl, bio, timezone } = req.body as z.infer<typeof updateProfileSchema>;

    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: userId } },
      });
      if (existing) throw AppError.conflict('Email already in use');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(timezone ? { timezone } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        status: true,
        timezone: true,
        createdAt: true,
      },
    });

    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

export default router;

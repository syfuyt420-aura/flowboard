import { Router } from 'express';
import { projectsController } from './projects.controller';
import { authenticate } from '../../../middleware/authenticate';
import { validateBody, validateQuery } from '../../../middleware/validate';
import { createProjectSchema, updateProjectSchema } from '@flowboard/shared';
import { z } from 'zod';
import { sendSuccess } from '../../../utils/response';
import { AppError } from '../../../utils/AppError';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';
import { projectsService } from './projects.service';

const router = Router();

router.use(authenticate);

const listQuerySchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  status: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

router.get('/', validateQuery(listQuerySchema), projectsController.list);
router.post('/', validateBody(createProjectSchema), projectsController.create);
router.get('/:id', projectsController.get);
router.patch('/:id', validateBody(updateProjectSchema), projectsController.update);
router.delete('/:id', projectsController.delete);
router.get('/:id/members', projectsController.getMembers);

router.post(
  '/:id/members',
  validateBody(z.object({
    userId: z.string().uuid('Invalid user ID'),
    role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'MEMBER', 'VIEWER']).optional().default('MEMBER'),
  })),
  async (req, res, next) => {
    try {
      const requestingUserId = (req as unknown as AuthenticatedRequest).user.id;
      const member = await projectsService.addMember(req.params.id, req.body.userId, req.body.role ?? 'MEMBER', requestingUserId);
      sendSuccess(res, member, 201);
    } catch (err) { next(err); }
  }
);

router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const requestingUserId = (req as unknown as AuthenticatedRequest).user.id;
    await projectsService.removeMember(req.params.id, req.params.userId, requestingUserId);
    sendSuccess(res, { message: 'Member removed' });
  } catch (err) { next(err); }
});

router.patch(
  '/:id/members/:userId',
  validateBody(z.object({
    role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'MEMBER', 'VIEWER']),
  })),
  async (req, res, next) => {
    try {
      const requestingUserId = (req as unknown as AuthenticatedRequest).user.id;
      const member = await projectsService.updateMemberRole(req.params.id, req.params.userId, req.body.role, requestingUserId);
      sendSuccess(res, member);
    } catch (err) { next(err); }
  }
);

export default router;

import { Router } from 'express';
import { projectsController } from './projects.controller';
import { authenticate } from '../../../middleware/authenticate';
import { validateBody, validateQuery } from '../../../middleware/validate';
import { createProjectSchema, updateProjectSchema } from '@flowboard/shared';
import { z } from 'zod';

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

export default router;

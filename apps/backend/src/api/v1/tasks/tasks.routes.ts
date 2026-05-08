import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { validateBody } from '../../../middleware/validate';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '@flowboard/shared';
import { tasksService } from './tasks.service';
import { sendSuccess, sendPaginated } from '../../../utils/response';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const {
      projectId, assignee, priority, status, labelId, cursor, limit, search, overdue,
    } = req.query as Record<string, string>;

    const result = await tasksService.list({
      projectId, assignee, priority, status, labelId,
      cursor, search,
      overdue: overdue === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    sendPaginated(res, result.data, result.meta);
  } catch (err) { next(err); }
});

router.post('/', validateBody(createTaskSchema), async (req, res, next) => {
  try {
    const task = await tasksService.create(req.body, (req as unknown as AuthenticatedRequest).user.id);
    sendSuccess(res, task, 201);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    sendSuccess(res, await tasksService.get(req.params.id));
  } catch (err) { next(err); }
});

router.patch('/:id', validateBody(updateTaskSchema), async (req, res, next) => {
  try {
    const task = await tasksService.update(
      req.params.id, req.body, (req as unknown as AuthenticatedRequest).user.id
    );
    sendSuccess(res, task);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await tasksService.delete(req.params.id, (req as unknown as AuthenticatedRequest).user.id);
    sendSuccess(res, { message: 'Task deleted' });
  } catch (err) { next(err); }
});

router.post('/:id/move', validateBody(moveTaskSchema), async (req, res, next) => {
  try {
    const task = await tasksService.move(
      req.params.id, req.body, (req as unknown as AuthenticatedRequest).user.id
    );
    sendSuccess(res, task);
  } catch (err) { next(err); }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    sendSuccess(res, await tasksService.getComments(req.params.id));
  } catch (err) { next(err); }
});

router.post(
  '/:id/comments',
  validateBody(z.object({ content: z.string().min(1), parentId: z.string().uuid().optional() })),
  async (req, res, next) => {
    try {
      const comment = await tasksService.addComment(
        req.params.id,
        req.body.content,
        (req as unknown as AuthenticatedRequest).user.id,
        req.body.parentId
      );
      sendSuccess(res, comment, 201);
    } catch (err) { next(err); }
  }
);

router.get('/:id/activity', async (req, res, next) => {
  try {
    sendSuccess(res, await tasksService.getActivity(req.params.id));
  } catch (err) { next(err); }
});

router.post('/:id/time-entries/start', async (req, res, next) => {
  try {
    const entry = await tasksService.startTimer(req.params.id, (req as unknown as AuthenticatedRequest).user.id);
    sendSuccess(res, entry, 201);
  } catch (err) { next(err); }
});

router.post('/:id/time-entries/stop', async (req, res, next) => {
  try {
    const entry = await tasksService.stopTimer(req.params.id, (req as unknown as AuthenticatedRequest).user.id);
    sendSuccess(res, entry);
  } catch (err) { next(err); }
});

export default router;

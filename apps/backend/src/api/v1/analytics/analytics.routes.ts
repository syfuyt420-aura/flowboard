import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { analyticsService } from './analytics.service';
import { sendSuccess } from '../../../utils/response';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';
import { AppError } from '../../../utils/AppError';

const router = Router();
router.use(authenticate);

router.get('/dashboard', async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) throw AppError.badRequest('workspaceId required');
    const data = await analyticsService.getDashboard(
      (req as unknown as AuthenticatedRequest).user.id,
      workspaceId
    );
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.get('/workload', async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) throw AppError.badRequest('workspaceId required');
    const data = await analyticsService.getWorkload(workspaceId);
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

export default router;

import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';

const router = Router();
router.use(authenticate);

router.get('/', (_req, res) => res.json({ success: true, data: [], meta: { cursor: null, total: 0, hasMore: false } }));

export default router;

import type { Request, Response, NextFunction } from 'express';
import { projectsService } from './projects.service';
import { sendSuccess, sendPaginated } from '../../../utils/response';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';

export const projectsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, status, search, cursor, limit } = req.query as Record<string, string>;
      const result = await projectsService.list(workspaceId, (req as unknown as AuthenticatedRequest).user.id, {
        status,
        search,
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      sendPaginated(res, result.data, result.meta);
    } catch (err) { next(err); }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectsService.get(req.params.id, (req as unknown as AuthenticatedRequest).user.id);
      sendSuccess(res, project);
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectsService.create(req.body, (req as unknown as AuthenticatedRequest).user.id);
      sendSuccess(res, project, 201);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectsService.update(
        req.params.id,
        req.body,
        (req as unknown as AuthenticatedRequest).user.id
      );
      sendSuccess(res, project);
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await projectsService.delete(req.params.id, (req as unknown as AuthenticatedRequest).user.id);
      sendSuccess(res, { message: 'Project deleted' });
    } catch (err) { next(err); }
  },

  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await projectsService.getMembers(req.params.id);
      sendSuccess(res, members);
    } catch (err) { next(err); }
  },
};

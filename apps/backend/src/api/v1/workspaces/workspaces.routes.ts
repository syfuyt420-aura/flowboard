import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { validateBody } from '../../../middleware/validate';
import { createWorkspaceSchema, updateWorkspaceSchema, inviteMemberSchema } from '@flowboard/shared';
import { prisma } from '../../../lib/prisma';
import { sendSuccess } from '../../../utils/response';
import { AppError } from '../../../utils/AppError';
import type { AuthenticatedRequest } from '../../../middleware/authenticate';
import { v4 as uuidv4 } from 'uuid';
import { emailQueue } from '../../../workers/email.worker';
import type { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const workspaces = await prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { members: true, projects: { where: { deletedAt: null } } } } },
    });
    sendSuccess(res, workspaces.map((w: (typeof workspaces)[0]) => ({
      ...w,
      memberCount: w._count.members,
      projectCount: w._count.projects,
    })));
  } catch (err) { next(err); }
});

router.post('/', validateBody(createWorkspaceSchema), async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const { name, slug, timezone, accentColor } = req.body as { name: string; slug: string; timezone?: string; accentColor?: string };

    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (existing) throw AppError.conflict('Workspace slug already taken');

    const workspace = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const w = await tx.workspace.create({
        data: { name, slug, timezone: timezone ?? 'UTC', accentColor: accentColor ?? '#6b5efa', ownerId: userId },
      });
      await tx.workspaceMember.create({ data: { workspaceId: w.id, userId, role: 'OWNER' } });
      return w;
    });

    sendSuccess(res, workspace, 201);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const workspace = await prisma.workspace.findFirst({
      where: { id: req.params.id, members: { some: { userId } } },
      include: { _count: { select: { members: true } } },
    });
    if (!workspace) throw AppError.notFound('Workspace');
    sendSuccess(res, workspace);
  } catch (err) { next(err); }
});

router.patch('/:id', validateBody(updateWorkspaceSchema), async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.params.id, userId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!member) throw AppError.forbidden('Insufficient permissions');

    const updated = await prisma.workspace.update({
      where: { id: req.params.id },
      data: req.body,
    });
    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

router.get('/:id/members', async (req, res, next) => {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, status: true } } },
    });
    sendSuccess(res, members);
  } catch (err) { next(err); }
});

router.post('/:id/invite', validateBody(inviteMemberSchema), async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const { email, role } = req.body as { email: string; role: string };

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.params.id, userId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!member) throw AppError.forbidden('Insufficient permissions');

    const workspace = await prisma.workspace.findUnique({ where: { id: req.params.id } });
    if (!workspace) throw AppError.notFound('Workspace');

    const token = uuidv4();
    await prisma.workspaceInvite.create({
      data: {
        workspaceId: req.params.id,
        email,
        role: role as 'MEMBER',
        token,
        sentById: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await emailQueue.add('workspace-invite', { to: email, workspaceName: workspace.name, token });
    sendSuccess(res, { message: 'Invitation sent' }, 201);
  } catch (err) { next(err); }
});

router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const currentUserId = (req as unknown as AuthenticatedRequest).user.id;
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.params.id, userId: currentUserId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!member && currentUserId !== req.params.userId) throw AppError.forbidden('Insufficient permissions');

    await prisma.workspaceMember.deleteMany({
      where: { workspaceId: req.params.id, userId: req.params.userId },
    });
    sendSuccess(res, { message: 'Member removed' });
  } catch (err) { next(err); }
});

router.get('/invites/:token', async (req, res, next) => {
  try {
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token: req.params.token },
      include: { workspace: { select: { name: true } } },
    });
    if (!invite || invite.expiresAt < new Date() || invite.acceptedAt) {
      throw AppError.notFound('Invitation');
    }
    sendSuccess(res, { workspaceName: invite.workspace.name, role: invite.role, email: invite.email });
  } catch (err) { next(err); }
});

router.post('/invites/:token/accept', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('User');

    const invite = await prisma.workspaceInvite.findUnique({ where: { token: req.params.token } });
    if (!invite || invite.expiresAt < new Date() || invite.acceptedAt) {
      throw AppError.badRequest('Invitation is invalid or expired');
    }
    if (invite.email !== user.email) throw AppError.forbidden('Invitation is for a different email');

    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: { workspaceId: invite.workspaceId, userId, role: invite.role },
      }),
      prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    sendSuccess(res, { message: 'Joined workspace successfully' });
  } catch (err) { next(err); }
});

export default router;

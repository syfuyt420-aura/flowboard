import { prisma } from '../../../lib/prisma';
import type { Prisma } from '@prisma/client';
import { cacheGet, cacheSet, cacheDel, CACHE_TTL } from '../../../lib/redis';
import { AppError } from '../../../utils/AppError';
import type { CreateProjectInput, UpdateProjectInput } from '@flowboard/shared';

interface PageMeta { cursor: string | null; total: number; hasMore: boolean; limit: number }
interface PageResult<T = unknown> { data: T[]; meta: PageMeta }

function calcHealthScore(taskCount: number, completedCount: number, overdueCount: number): number {
  if (taskCount === 0) return 100;
  const completionRate = completedCount / taskCount;
  const overdueRate = Math.min(overdueCount / taskCount, 1);
  return Math.round(Math.max(0, (completionRate * 0.7 - overdueRate * 0.3) * 100));
}

const PROJECT_SELECT = {
  id: true,
  name: true,
  description: true,
  color: true,
  icon: true,
  coverImageUrl: true,
  status: true,
  healthScore: true,
  workspaceId: true,
  ownerId: true,
  startDate: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  _count: {
    select: {
      members: true,
      tasks: { where: { deletedAt: null } },
    },
  },
};

export const projectsService = {
  async list(
    workspaceId: string,
    userId: string,
    query: { status?: string; search?: string; cursor?: string; limit?: number }
  ) {
    const limit = Math.min(query.limit ?? 20, 100);
    const cacheKey = `projects:list:${workspaceId}:${userId}:${JSON.stringify(query)}`;
    const cached = await cacheGet<PageResult>(cacheKey);
    if (cached) return cached;

    const where = {
      workspaceId,
      deletedAt: null,
      ...(query.status ? { status: query.status as 'PLANNING' } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
      ...(query.cursor ? { createdAt: { lt: new Date(query.cursor) } } : {}),
    };

    const projects = await prisma.project.findMany({
      where,
      select: PROJECT_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = projects.length > limit;
    const items = hasMore ? projects.slice(0, limit) : projects;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;
    const total = await prisma.project.count({ where });

    type ProjectItem = (typeof items)[number];
    const result = {
      data: items.map((p: ProjectItem) => ({
        ...p,
        taskCount: p._count.tasks,
        completedTaskCount: 0,
        memberCount: p._count.members,
      })),
      meta: { cursor: nextCursor, total, hasMore, limit },
    };

    await cacheSet(cacheKey, result, CACHE_TTL.medium);
    return result;
  },

  async get(id: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...PROJECT_SELECT,
        members: {
          select: {
            role: true,
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!project) throw AppError.notFound('Project');

    const isMember = project.members.some((m: { user: { id: string } }) => m.user.id === userId);
    if (!isMember && project.ownerId !== userId) {
      throw AppError.forbidden('Not a project member');
    }

    return {
      ...project,
      taskCount: project._count.tasks,
      completedTaskCount: 0,
      memberCount: project._count.members,
    };
  },

  async create(input: CreateProjectInput, ownerId: string) {
    const project = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const p = await tx.project.create({
        data: {
          name: input.name,
          description: input.description,
          color: input.color ?? '#6b5efa',
          icon: input.icon ?? '📋',
          workspaceId: input.workspaceId,
          ownerId,
          startDate: input.startDate ? new Date(input.startDate) : null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        },
        select: PROJECT_SELECT,
      });

      await tx.projectMember.create({
        data: { projectId: p.id, userId: ownerId, role: 'OWNER' },
      });

      await tx.activityLog.create({
        data: {
          action: 'created project',
          entityType: 'Project',
          entityId: p.id,
          projectId: p.id,
          userId: ownerId,
        },
      });

      return p;
    });

    await cacheDel(`projects:list:${input.workspaceId}:${ownerId}:*`);
    return { ...project, taskCount: 0, completedTaskCount: 0, memberCount: 1 };
  },

  async update(id: string, input: UpdateProjectInput, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: { ownerId: true, workspaceId: true },
    });

    if (!project) throw AppError.notFound('Project');

    const member = await prisma.projectMember.findFirst({
      where: { projectId: id, userId },
    });

    if (!member && project.ownerId !== userId) {
      throw AppError.forbidden('Insufficient permissions');
    }

    const allowed = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];
    if (member && !allowed.includes(member.role)) {
      throw AppError.forbidden('Insufficient role to update project');
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.color ? { color: input.color } : {}),
        ...(input.icon ? { icon: input.icon } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.startDate !== undefined
          ? { startDate: input.startDate ? new Date(input.startDate) : null }
          : {}),
        ...(input.dueDate !== undefined
          ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
          : {}),
      },
      select: PROJECT_SELECT,
    });

    await prisma.activityLog.create({
      data: {
        action: 'updated project',
        entityType: 'Project',
        entityId: id,
        projectId: id,
        userId,
        metadata: { changes: input },
      },
    });

    await cacheDel(`projects:list:${project.workspaceId}:*`);
    return {
      ...updated,
      taskCount: updated._count.tasks,
      completedTaskCount: 0,
      memberCount: updated._count.members,
    };
  },

  async delete(id: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: { ownerId: true, workspaceId: true },
    });

    if (!project) throw AppError.notFound('Project');
    if (project.ownerId !== userId) throw AppError.forbidden('Only the owner can delete a project');

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await cacheDel(`projects:list:${project.workspaceId}:*`);
  },

  async getMembers(projectId: string) {
    return prisma.projectMember.findMany({
      where: { projectId },
      select: {
        role: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  },

  async recalcHealthScore(projectId: string) {
    const [taskCount, completedCount] = await Promise.all([
      prisma.task.count({ where: { projectId, deletedAt: null } }),
      prisma.task.count({ where: { projectId, status: 'DONE', deletedAt: null } }),
    ]);
    const overdue = await prisma.task.count({
      where: {
        projectId,
        deletedAt: null,
        dueDate: { lt: new Date() },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    });

    const score = calcHealthScore(taskCount, completedCount, overdue);
    await prisma.project.update({ where: { id: projectId }, data: { healthScore: score } });
    return score;
  },
};

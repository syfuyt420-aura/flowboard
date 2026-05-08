import { prisma } from '../../../lib/prisma';
import type { Prisma } from '@prisma/client';
import { cacheGet, cacheSet, cacheDelPattern, CACHE_TTL } from '../../../lib/redis';
import { AppError } from '../../../utils/AppError';
import type { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from '@flowboard/shared';

interface PageMeta { cursor: string | null; total: number; hasMore: boolean; limit: number }
interface PageResult<T = unknown> { data: T[]; meta: PageMeta }

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  position: true,
  projectId: true,
  parentTaskId: true,
  dueDate: true,
  startDate: true,
  estimatedHours: true,
  storyPoints: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  assignees: {
    select: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  labels: {
    select: {
      label: { select: { id: true, name: true, color: true } },
    },
  },
  _count: {
    select: {
      subtasks: { where: { deletedAt: null } },
      comments: true,
      timeEntries: true,
    },
  },
  createdById: true,
};

export const tasksService = {
  async list(query: {
    projectId?: string;
    assignee?: string;
    priority?: string;
    status?: string;
    labelId?: string;
    overdue?: boolean;
    cursor?: string;
    limit?: number;
    search?: string;
  }) {
    const limit = Math.min(query.limit ?? 25, 100);
    const cacheKey = `tasks:list:${JSON.stringify(query)}`;
    const cached = await cacheGet<PageResult>(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.overdue
        ? { dueDate: { lt: new Date() }, status: { notIn: ['DONE', 'CANCELLED'] } }
        : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.cursor ? { createdAt: { lt: new Date(query.cursor) } } : {}),
    };

    if (query.assignee) {
      where.assignees = { some: { userId: query.assignee } };
    }

    if (query.labelId) {
      where.labels = { some: { labelId: query.labelId } };
    }

    const tasks = await prisma.task.findMany({
      where,
      select: TASK_SELECT,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      take: limit + 1,
    });

    const hasMore = tasks.length > limit;
    const items = hasMore ? tasks.slice(0, limit) : tasks;
    const total = await prisma.task.count({ where });

    const result = {
      data: items.map(taskMapper),
      meta: {
        cursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
        total,
        hasMore,
        limit,
      },
    };

    await cacheSet(cacheKey, result, CACHE_TTL.short);
    return result;
  },

  async get(id: string) {
    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...TASK_SELECT,
        attachments: {
          select: { id: true, fileName: true, fileUrl: true, fileSize: true, mimeType: true, uploadedAt: true },
        },
        blockedBy: {
          select: { id: true, blockingTaskId: true, blockedTaskId: true },
        },
        blocks: {
          select: { id: true, blockingTaskId: true, blockedTaskId: true },
        },
      },
    });

    if (!task) throw AppError.notFound('Task');
    return taskMapper(task);
  },

  async create(input: CreateTaskInput, userId: string) {
    const maxPosition = await prisma.task.aggregate({
      where: { projectId: input.projectId, status: input.status ?? 'TODO', deletedAt: null },
      _max: { position: true },
    });
    const position = (maxPosition._max.position ?? -1) + 1;

    const task = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const t = await tx.task.create({
        data: {
          title: input.title,
          description: input.description,
          projectId: input.projectId,
          parentTaskId: input.parentTaskId,
          priority: input.priority ?? 'P2',
          status: input.status ?? 'TODO',
          position,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          estimatedHours: input.estimatedHours ? input.estimatedHours : null,
          storyPoints: input.storyPoints ?? null,
          createdById: userId,
        },
        select: TASK_SELECT,
      });

      if (input.assigneeIds?.length) {
        await tx.taskAssignee.createMany({
          data: input.assigneeIds.map((uid) => ({ taskId: t.id, userId: uid })),
          skipDuplicates: true,
        });
      }

      if (input.labelIds?.length) {
        await tx.taskLabel.createMany({
          data: input.labelIds.map((lid) => ({ taskId: t.id, labelId: lid })),
          skipDuplicates: true,
        });
      }

      await tx.activityLog.create({
        data: {
          action: `created task "${input.title}"`,
          entityType: 'Task',
          entityId: t.id,
          projectId: input.projectId,
          userId,
        },
      });

      return t;
    });

    await cacheDelPattern(`tasks:list:*`);
    return taskMapper(task);
  },

  async update(id: string, input: UpdateTaskInput, userId: string) {
    const task = await prisma.task.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw AppError.notFound('Task');

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const t = await tx.task.update({
        where: { id },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.priority ? { priority: input.priority } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.dueDate !== undefined
            ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
            : {}),
          ...(input.estimatedHours !== undefined ? { estimatedHours: input.estimatedHours } : {}),
          ...(input.storyPoints !== undefined ? { storyPoints: input.storyPoints } : {}),
        },
        select: TASK_SELECT,
      });

      if (input.assigneeIds !== undefined) {
        await tx.taskAssignee.deleteMany({ where: { taskId: id } });
        if (input.assigneeIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: input.assigneeIds.map((uid) => ({ taskId: id, userId: uid })),
          });
        }
      }

      if (input.labelIds !== undefined) {
        await tx.taskLabel.deleteMany({ where: { taskId: id } });
        if (input.labelIds.length > 0) {
          await tx.taskLabel.createMany({
            data: input.labelIds.map((lid) => ({ taskId: id, labelId: lid })),
          });
        }
      }

      await tx.activityLog.create({
        data: {
          action: 'updated task',
          entityType: 'Task',
          entityId: id,
          projectId: task.projectId,
          userId,
          metadata: { changes: input },
        },
      });

      return t;
    });

    await cacheDelPattern(`tasks:list:*`);
    return taskMapper(updated);
  },

  async delete(id: string, userId: string) {
    const task = await prisma.task.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw AppError.notFound('Task');

    await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
    await prisma.activityLog.create({
      data: {
        action: 'deleted task',
        entityType: 'Task',
        entityId: id,
        projectId: task.projectId,
        userId,
      },
    });
    await cacheDelPattern(`tasks:list:*`);
  },

  async move(id: string, input: MoveTaskInput, userId: string) {
    const task = await prisma.task.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw AppError.notFound('Task');

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(input.projectId ? { projectId: input.projectId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
      },
      select: TASK_SELECT,
    });

    await prisma.activityLog.create({
      data: {
        action: 'moved task',
        entityType: 'Task',
        entityId: id,
        projectId: updated.projectId,
        userId,
        metadata: { from: { status: task.status }, to: input },
      },
    });

    await cacheDelPattern(`tasks:list:*`);
    return taskMapper(updated);
  },

  async addComment(taskId: string, content: string, userId: string, parentId?: string) {
    const task = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null } });
    if (!task) throw AppError.notFound('Task');

    const comment = await prisma.comment.create({
      data: { taskId, content, authorId: userId, parentId },
      select: {
        id: true,
        content: true,
        taskId: true,
        authorId: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, avatarUrl: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'commented on task',
        entityType: 'Task',
        entityId: taskId,
        projectId: task.projectId,
        userId,
      },
    });

    return comment;
  },

  async getComments(taskId: string) {
    return prisma.comment.findMany({
      where: { taskId, parentId: null },
      select: {
        id: true,
        content: true,
        taskId: true,
        authorId: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          select: {
            id: true,
            content: true,
            taskId: true,
            authorId: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
            author: { select: { id: true, name: true, avatarUrl: true } },
            reactions: { select: { emoji: true, userId: true } },
          },
        },
        reactions: { select: { emoji: true, userId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getActivity(taskId: string) {
    return prisma.activityLog.findMany({
      where: { entityId: taskId, entityType: 'Task' },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async startTimer(taskId: string, userId: string) {
    const active = await prisma.timeEntry.findFirst({
      where: { userId, endTime: null },
    });
    if (active) throw AppError.conflict('A timer is already running. Stop it first.');

    return prisma.timeEntry.create({
      data: { taskId, userId },
    });
  },

  async stopTimer(taskId: string, userId: string) {
    const entry = await prisma.timeEntry.findFirst({
      where: { taskId, userId, endTime: null },
    });
    if (!entry) throw AppError.notFound('Active timer');

    const endTime = new Date();
    const durationMinutes = Math.round(
      (endTime.getTime() - entry.startTime.getTime()) / 60000
    );

    return prisma.timeEntry.update({
      where: { id: entry.id },
      data: { endTime, durationMinutes },
    });
  },
};

interface RawTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  position: number;
  projectId: string;
  parentTaskId: string | null;
  dueDate: Date | null;
  startDate: Date | null;
  estimatedHours: unknown;
  storyPoints: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string;
  assignees: Array<{ user: { id: string; name: string; avatarUrl: string | null } }>;
  labels: Array<{ label: { id: string; name: string; color: string } }>;
  _count: { subtasks: number; comments: number; timeEntries: number };
  attachments?: Array<{ id: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string; uploadedAt: Date }>;
  blockedBy?: Array<{ id: string; blockingTaskId: string; blockedTaskId: string }>;
  blocks?: Array<{ id: string; blockingTaskId: string; blockedTaskId: string }>;
}

function taskMapper(task: RawTask) {
  return {
    ...task,
    assignees: task.assignees.map((a) => ({ userId: a.user.id, user: a.user })),
    labels: task.labels.map((l) => l.label),
    subtaskCount: task._count.subtasks,
    completedSubtaskCount: 0,
    commentCount: task._count.comments,
    timeTrackedMinutes: 0,
  };
}

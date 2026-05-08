import { prisma } from '../../../lib/prisma';
import { cacheGet, cacheSet, CACHE_TTL } from '../../../lib/redis';

export const analyticsService = {
  async getDashboard(userId: string, workspaceId: string) {
    const cacheKey = `analytics:dashboard:${userId}:${workspaceId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const memberProjectIds = (
      await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      })
    ).map((m: { projectId: string }) => m.projectId);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalTasks,
      completedTasks,
      overdueTaskCount,
      upcomingDeadlines,
      activeProjects,
      teamMembers,
      tasksCompletedThisWeek,
      tasksCreatedThisWeek,
    ] = await Promise.all([
      prisma.task.count({
        where: { projectId: { in: memberProjectIds }, deletedAt: null, status: { notIn: ['DONE', 'CANCELLED'] } },
      }),
      prisma.task.count({
        where: { projectId: { in: memberProjectIds }, deletedAt: null, status: 'DONE' },
      }),
      prisma.task.count({
        where: {
          projectId: { in: memberProjectIds },
          deletedAt: null,
          dueDate: { lt: now },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
      prisma.task.count({
        where: {
          projectId: { in: memberProjectIds },
          deletedAt: null,
          dueDate: { gte: now, lte: weekFromNow },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
      prisma.project.count({
        where: { workspaceId, status: 'ACTIVE', deletedAt: null },
      }),
      prisma.workspaceMember.count({ where: { workspaceId } }),
      prisma.task.count({
        where: {
          projectId: { in: memberProjectIds },
          status: 'DONE',
          updatedAt: { gte: weekAgo },
        },
      }),
      prisma.task.count({
        where: {
          projectId: { in: memberProjectIds },
          createdAt: { gte: weekAgo },
        },
      }),
    ]);

    const result = {
      totalTasks,
      completedTasks,
      overdueTaskCount,
      upcomingDeadlines,
      activeProjects,
      teamMembers,
      tasksCompletedThisWeek,
      tasksCreatedThisWeek,
    };

    await cacheSet(cacheKey, result, CACHE_TTL.medium);
    return result;
  },

  async getWorkload(workspaceId: string) {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const workload = await Promise.all(
      members.map(async ({ user }: { user: { id: string; name: string; avatarUrl: string | null } }) => {
        const [taskCount, overdueTasks, completedThisWeek] = await Promise.all([
          prisma.taskAssignee.count({
            where: {
              userId: user.id,
              task: { deletedAt: null, status: { notIn: ['DONE', 'CANCELLED'] } },
            },
          }),
          prisma.taskAssignee.count({
            where: {
              userId: user.id,
              task: {
                deletedAt: null,
                dueDate: { lt: now },
                status: { notIn: ['DONE', 'CANCELLED'] },
              },
            },
          }),
          prisma.taskAssignee.count({
            where: {
              userId: user.id,
              task: { status: 'DONE', updatedAt: { gte: weekAgo } },
            },
          }),
        ]);

        return {
          userId: user.id,
          userName: user.name,
          avatarUrl: user.avatarUrl,
          taskCount,
          overdueTasks,
          completedThisWeek,
          estimatedHours: 0,
        };
      })
    );

    return workload;
  },
};

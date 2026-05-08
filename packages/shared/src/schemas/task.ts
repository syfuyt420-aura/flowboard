import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500),
  description: z.string().max(50000).optional().nullable(),
  projectId: z.string().uuid(),
  parentTaskId: z.string().uuid().optional().nullable(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).optional().default('P2'),
  status: z
    .enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
    .optional()
    .default('TODO'),
  assigneeIds: z.array(z.string().uuid()).optional().default([]),
  labelIds: z.array(z.string().uuid()).optional().default([]),
  dueDate: z.string().datetime().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().positive().optional().nullable(),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.omit({ projectId: true }).partial();

export const bulkTaskActionSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['UPDATE_STATUS', 'UPDATE_PRIORITY', 'ASSIGN', 'ADD_LABEL', 'DELETE', 'MOVE']),
  payload: z.record(z.unknown()),
});

export const moveTaskSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  position: z.number().int().min(0).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type BulkTaskActionInput = z.infer<typeof bulkTaskActionSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

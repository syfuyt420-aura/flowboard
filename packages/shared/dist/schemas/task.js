"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveTaskSchema = exports.bulkTaskActionSchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Task title is required').max(500),
    description: zod_1.z.string().max(50000).optional().nullable(),
    projectId: zod_1.z.string().uuid(),
    parentTaskId: zod_1.z.string().uuid().optional().nullable(),
    priority: zod_1.z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).optional().default('P2'),
    status: zod_1.z
        .enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
        .optional()
        .default('TODO'),
    assigneeIds: zod_1.z.array(zod_1.z.string().uuid()).optional().default([]),
    labelIds: zod_1.z.array(zod_1.z.string().uuid()).optional().default([]),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
    startDate: zod_1.z.string().datetime().optional().nullable(),
    estimatedHours: zod_1.z.number().positive().optional().nullable(),
    storyPoints: zod_1.z.number().int().min(0).max(100).optional().nullable(),
});
exports.updateTaskSchema = exports.createTaskSchema.omit({ projectId: true }).partial();
exports.bulkTaskActionSchema = zod_1.z.object({
    taskIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(100),
    action: zod_1.z.enum(['UPDATE_STATUS', 'UPDATE_PRIORITY', 'ASSIGN', 'ADD_LABEL', 'DELETE', 'MOVE']),
    payload: zod_1.z.record(zod_1.z.unknown()),
});
exports.moveTaskSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
    position: zod_1.z.number().int().min(0).optional(),
});
//# sourceMappingURL=task.js.map
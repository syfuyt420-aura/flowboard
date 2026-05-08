"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Project name is required').max(200),
    description: zod_1.z.string().max(2000).optional(),
    color: zod_1.z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color')
        .optional()
        .default('#6b5efa'),
    icon: zod_1.z.string().max(10).optional().default('📋'),
    workspaceId: zod_1.z.string().uuid(),
    startDate: zod_1.z.string().datetime().optional().nullable(),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
    templateId: zod_1.z.string().uuid().optional(),
});
exports.updateProjectSchema = exports.createProjectSchema
    .omit({ workspaceId: true, templateId: true })
    .partial()
    .extend({
    status: zod_1.z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
});
//# sourceMappingURL=project.js.map
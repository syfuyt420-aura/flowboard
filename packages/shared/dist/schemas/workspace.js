"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteMemberSchema = exports.updateWorkspaceSchema = exports.createWorkspaceSchema = void 0;
const zod_1 = require("zod");
exports.createWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Workspace name must be at least 2 characters').max(100),
    slug: zod_1.z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    timezone: zod_1.z.string().optional().default('UTC'),
    accentColor: zod_1.z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color hex')
        .optional()
        .default('#6b5efa'),
});
exports.updateWorkspaceSchema = exports.createWorkspaceSchema.partial().omit({ slug: true });
exports.inviteMemberSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    role: zod_1.z.enum(['ADMIN', 'PROJECT_MANAGER', 'MEMBER', 'VIEWER']),
});
//# sourceMappingURL=workspace.js.map
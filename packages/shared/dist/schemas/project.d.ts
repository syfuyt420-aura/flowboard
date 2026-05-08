import { z } from 'zod';
export declare const createProjectSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    icon: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    workspaceId: z.ZodString;
    startDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    templateId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    color: string;
    icon: string;
    workspaceId: string;
    description?: string | undefined;
    startDate?: string | null | undefined;
    dueDate?: string | null | undefined;
    templateId?: string | undefined;
}, {
    name: string;
    workspaceId: string;
    description?: string | undefined;
    color?: string | undefined;
    icon?: string | undefined;
    startDate?: string | null | undefined;
    dueDate?: string | null | undefined;
    templateId?: string | undefined;
}>;
export declare const updateProjectSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    color: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    icon: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    startDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
} & {
    status: z.ZodOptional<z.ZodEnum<["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    status?: "ACTIVE" | "PLANNING" | "ON_HOLD" | "COMPLETED" | "ARCHIVED" | undefined;
    description?: string | undefined;
    color?: string | undefined;
    icon?: string | undefined;
    startDate?: string | null | undefined;
    dueDate?: string | null | undefined;
}, {
    name?: string | undefined;
    status?: "ACTIVE" | "PLANNING" | "ON_HOLD" | "COMPLETED" | "ARCHIVED" | undefined;
    description?: string | undefined;
    color?: string | undefined;
    icon?: string | undefined;
    startDate?: string | null | undefined;
    dueDate?: string | null | undefined;
}>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
//# sourceMappingURL=project.d.ts.map
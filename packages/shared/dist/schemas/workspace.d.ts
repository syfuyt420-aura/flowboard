import { z } from 'zod';
export declare const createWorkspaceSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    timezone: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    accentColor: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
    timezone: string;
    accentColor: string;
}, {
    name: string;
    slug: string;
    timezone?: string | undefined;
    accentColor?: string | undefined;
}>;
export declare const updateWorkspaceSchema: z.ZodObject<Omit<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    accentColor: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
}, "slug">, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    timezone?: string | undefined;
    accentColor?: string | undefined;
}, {
    name?: string | undefined;
    timezone?: string | undefined;
    accentColor?: string | undefined;
}>;
export declare const inviteMemberSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodEnum<["ADMIN", "PROJECT_MANAGER", "MEMBER", "VIEWER"]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: "ADMIN" | "PROJECT_MANAGER" | "MEMBER" | "VIEWER";
}, {
    email: string;
    role: "ADMIN" | "PROJECT_MANAGER" | "MEMBER" | "VIEWER";
}>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
//# sourceMappingURL=workspace.d.ts.map
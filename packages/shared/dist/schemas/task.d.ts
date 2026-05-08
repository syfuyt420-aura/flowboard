import { z } from 'zod';
export declare const createTaskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    projectId: z.ZodString;
    parentTaskId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<["P0", "P1", "P2", "P3", "P4"]>>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]>>>;
    assigneeIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    labelIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    startDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    estimatedHours: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    storyPoints: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
    title: string;
    projectId: string;
    priority: "P0" | "P1" | "P2" | "P3" | "P4";
    assigneeIds: string[];
    labelIds: string[];
    description?: string | null | undefined;
    startDate?: string | null | undefined;
    dueDate?: string | null | undefined;
    parentTaskId?: string | null | undefined;
    estimatedHours?: number | null | undefined;
    storyPoints?: number | null | undefined;
}, {
    title: string;
    projectId: string;
    status?: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED" | undefined;
    description?: string | null | undefined;
    startDate?: string | null | undefined;
    dueDate?: string | null | undefined;
    parentTaskId?: string | null | undefined;
    priority?: "P0" | "P1" | "P2" | "P3" | "P4" | undefined;
    assigneeIds?: string[] | undefined;
    labelIds?: string[] | undefined;
    estimatedHours?: number | null | undefined;
    storyPoints?: number | null | undefined;
}>;
export declare const updateTaskSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodEnum<["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]>>>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    startDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    title: z.ZodOptional<z.ZodString>;
    parentTaskId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    priority: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodEnum<["P0", "P1", "P2", "P3", "P4"]>>>>;
    assigneeIds: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
    labelIds: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
    estimatedHours: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    storyPoints: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    status?: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED" | undefined;
    description?: string | null | undefined;
    startDate?: string | null | undefined;
    dueDate?: string | null | undefined;
    title?: string | undefined;
    parentTaskId?: string | null | undefined;
    priority?: "P0" | "P1" | "P2" | "P3" | "P4" | undefined;
    assigneeIds?: string[] | undefined;
    labelIds?: string[] | undefined;
    estimatedHours?: number | null | undefined;
    storyPoints?: number | null | undefined;
}, {
    status?: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED" | undefined;
    description?: string | null | undefined;
    startDate?: string | null | undefined;
    dueDate?: string | null | undefined;
    title?: string | undefined;
    parentTaskId?: string | null | undefined;
    priority?: "P0" | "P1" | "P2" | "P3" | "P4" | undefined;
    assigneeIds?: string[] | undefined;
    labelIds?: string[] | undefined;
    estimatedHours?: number | null | undefined;
    storyPoints?: number | null | undefined;
}>;
export declare const bulkTaskActionSchema: z.ZodObject<{
    taskIds: z.ZodArray<z.ZodString, "many">;
    action: z.ZodEnum<["UPDATE_STATUS", "UPDATE_PRIORITY", "ASSIGN", "ADD_LABEL", "DELETE", "MOVE"]>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    taskIds: string[];
    action: "UPDATE_STATUS" | "UPDATE_PRIORITY" | "ASSIGN" | "ADD_LABEL" | "DELETE" | "MOVE";
    payload: Record<string, unknown>;
}, {
    taskIds: string[];
    action: "UPDATE_STATUS" | "UPDATE_PRIORITY" | "ASSIGN" | "ADD_LABEL" | "DELETE" | "MOVE";
    payload: Record<string, unknown>;
}>;
export declare const moveTaskSchema: z.ZodObject<{
    projectId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]>>;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED" | undefined;
    projectId?: string | undefined;
    position?: number | undefined;
}, {
    status?: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED" | undefined;
    projectId?: string | undefined;
    position?: number | undefined;
}>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type BulkTaskActionInput = z.infer<typeof bulkTaskActionSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
//# sourceMappingURL=task.d.ts.map
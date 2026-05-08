import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/ui/avatar'
import { tasksService } from '@/services/tasks.service'
import { projectsService } from '@/services/projects.service'
import { api } from '@/lib/axios'
import { QUERY_KEYS } from '@/lib/constants'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import type { WorkspaceMember } from '@flowboard/shared'
import type { Project } from '@flowboard/shared'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(50000).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  dueDate: z.string().optional(),
  projectId: z.string().min(1, 'Project is required'),
})

type FormValues = z.infer<typeof formSchema>

interface CreateTaskModalProps {
  open: boolean
  onClose: () => void
  projectId?: string
  defaultStatus?: string
}

const PRIORITY_OPTIONS = [
  { value: 'P0', label: 'Critical' },
  { value: 'P1', label: 'High' },
  { value: 'P2', label: 'Medium' },
  { value: 'P3', label: 'Low' },
] as const

const STATUS_OPTIONS = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
] as const

export default function CreateTaskModal({
  open,
  onClose,
  projectId,
  defaultStatus,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient()
  const workspaceId = useUIStore((s) => s.activeWorkspaceId)
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: QUERY_KEYS.projects.list(workspaceId ?? undefined),
    queryFn: async () => {
      if (!workspaceId) return []
      const res = await projectsService.list(workspaceId)
      return res.data
    },
    enabled: !!workspaceId && !projectId,
  })

  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: QUERY_KEYS.workspaces.members(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkspaceMember[] }>(
        `/workspaces/${workspaceId}/members`
      )
      return data.data
    },
    enabled: !!workspaceId,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'P2',
      status: 'TODO',
      dueDate: '',
      projectId: projectId ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        priority: 'P2',
        status: (defaultStatus as FormValues['status']) ?? 'TODO',
        dueDate: '',
        projectId: projectId ?? '',
      })
      setSelectedAssigneeIds([])
    }
  }, [open, projectId, defaultStatus, reset])

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      tasksService.create({
        title: values.title,
        projectId: values.projectId,
        priority: values.priority as 'P0' | 'P1' | 'P2' | 'P3' | 'P4',
        status: values.status as 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED',
        description: values.description || undefined,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
        assigneeIds: selectedAssigneeIds,
        labelIds: [],
      }),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list(task.projectId) })
      toast.success('Task created')
      handleClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to create task'
      toast.error(msg)
    },
  })

  function handleClose() {
    reset()
    setSelectedAssigneeIds([])
    onClose()
  }

  function toggleAssignee(userId: string) {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v: FormValues) => createMutation.mutate(v))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Task title"
              {...register('title')}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Optional description..."
              rows={3}
              {...register('description')}
            />
          </div>

          {!projectId && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Project</label>
              <select
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register('projectId')}
              >
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="text-xs text-destructive">{errors.projectId.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Priority</label>
              <select
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register('priority')}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register('status')}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Due Date</label>
            <input
              type="date"
              className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register('dueDate')}
            />
          </div>

          {members.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignees</label>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {members.map((m) => {
                  const selected = selectedAssigneeIds.includes(m.userId)
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleAssignee(m.userId)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm transition-colors',
                        selected
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                          : 'border-border hover:bg-accent'
                      )}
                    >
                      <UserAvatar name={m.user.name} src={m.user.avatarUrl} size="xs" />
                      <span>{m.user.name}</span>
                      {selected && <Check className="h-3 w-3" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Trash2, AlertTriangle, UserPlus, X } from 'lucide-react'
import { projectsService } from '@/services/projects.service'
import { api } from '@/lib/axios'
import { useUIStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@flowboard/shared'

const PRESET_COLORS = ['#6b5efa', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
const PRESET_ICONS = ['📋', '🚀', '💡', '🎯', '🔥', '⚡', '🌟', '🛠️']
const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const ROLE_VARIANT: Record<string, 'brand' | 'success' | 'warning' | 'info' | 'outline'> = {
  OWNER: 'brand',
  ADMIN: 'warning',
  PROJECT_MANAGER: 'info',
  MEMBER: 'outline',
  VIEWER: 'outline',
}

const editSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color'),
  icon: z.string().max(10),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']),
})

type EditValues = z.infer<typeof editSchema>

interface WorkspaceMember {
  role: string
  user: { id: string; name: string; email: string; avatarUrl: string | null }
}

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const workspaceId = useUIStore((s) => s.activeWorkspaceId)

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsService.get(id!),
    enabled: !!id,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', id],
    queryFn: () => projectsService.getMembers(id!),
    enabled: !!id,
  })

  const { data: workspaceMembers = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`)
      return data.data
    },
    enabled: !!workspaceId && showAddMember,
  })

  const addMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.post(`/projects/${id}/members`, { userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', id] })
      toast.success('Member added')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to add member'
      toast.error(msg)
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${id}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', id] })
      toast.success('Member removed')
    },
    onError: () => toast.error('Failed to remove member'),
  })

  const memberUserIds = new Set(members.map((m) => m.user.id))
  const availableToAdd = workspaceMembers.filter((wm) => !memberUserIds.has(wm.user.id))

  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: project
      ? {
          name: project.name,
          description: project.description ?? '',
          color: project.color,
          icon: project.icon,
          status: project.status,
        }
      : undefined,
  })

  const selectedColor = watch('color')
  const selectedIcon = watch('icon')
  const selectedStatus = watch('status')

  const updateMutation = useMutation({
    mutationFn: (data: EditValues) => projectsService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Project updated')
    },
    onError: () => toast.error('Failed to update project'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => projectsService.delete(id!),
    onSuccess: () => {
      toast.success('Project deleted')
      navigate('/app/projects')
    },
    onError: () => toast.error('Failed to delete project'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Project not found.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-2xl space-y-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-xl font-display font-bold">Project Settings</h2>
        <p className="text-sm text-muted-foreground">Manage settings for {project.name}</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onSubmit={handleSubmit((d) => updateMutation.mutate(d))}
        className="space-y-6"
      >
        <div>
          <label className="text-sm font-medium mb-1.5 block">Project name</label>
          <Input {...register('name')} placeholder="My project" />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Description</label>
          <Textarea {...register('description')} placeholder="What is this project about?" rows={3} />
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('color', c, { shouldDirty: true })}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                  selectedColor === c ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <div className="flex items-center gap-2 ml-1">
              <div
                className="h-8 w-8 rounded-full border border-input"
                style={{ backgroundColor: selectedColor }}
              />
              <Input
                {...register('color')}
                placeholder="#6b5efa"
                className="w-28 font-mono text-xs h-8"
              />
            </div>
          </div>
          {errors.color && <p className="text-xs text-destructive mt-1">{errors.color.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Icon</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setValue('icon', emoji, { shouldDirty: true })}
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded-lg border-2 text-lg transition-all',
                  selectedIcon === emoji
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                    : 'border-border hover:border-muted-foreground/40'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Status</label>
          <Select
            value={selectedStatus}
            onValueChange={(v) => setValue('status', v as ProjectStatus, { shouldDirty: true })}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" variant="brand" disabled={!isDirty || updateMutation.isPending}>
          Save changes
        </Button>
      </motion.form>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Members</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAddMember((v) => !v)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Member
          </Button>
        </div>

        {showAddMember && (
          <div className="rounded-xl border p-3 bg-muted/30 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Workspace members not in project:</p>
            {availableToAdd.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">All workspace members are already in this project.</p>
            )}
            {availableToAdd.map((wm) => (
              <div key={wm.user.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors">
                <UserAvatar name={wm.user.name} src={wm.user.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{wm.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{wm.user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addMemberMutation.mutate({ userId: wm.user.id, role: 'MEMBER' })}
                  disabled={addMemberMutation.isPending}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border divide-y">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-6 text-center">No members found.</p>
          )}
          {members.map((m) => (
            <div key={m.user.id} className="flex items-center gap-3 px-4 py-3 group">
              <UserAvatar name={m.user.name} src={m.user.avatarUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
              </div>
              <Badge variant={ROLE_VARIANT[m.role] ?? 'outline'}>
                {m.role.replace('_', ' ')}
              </Badge>
              {m.role !== 'OWNER' && (
                <button
                  onClick={() => removeMemberMutation.mutate(m.user.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                  title="Remove member"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-destructive/30 p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Danger Zone</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Permanently delete this project and all its tasks. This action cannot be undone.
        </p>

        {!confirmDelete ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete project
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-destructive">Are you sure?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              Yes, delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

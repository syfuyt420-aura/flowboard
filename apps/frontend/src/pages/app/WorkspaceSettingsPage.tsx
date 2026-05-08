import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { api } from '@/lib/axios'
import { useUIStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { WorkspaceMember } from '@flowboard/shared'

const ROLE_VARIANT: Record<string, 'brand' | 'success' | 'warning' | 'info' | 'outline'> = {
  OWNER: 'brand',
  ADMIN: 'warning',
  PROJECT_MANAGER: 'info',
  MEMBER: 'outline',
  VIEWER: 'outline',
}

const nameSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
})

const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['MEMBER', 'ADMIN', 'PROJECT_MANAGER', 'VIEWER']),
})

type NameValues = z.infer<typeof nameSchema>
type InviteValues = z.infer<typeof inviteSchema>

interface WorkspaceData {
  id: string
  name: string
  slug: string
  plan: string
}

export default function WorkspaceSettingsPage() {
  const workspaceId = useUIStore((s) => s.activeWorkspaceId)
  const queryClient = useQueryClient()

  const { data: workspace, isLoading: loadingWorkspace } = useQuery<WorkspaceData>({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      const { data } = await api.get(`/workspaces/${workspaceId}`)
      return data.data
    },
    enabled: !!workspaceId,
  })

  const { data: members = [], isLoading: loadingMembers } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`)
      return data.data
    },
    enabled: !!workspaceId,
  })

  const {
    register: registerName,
    handleSubmit: handleNameSubmit,
    formState: { errors: nameErrors, isDirty: nameDirty },
  } = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    values: workspace ? { name: workspace.name } : undefined,
  })

  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    reset: resetInvite,
    setValue: setInviteValue,
    watch: watchInvite,
    formState: { errors: inviteErrors },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'MEMBER' },
  })

  const inviteRole = watchInvite('role')

  const updateMutation = useMutation({
    mutationFn: async (data: NameValues) => {
      const resp = await api.patch(`/workspaces/${workspaceId}`, { name: data.name })
      return resp.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
      toast.success('Workspace updated')
    },
    onError: () => toast.error('Failed to update workspace'),
  })

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteValues) => {
      await api.post(`/workspaces/${workspaceId}/invite`, data)
    },
    onSuccess: () => {
      resetInvite()
      toast.success('Invitation sent')
    },
    onError: () => toast.error('Failed to send invitation'),
  })

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No active workspace selected.
      </div>
    )
  }

  if (loadingWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-2xl space-y-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-xl font-display font-bold">Workspace Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your workspace configuration and members</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        <div>
          <h3 className="text-base font-semibold">General</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Update your workspace name</p>
        </div>

        <form
          onSubmit={handleNameSubmit((d) => updateMutation.mutate(d))}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium mb-1.5 block">Workspace name</label>
            <Input {...registerName('name')} placeholder="My Workspace" className="max-w-sm" />
            {nameErrors.name && (
              <p className="text-xs text-destructive mt-1">{nameErrors.name.message}</p>
            )}
          </div>
          <Button type="submit" variant="brand" disabled={!nameDirty || updateMutation.isPending}>
            Save changes
          </Button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div>
          <h3 className="text-base font-semibold">Members</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loadingMembers ? 'Loading…' : `${members.length} member${members.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5">Member</th>
                <th className="text-left font-medium px-4 py-2.5 hidden sm:table-cell">Email</th>
                <th className="text-left font-medium px-4 py-2.5">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.length === 0 && !loadingMembers && (
                <tr>
                  <td colSpan={3} className="text-center text-muted-foreground px-4 py-6">
                    No members found.
                  </td>
                </tr>
              )}
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={m.user.name} src={m.user.avatarUrl} size="sm" />
                      <span className="font-medium truncate max-w-[140px]">{m.user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[180px]">
                    {m.user.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANT[m.role] ?? 'outline'}>
                      {m.role.replace('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-4"
      >
        <div>
          <h3 className="text-base font-semibold">Invite member</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Send an invitation to join this workspace</p>
        </div>

        <form
          onSubmit={handleInviteSubmit((d) => inviteMutation.mutate(d))}
          className="space-y-3"
        >
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <Input
                {...registerInvite('email')}
                type="email"
                placeholder="colleague@example.com"
              />
              {inviteErrors.email && (
                <p className="text-xs text-destructive mt-1">{inviteErrors.email.message}</p>
              )}
            </div>

            <div className="w-44 flex-shrink-0">
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteValue('role', v as InviteValues['role'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              variant="brand"
              className={cn('flex-shrink-0')}
              disabled={inviteMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Send invite
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

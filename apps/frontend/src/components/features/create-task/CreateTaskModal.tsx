import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  User, Users, ChevronLeft, X, Calendar, ArrowRight,
  Search, Check, Crown, Shield, UserCheck, Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import type { WorkspaceMember, Project } from '@flowboard/shared'

type TaskType = 'individual' | 'group'
type Urgency  = 'low' | 'medium' | 'high' | 'critical'
type Step     = 'type' | 'form'

const URGENCY: Record<Urgency, { label: string; dot: string; active: string; priority: 'P0'|'P1'|'P2'|'P3' }> = {
  low:      { label: 'Low',      dot: 'bg-emerald-500', active: 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-500 dark:text-emerald-400', priority: 'P3' },
  medium:   { label: 'Medium',   dot: 'bg-yellow-400',  active: 'bg-yellow-50 border-yellow-400 text-yellow-700 dark:bg-yellow-950/60 dark:border-yellow-500 dark:text-yellow-400',   priority: 'P2' },
  high:     { label: 'High',     dot: 'bg-orange-500',  active: 'bg-orange-50 border-orange-400 text-orange-700 dark:bg-orange-950/60 dark:border-orange-500 dark:text-orange-400',   priority: 'P1' },
  critical: { label: 'Critical', dot: 'bg-red-500',     active: 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/60 dark:border-red-500 dark:text-red-400',                     priority: 'P0' },
}

const ROLE_BADGE: Record<string, { icon: typeof Crown; label: string; cls: string }> = {
  OWNER:  { icon: Crown,     label: 'Owner',  cls: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400' },
  ADMIN:  { icon: Shield,    label: 'Admin',  cls: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400' },
  MEMBER: { icon: UserCheck, label: 'Member', cls: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
}

const slide = {
  enter: (d: number) => ({ x: d * 50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d * -50, opacity: 0 }),
}

interface Props { open: boolean; onClose: () => void; projectId?: string }

// ─── Inline member list ──────────────────────────────────────────────────────
function MemberList({
  members,
  selected,
  multi,
  loading,
  onToggle,
}: {
  members: WorkspaceMember[]
  selected: string[]
  multi: boolean
  loading: boolean
  onToggle: (id: string) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = members.filter((m) => {
    const q = search.toLowerCase()
    return m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
  })

  return (
    <div className="rounded-xl border border-input overflow-hidden">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {selected.length > 0 && (
          <span className={cn(
            'text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0',
            multi && selected.length < 2
              ? 'bg-muted text-muted-foreground'
              : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
          )}>
            {selected.length} selected
          </span>
        )}
      </div>

      {/* List */}
      <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading members…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {search ? 'No members match your search' : 'No members in this workspace'}
          </div>
        ) : (
          filtered.map((m) => {
            const isOn = selected.includes(m.userId)
            const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE.MEMBER
            const BadgeIcon = badge.icon
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => onToggle(m.userId)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  'hover:bg-accent focus-visible:bg-accent outline-none',
                  isOn && 'bg-brand-50/70 dark:bg-brand-950/40',
                )}
              >
                {/* Avatar with check badge */}
                <div className="relative flex-shrink-0">
                  <UserAvatar name={m.user.name} src={m.user.avatarUrl} size="sm" />
                  {isOn && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-brand-600 ring-2 ring-background flex items-center justify-center">
                      <Check className="h-2 w-2 text-white stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'text-sm font-medium truncate',
                      isOn ? 'text-brand-700 dark:text-brand-300' : 'text-foreground',
                    )}>
                      {m.user.name}
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0',
                      badge.cls,
                    )}>
                      <BadgeIcon className="h-2.5 w-2.5" />
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>

                {/* Checkbox / Radio indicator */}
                <div className={cn(
                  'h-4 w-4 flex-shrink-0 border-2 flex items-center justify-center transition-all',
                  multi ? 'rounded' : 'rounded-full',
                  isOn ? 'bg-brand-600 border-brand-600' : 'border-input',
                )}>
                  {isOn && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer hint */}
      {multi && (
        <div className={cn(
          'px-3 py-2 text-xs border-t border-border',
          selected.length >= 2
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-muted/30 text-muted-foreground',
        )}>
          {selected.length >= 2
            ? `✓ ${selected.length} members selected — ready to create`
            : `Select at least 2 members for a group task (${selected.length}/2)`}
        </div>
      )}
    </div>
  )
}

// ─── Selected chips ──────────────────────────────────────────────────────────
function SelectedChips({ members, onRemove }: { members: WorkspaceMember[]; onRemove: (id: string) => void }) {
  if (!members.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      <AnimatePresence mode="popLayout">
        {members.map((m) => (
          <motion.div
            key={m.userId}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.13 }}
            className="flex items-center gap-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 pl-0.5 pr-2 py-0.5"
          >
            <UserAvatar name={m.user.name} src={m.user.avatarUrl} size="xs" />
            <span className="text-xs font-medium text-brand-700 dark:text-brand-300 max-w-[80px] truncate">
              {m.user.name}
            </span>
            <button
              type="button"
              onClick={() => onRemove(m.userId)}
              className="text-brand-400 hover:text-brand-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Main modal ──────────────────────────────────────────────────────────────
export default function CreateTaskModal({ open, onClose, projectId }: Props) {
  const queryClient    = useQueryClient()
  const workspaceId    = useUIStore((s) => s.activeWorkspaceId)

  const [step,       setStep]       = useState<Step>('type')
  const [taskType,   setTaskType]   = useState<TaskType | null>(null)
  const [direction,  setDirection]  = useState(1)
  const [title,      setTitle]      = useState('')
  const [description,setDescription]= useState('')
  const [urgency,    setUrgency]    = useState<Urgency>('medium')
  const [dueDate,    setDueDate]    = useState('')
  const [assigneeIds,setAssigneeIds]= useState<string[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? '')

  useEffect(() => {
    if (open) {
      setStep('type'); setTaskType(null)
      setTitle(''); setDescription('')
      setUrgency('medium'); setDueDate('')
      setAssigneeIds([])
      setSelectedProjectId(projectId ?? '')
      setDirection(1)
    }
  }, [open, projectId])

  const { data: members = [], isLoading: membersLoading } = useQuery<WorkspaceMember[]>({
    queryKey: QUERY_KEYS.workspaces.members(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`)
      return data.data
    },
    enabled: !!workspaceId && open,
  })

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: QUERY_KEYS.projects.list(workspaceId ?? undefined),
    queryFn: async () => {
      if (!workspaceId) return []
      const res = await projectsService.list(workspaceId)
      return res.data
    },
    enabled: !!workspaceId && !projectId && open,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      tasksService.create({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: selectedProjectId,
        priority: URGENCY[urgency].priority,
        status: 'TODO',
        assigneeIds,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        labelIds: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created successfully')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Failed to create task'
      toast.error(msg)
    },
  })

  function pickType(type: TaskType) {
    setTaskType(type); setDirection(1); setStep('form')
  }
  function goBack() {
    setDirection(-1); setStep('type'); setTaskType(null); setAssigneeIds([])
  }
  function toggleAssignee(userId: string) {
    if (taskType === 'individual') {
      setAssigneeIds((p) => p.includes(userId) ? [] : [userId])
    } else {
      setAssigneeIds((p) => p.includes(userId) ? p.filter((id) => id !== userId) : [...p, userId])
    }
  }

  const selectedMembers = members.filter((m) => assigneeIds.includes(m.userId))
  const canSubmit =
    title.trim().length > 0 &&
    (projectId || selectedProjectId.length > 0) &&
    (taskType === 'group' ? assigneeIds.length >= 2 : true)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <AnimatePresence mode="wait" custom={direction}>

          {/* ── Step 1: Type picker ── */}
          {step === 'type' && (
            <motion.div key="type" custom={-direction} variants={slide}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="p-6 space-y-5"
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Create a Task</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  How would you like to assign this task?
                </p>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 pt-1">
                {/* Individual */}
                <button
                  onClick={() => pickType('individual')}
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-6 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100/50 dark:hover:shadow-blue-950/50 transition-all duration-150"
                >
                  <div className="h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center group-hover:scale-110 transition-transform duration-150">
                    <User className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Individual</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Assign to one team member
                    </p>
                  </div>
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    1 person
                  </span>
                </button>

                {/* Group */}
                <button
                  onClick={() => pickType('group')}
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-6 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-100/50 dark:hover:shadow-purple-950/50 transition-all duration-150"
                >
                  <div className="h-14 w-14 rounded-2xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center group-hover:scale-110 transition-transform duration-150">
                    <Users className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Group</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Collaborate with multiple members
                    </p>
                  </div>
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    2+ people
                  </span>
                </button>
              </div>

              <div className="flex justify-end">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Form ── */}
          {step === 'form' && (
            <motion.div key="form" custom={direction} variants={slide}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className={cn(
                'px-5 pt-5 pb-4 border-b border-border flex-shrink-0',
                taskType === 'individual'
                  ? 'bg-gradient-to-r from-blue-50/70 dark:from-blue-950/30 to-transparent'
                  : 'bg-gradient-to-r from-purple-50/70 dark:from-purple-950/30 to-transparent',
              )}>
                <div className="flex items-center gap-2.5">
                  <button onClick={goBack}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className={cn(
                    'h-8 w-8 rounded-xl flex items-center justify-center',
                    taskType === 'individual' ? 'bg-blue-100 dark:bg-blue-950' : 'bg-purple-100 dark:bg-purple-950',
                  )}>
                    {taskType === 'individual'
                      ? <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      : <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    }
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold leading-tight">
                      {taskType === 'individual' ? 'Individual Task' : 'Group Task'}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                      {taskType === 'individual'
                        ? 'Assign to a single team member'
                        : 'Collaborate with 2+ team members'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                {/* Project */}
                {!projectId && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Project
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:border-brand-400 transition-colors"
                    >
                      <option value="">Select project…</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {taskType === 'individual' ? 'Task title' : 'Group objective'}
                  </label>
                  <Input
                    placeholder={
                      taskType === 'individual'
                        ? 'e.g. Review the design mockups'
                        : 'e.g. Launch the Q3 marketing campaign'
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    className="rounded-xl"
                  />
                </div>

                {/* ── Member picker (always visible) ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {taskType === 'individual' ? 'Assign to' : 'Team members'}
                    </label>
                    {taskType === 'individual' && selectedMembers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAssigneeIds([])}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Selected chips */}
                  {selectedMembers.length > 0 && (
                    <SelectedChips members={selectedMembers} onRemove={toggleAssignee} />
                  )}

                  {/* Inline member list — always visible */}
                  <MemberList
                    members={members}
                    selected={assigneeIds}
                    multi={taskType === 'group'}
                    loading={membersLoading}
                    onToggle={toggleAssignee}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Description{' '}
                    <span className="normal-case font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <Textarea
                    placeholder={
                      taskType === 'individual'
                        ? 'Describe what this person needs to accomplish…'
                        : 'Describe the goal, steps, or requirements for the group…'
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="rounded-xl resize-none"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Priority
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.entries(URGENCY) as [Urgency, typeof URGENCY.low][]).map(([u, cfg]) => {
                      const on = urgency === u
                      return (
                        <button key={u} type="button" onClick={() => setUrgency(u)}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-xs font-medium border-2 transition-all duration-150',
                            on ? cn(cfg.active, 'scale-[1.04] shadow-sm') : 'border-border bg-muted/30 hover:border-muted-foreground/40',
                          )}
                        >
                          <span className={cn('h-2.5 w-2.5 rounded-full', cfg.dot)} />
                          <span>{cfg.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Due date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Due date{' '}
                    <span className="normal-case font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:border-brand-400 transition-colors"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/20 flex-shrink-0">
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="brand"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !canSubmit}
                  className="gap-2 min-w-[130px]"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      Create Task
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

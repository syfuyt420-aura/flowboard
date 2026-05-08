import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { User, Users, ChevronLeft, X, Calendar, ArrowRight, Mail } from 'lucide-react'
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
type Urgency = 'low' | 'medium' | 'high' | 'critical'
type Step = 'type' | 'form'

const URGENCY_CONFIG: Record<Urgency, { label: string; color: string; ring: string; priority: 'P0' | 'P1' | 'P2' | 'P3'; emoji: string }> = {
  low:      { label: 'Low',      color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',  ring: 'ring-slate-400',  priority: 'P3', emoji: '🟢' },
  medium:   { label: 'Medium',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300', ring: 'ring-yellow-400', priority: 'P2', emoji: '🟡' },
  high:     { label: 'High',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', ring: 'ring-orange-400', priority: 'P1', emoji: '🟠' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',           ring: 'ring-red-500',    priority: 'P0', emoji: '🔴' },
}

interface CreateTaskModalProps {
  open: boolean
  onClose: () => void
  projectId?: string
}

const slide = {
  enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
}

export default function CreateTaskModal({ open, onClose, projectId }: CreateTaskModalProps) {
  const queryClient = useQueryClient()
  const workspaceId = useUIStore((s) => s.activeWorkspaceId)

  const [step, setStep] = useState<Step>('type')
  const [taskType, setTaskType] = useState<TaskType | null>(null)
  const [direction, setDirection] = useState(1)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<Urgency>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? '')

  useEffect(() => {
    if (open) {
      setStep('type')
      setTaskType(null)
      setTitle('')
      setDescription('')
      setUrgency('medium')
      setDueDate('')
      setAssigneeIds([])
      setEmailInput('')
      setEmailError('')
      setSelectedProjectId(projectId ?? '')
      setDirection(1)
    }
  }, [open, projectId])

  const { data: members = [] } = useQuery<WorkspaceMember[]>({
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
        priority: URGENCY_CONFIG[urgency].priority,
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
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to create task'
      toast.error(msg)
    },
  })

  function pickTaskType(type: TaskType) {
    setTaskType(type)
    setDirection(1)
    setStep('form')
  }

  function goBack() {
    setDirection(-1)
    setStep('type')
    setTaskType(null)
  }

  function addByEmail() {
    const email = emailInput.trim().toLowerCase()
    if (!email) return
    const match = members.find((m) => m.user.email.toLowerCase() === email)
    if (!match) {
      setEmailError('No workspace member found with this email')
      return
    }
    if (assigneeIds.includes(match.userId)) {
      setEmailError('This person is already added')
      return
    }
    if (taskType === 'individual' && assigneeIds.length >= 1) {
      // replace existing for individual
      setAssigneeIds([match.userId])
    } else {
      setAssigneeIds((prev) => [...prev, match.userId])
    }
    setEmailInput('')
    setEmailError('')
  }

  function removeAssignee(userId: string) {
    setAssigneeIds((prev) => prev.filter((id) => id !== userId))
  }

  const selectedMembers = members.filter((m) => assigneeIds.includes(m.userId))

  const canSubmit =
    title.trim().length > 0 &&
    (projectId ? true : selectedProjectId.length > 0) &&
    (taskType === 'group' ? assigneeIds.length >= 2 : assigneeIds.length >= 1 || true)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 'type' ? (
            <motion.div
              key="type"
              custom={-direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="p-6 space-y-5"
            >
              <DialogHeader>
                <DialogTitle className="text-xl">Create a Task</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  What kind of task would you like to create?
                </p>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => pickTaskType('individual')}
                  className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-6 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all duration-150 text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <User className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Individual Task</p>
                    <p className="text-xs text-muted-foreground mt-1">Assign to a single team member</p>
                  </div>
                </button>

                <button
                  onClick={() => pickTaskType('group')}
                  className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-6 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all duration-150 text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Group Task</p>
                    <p className="text-xs text-muted-foreground mt-1">Collaborate with multiple members</p>
                  </div>
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="p-6 space-y-5 max-h-[85vh] overflow-y-auto"
            >
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <DialogTitle className="text-xl">
                      {taskType === 'individual' ? 'Individual Task' : 'Group Task'}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {taskType === 'individual'
                        ? 'Assign a specific task to one person'
                        : 'Create a collaborative task for your team'}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              {/* Project selector (when no projectId prop) */}
              {!projectId && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select project…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Task title */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {taskType === 'individual' ? 'What needs to be done?' : 'What is the group objective?'}
                </label>
                <Input
                  placeholder={taskType === 'individual' ? 'e.g. Review the design mockups' : 'e.g. Launch the Q3 marketing campaign'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Assignee(s) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {taskType === 'individual' ? 'Assign to' : 'Add team members'}
                </label>

                {/* Selected member chips */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((m) => (
                      <div
                        key={m.userId}
                        className="flex items-center gap-1.5 rounded-full bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 pl-1 pr-2 py-0.5"
                      >
                        <UserAvatar name={m.user.name} src={m.user.avatarUrl} size="xs" />
                        <span className="text-xs font-medium text-brand-700 dark:text-brand-300">{m.user.name}</span>
                        <button
                          onClick={() => removeAssignee(m.userId)}
                          className="text-brand-400 hover:text-brand-700 dark:hover:text-brand-200 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Email input */}
                {(taskType === 'group' || selectedMembers.length === 0) && (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={taskType === 'individual' ? 'Enter email address…' : 'Enter email to add member…'}
                        value={emailInput}
                        onChange={(e) => { setEmailInput(e.target.value); setEmailError('') }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addByEmail() } }}
                        className="pl-9 text-sm"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addByEmail} className="flex-shrink-0">
                      Add
                    </Button>
                  </div>
                )}
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
                {taskType === 'group' && assigneeIds.length < 2 && (
                  <p className="text-xs text-muted-foreground">Add at least 2 members for a group task</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {taskType === 'individual' ? 'What do they need to do?' : 'Describe the task in detail'}
                </label>
                <Textarea
                  placeholder={taskType === 'individual'
                    ? 'Describe exactly what this person needs to accomplish…'
                    : 'Describe the goal, steps, or requirements for the group…'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Urgency level */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Urgency level</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(URGENCY_CONFIG) as Urgency[]).map((u) => {
                    const cfg = URGENCY_CONFIG[u]
                    const selected = urgency === u
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUrgency(u)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-medium border-2 transition-all',
                          selected
                            ? cn(cfg.color, 'border-current ring-2', cfg.ring, 'scale-105')
                            : 'border-border hover:border-muted-foreground/40 bg-muted/30'
                        )}
                      >
                        <span className="text-base">{cfg.emoji}</span>
                        <span>{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Due date */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Due date <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button
                  variant="brand"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !canSubmit}
                  className="gap-2"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create Task'}
                  {!createMutation.isPending && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

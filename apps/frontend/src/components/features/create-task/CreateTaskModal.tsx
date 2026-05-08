import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { User, Users, ChevronLeft, Plus, X, Check, Calendar, ArrowRight } from 'lucide-react'
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
  const [memberSearch, setMemberSearch] = useState('')
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? '')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setStep('type')
      setTaskType(null)
      setTitle('')
      setDescription('')
      setUrgency('medium')
      setDueDate('')
      setAssigneeIds([])
      setMemberSearch('')
      setMemberDropdownOpen(false)
      setSelectedProjectId(projectId ?? '')
      setDirection(1)
    }
  }, [open, projectId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMemberDropdownOpen(false)
      }
    }
    if (memberDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [memberDropdownOpen])

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
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list(task.projectId) })
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

  function toggleAssignee(userId: string) {
    if (taskType === 'individual') {
      setAssigneeIds((prev) => (prev.includes(userId) ? [] : [userId]))
      setMemberDropdownOpen(false)
    } else {
      setAssigneeIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      )
    }
  }

  const filteredMembers = members.filter((m) =>
    m.user.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.user.email.toLowerCase().includes(memberSearch.toLowerCase())
  )

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
                          onClick={() => toggleAssignee(m.userId)}
                          className="text-brand-400 hover:text-brand-700 dark:hover:text-brand-200 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Member dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setMemberDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl border border-dashed border-input px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-brand-400 transition-colors w-full"
                  >
                    <Plus className="h-4 w-4" />
                    {taskType === 'individual'
                      ? selectedMembers.length === 0 ? 'Select a person' : 'Change assignee'
                      : 'Add a team member'}
                  </button>

                  {memberDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover shadow-lg overflow-hidden">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search members…"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredMembers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
                        ) : (
                          filteredMembers.map((m) => {
                            const selected = assigneeIds.includes(m.userId)
                            return (
                              <button
                                key={m.userId}
                                onClick={() => toggleAssignee(m.userId)}
                                className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-accent transition-colors text-left"
                              >
                                <UserAvatar name={m.user.name} src={m.user.avatarUrl} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{m.user.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                                </div>
                                {selected && <Check className="h-4 w-4 text-brand-500 flex-shrink-0" />}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
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

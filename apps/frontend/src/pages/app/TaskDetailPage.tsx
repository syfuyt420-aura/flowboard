import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  X,
  Calendar,
  Clock,
  Users,
  Flag,
  MessageSquare,
  Activity,
  Timer,
  StopCircle,
  Edit3,
  Check,
  ChevronDown,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { tasksService } from '@/services/tasks.service';
import { api } from '@/lib/axios';
import { QUERY_KEYS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import type { Task, Comment, ActivityLog, WorkspaceMember } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'BACKLOG', label: 'Backlog', color: 'text-slate-500' },
  { value: 'TODO', label: 'To Do', color: 'text-blue-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'text-amber-500' },
  { value: 'IN_REVIEW', label: 'In Review', color: 'text-purple-500' },
  { value: 'DONE', label: 'Done', color: 'text-green-500' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'P0', label: 'Critical', color: 'text-red-600 bg-red-50 dark:bg-red-950' },
  { value: 'P1', label: 'High', color: 'text-orange-500 bg-orange-50 dark:bg-orange-950' },
  { value: 'P2', label: 'Medium', color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950' },
  { value: 'P3', label: 'Low', color: 'text-slate-400 bg-slate-50 dark:bg-slate-900' },
] as const;

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  return (
    <span className={cn('text-xs font-medium', opt?.color ?? 'text-muted-foreground')}>
      {opt?.label ?? status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const opt = PRIORITY_OPTIONS.find((p) => p.value === priority);
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', opt?.color ?? '')}>
      {opt?.label ?? priority}
    </span>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-3">
      <UserAvatar
        name={(comment as Comment & { author?: { name: string; avatarUrl?: string | null } }).author?.name ?? 'User'}
        src={(comment as Comment & { author?: { avatarUrl?: string | null } }).author?.avatarUrl}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {(comment as Comment & { author?: { name: string } }).author?.name ?? 'Unknown'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleDateString('en', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="text-sm bg-muted/50 rounded-xl px-3 py-2">
          {comment.content}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ item }: { item: ActivityLog }) {
  return (
    <div className="flex gap-3 items-start">
      <UserAvatar
        name={(item as ActivityLog & { user?: { name: string } }).user?.name ?? 'User'}
        src={(item as ActivityLog & { user?: { avatarUrl?: string | null } }).user?.avatarUrl}
        size="xs"
      />
      <div className="flex-1 min-w-0 pb-3 border-b border-border/50 last:border-0">
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {(item as ActivityLog & { user?: { name: string } }).user?.name ?? 'Someone'}
          </span>{' '}
          {item.action}
        </span>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(item.createdAt).toLocaleDateString('en', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

type Tab = 'overview' | 'comments' | 'activity';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  const [tab, setTab] = useState<Tab>('overview');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [commentText, setCommentText] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const assigneePickerRef = useRef<HTMLDivElement>(null);

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: QUERY_KEYS.tasks.detail(id!),
    queryFn: () => tasksService.get(id!),
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: QUERY_KEYS.tasks.comments(id!),
    queryFn: () => tasksService.getComments(id!),
    enabled: !!id && tab === 'comments',
  });

  const { data: activity = [] } = useQuery<ActivityLog[]>({
    queryKey: QUERY_KEYS.tasks.activity(id!),
    queryFn: () => tasksService.getActivity(id!),
    enabled: !!id && tab === 'activity',
  });

  const { data: workspaceMembers = [] } = useQuery<WorkspaceMember[]>({
    queryKey: QUERY_KEYS.workspaces.members(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkspaceMember[] }>(
        `/workspaces/${workspaceId}/members`
      );
      return data.data;
    },
    enabled: !!workspaceId,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(e.target as Node)) {
        setAssigneePickerOpen(false);
      }
    }
    if (assigneePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [assigneePickerOpen]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Task>) => tasksService.update(id!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.tasks.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksService.delete(id!),
    onSuccess: () => {
      toast.success('Task deleted');
      navigate(-1);
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => tasksService.addComment(id!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.comments(id!) });
      setCommentText('');
      toast.success('Comment added');
    },
  });

  const timerMutation = useMutation({
    mutationFn: () => timerRunning ? tasksService.stopTimer(id!) : tasksService.startTimer(id!),
    onSuccess: () => {
      setTimerRunning((r) => !r);
      toast.success(timerRunning ? 'Timer stopped' : 'Timer started');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl mx-auto px-6">
          <div className="h-8 bg-muted rounded-lg animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          <div className="h-32 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Task not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Tasks</span>
            <ChevronDown className="h-3 w-3 -rotate-90" />
            <span className="text-foreground font-medium truncate max-w-[300px]">{task.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={timerRunning ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => timerMutation.mutate()}
          >
            {timerRunning ? (
              <><StopCircle className="h-4 w-4 mr-1.5" /> Stop timer</>
            ) : (
              <><Timer className="h-4 w-4 mr-1.5" /> Start timer</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/app/projects/${task.projectId}/board`)}
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Open in board
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm('Delete this task?')) deleteMutation.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Title */}
          <div>
            {editingTitle ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 text-2xl font-display font-bold bg-transparent border-b-2 border-brand-500 outline-none pb-1"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    if (titleDraft.trim() && titleDraft !== task.title) {
                      updateMutation.mutate({ title: titleDraft });
                    }
                    setEditingTitle(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                />
              </div>
            ) : (
              <button
                className="group flex items-start gap-2 w-full text-left"
                onClick={() => { setTitleDraft(task.title); setEditingTitle(true); }}
              >
                <h1 className="text-2xl font-display font-bold leading-tight">{task.title}</h1>
                <Edit3 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 mt-1.5 flex-shrink-0 transition-opacity" />
              </button>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-accent transition-colors"
                onClick={() => setStatusOpen((o) => !o)}
              >
                <StatusBadge status={task.status} />
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {statusOpen && (
                <div className="absolute top-full mt-1 left-0 z-10 bg-popover border rounded-xl shadow-lg py-1 min-w-[140px]">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        'flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent transition-colors',
                        opt.color
                      )}
                      onClick={() => {
                        updateMutation.mutate({ status: opt.value });
                        setStatusOpen(false);
                      }}
                    >
                      {opt.label}
                      {task.status === opt.value && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <PriorityBadge priority={task.priority} />

            {task.dueDate && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Description</p>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Add a description..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="brand"
                    onClick={() => {
                      updateMutation.mutate({ description: descDraft });
                      setEditingDesc(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                className="group w-full text-left rounded-xl border border-dashed border-border/50 p-3 hover:border-border hover:bg-accent/30 transition-all"
                onClick={() => { setDescDraft(task.description ?? ''); setEditingDesc(true); }}
              >
                {task.description ? (
                  <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/60">Click to add description…</p>
                )}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div>
            <div className="flex gap-1 border-b mb-4">
              {(['overview', 'comments', 'activity'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
                    tab === t
                      ? 'text-foreground border-brand-500'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  )}
                >
                  {t}
                  {t === 'comments' && comments.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {comments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div className="space-y-4">
                {task.labels && task.labels.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Labels</p>
                    <div className="flex flex-wrap gap-2">
                      {(task.labels as Array<{ id: string; name: string; color: string }>).map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ backgroundColor: `${label.color}20`, color: label.color }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {task.estimatedHours != null && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Estimate</p>
                    <span className="flex items-center gap-1.5 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {String(task.estimatedHours)}h estimated
                    </span>
                  </div>
                )}

                {task.storyPoints != null && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Story Points</p>
                    <Badge variant="secondary">{task.storyPoints} pts</Badge>
                  </div>
                )}
              </div>
            )}

            {tab === 'comments' && (
              <div className="space-y-4">
                {comments.map((c) => <CommentItem key={c.id} comment={c} />)}

                {user && (
                  <div className="flex gap-3">
                    <UserAvatar name={user.name} src={user.avatarUrl} size="sm" />
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Write a comment…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="min-h-[80px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && commentText.trim()) {
                            commentMutation.mutate(commentText.trim());
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={!commentText.trim() || commentMutation.isPending}
                        onClick={() => commentMutation.mutate(commentText.trim())}
                      >
                        Comment
                      </Button>
                    </div>
                  </div>
                )}

                {comments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No comments yet</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'activity' && (
              <div className="space-y-0">
                {activity.map((item) => <ActivityItem key={item.id} item={item} />)}
                {activity.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No activity yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — assignees & meta */}
        <aside className="w-60 flex-shrink-0 border-l px-4 py-6 space-y-6 overflow-y-auto hidden lg:block">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Assignees
              </p>
              <div className="relative" ref={assigneePickerRef}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setAssigneePickerOpen((o) => !o)}
                  title="Add assignee"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                {assigneePickerOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 bg-popover border rounded-xl shadow-lg py-1 w-48 max-h-56 overflow-y-auto">
                    {workspaceMembers.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No members</p>
                    )}
                    {workspaceMembers.map((m) => {
                      const currentIds = (
                        task.assignees as Array<{ userId: string }> | undefined ?? []
                      ).map((a) => a.userId);
                      const isAssigned = currentIds.includes(m.userId);
                      return (
                        <button
                          key={m.userId}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                          onClick={() => {
                            const newIds = isAssigned
                              ? currentIds.filter((id) => id !== m.userId)
                              : [...currentIds, m.userId];
                            updateMutation.mutate({ assigneeIds: newIds } as Partial<Task>);
                            setAssigneePickerOpen(false);
                          }}
                        >
                          <UserAvatar name={m.user.name} src={m.user.avatarUrl} size="xs" />
                          <span className="flex-1 text-left truncate">{m.user.name}</span>
                          {isAssigned && <Check className="h-3 w-3 text-brand-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {task.assignees && task.assignees.length > 0 ? (
              <div className="space-y-2">
                {(task.assignees as Array<{ userId: string; user: { name: string; avatarUrl?: string | null } }>).map((a) => {
                  const currentIds = (
                    task.assignees as Array<{ userId: string }> | undefined ?? []
                  ).map((x) => x.userId);
                  return (
                    <div key={a.userId} className="flex items-center gap-2 group">
                      <UserAvatar name={a.user.name} src={a.user.avatarUrl} size="sm" />
                      <span className="text-sm flex-1 truncate">{a.user.name}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        title="Remove assignee"
                        onClick={() => {
                          updateMutation.mutate({
                            assigneeIds: currentIds.filter((id) => id !== a.userId),
                          } as Partial<Task>);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60">No assignees</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Flag className="h-3 w-3" /> Priority
            </p>
            <PriorityBadge priority={task.priority} />
          </div>

          {task.startDate && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Start date
              </p>
              <p className="text-sm">
                {new Date(task.startDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          )}

          {task.dueDate && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Due date
              </p>
              <p className="text-sm">
                {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Created</p>
            <p className="text-sm text-muted-foreground">
              {new Date(task.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

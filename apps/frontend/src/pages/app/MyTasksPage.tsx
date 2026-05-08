import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  Eye,
  MessageSquare,
  ChevronRight,
  Inbox,
  Send,
  X,
} from 'lucide-react';
import { tasksService } from '@/services/tasks.service';
import { api } from '@/lib/axios';

import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/shared/Skeleton';
import type { Task, Comment } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  BACKLOG: { label: 'Backlog', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-900' },
  TODO: { label: 'To Do', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950' },
  IN_REVIEW: { label: 'In Review', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950' },
  DONE: { label: 'Done', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  P0: { label: 'Critical', color: 'text-red-600', dot: 'bg-red-500' },
  P1: { label: 'High', color: 'text-orange-500', dot: 'bg-orange-500' },
  P2: { label: 'Medium', color: 'text-yellow-500', dot: 'bg-yellow-400' },
  P3: { label: 'Low', color: 'text-slate-400', dot: 'bg-slate-400' },
};

interface UpdateModalProps {
  task: Task;
  onClose: () => void;
}

function PostUpdateModal({ task, onClose }: UpdateModalProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [message, setMessage] = useState('');
  const [newStatus, setNewStatus] = useState<string>(task.status as string);

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['task-comments', task.id],
    queryFn: () => tasksService.getComments(task.id),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => tasksService.addComment(task.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'mine'] });
      setMessage('');
      toast.success('Update posted');
    },
    onError: () => toast.error('Failed to post update'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      tasksService.update(task.id, { status: status as Task['status'] }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'mine'] });
      setNewStatus(updated.status as string);
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const handleSubmit = () => {
    if (!message.trim()) return;
    const prefix =
      newStatus !== (task.status as string)
        ? `[Status → ${STATUS_CONFIG[newStatus]?.label ?? newStatus}] `
        : '';
    const content = prefix + message.trim();
    if (newStatus !== (task.status as string)) {
      statusMutation.mutate(newStatus, {
        onSuccess: () => commentMutation.mutate(content),
      });
    } else {
      commentMutation.mutate(content);
    }
  };

  const STATUS_BUTTONS = [
    { value: 'IN_PROGRESS', label: 'Working On It', icon: PlayCircle, color: 'text-amber-500 border-amber-300 bg-amber-50 dark:bg-amber-950/40' },
    { value: 'IN_REVIEW', label: 'Ready for Review', icon: Eye, color: 'text-purple-500 border-purple-300 bg-purple-50 dark:bg-purple-950/40' },
    { value: 'DONE', label: 'Mark Done', icon: CheckCircle2, color: 'text-green-500 border-green-300 bg-green-50 dark:bg-green-950/40' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        className="bg-card rounded-2xl shadow-2xl border w-full max-w-lg max-h-[85vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Post Progress Update</p>
            <h3 className="font-semibold text-sm leading-snug line-clamp-2">{task.title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_CONFIG[task.status as string]?.bg, STATUS_CONFIG[task.status as string]?.color)}>
                {STATUS_CONFIG[task.status as string]?.label ?? task.status}
              </span>
              <span className={cn('text-xs font-medium', PRIORITY_CONFIG[task.priority as string]?.color)}>
                {PRIORITY_CONFIG[task.priority as string]?.label ?? task.priority}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick status update */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Update Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_BUTTONS.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setNewStatus(value)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all',
                  newStatus === value ? color + ' ring-2 ring-offset-1 ring-current/30' : 'border-border hover:bg-accent'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Comments history */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 min-h-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thread</p>
          {commentsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No updates yet. Be the first to post!</p>
          ) : (
            (comments as Array<Comment & { author?: { name: string; avatarUrl?: string | null } }>).map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <UserAvatar name={c.author?.name ?? 'User'} src={c.author?.avatarUrl} size="xs" className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 bg-muted/50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{c.author?.name ?? 'Unknown'}</span>
                    {c.author?.name === user?.name && (
                      <span className="text-[10px] bg-brand-100 text-brand-600 dark:bg-brand-950 dark:text-brand-300 px-1.5 py-0.5 rounded-full font-medium">You</span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(c.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Post update */}
        <div className="border-t p-4 space-y-3">
          <div className="flex gap-2.5">
            {user && <UserAvatar name={user.name} src={user.avatarUrl} size="xs" className="flex-shrink-0 mt-1" />}
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your progress, blockers, or updates…"
              rows={2}
              className="text-sm resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">⌘↵ to send</p>
            <Button
              size="sm"
              variant="brand"
              onClick={handleSubmit}
              disabled={!message.trim() || commentMutation.isPending || statusMutation.isPending}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Post Update
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  index: number;
  onUpdate: (task: Task) => void;
  onNavigate: (taskId: string) => void;
}

function TaskRow({ task, index, onUpdate, onNavigate }: TaskRowProps) {
  const statusCfg = STATUS_CONFIG[task.status as string] ?? STATUS_CONFIG.TODO;
  const priorityCfg = PRIORITY_CONFIG[task.priority as string] ?? PRIORITY_CONFIG.P2;
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const now = new Date();
  const isOverdue = dueDate && dueDate < now && task.status !== 'DONE';
  const isDone = task.status === 'DONE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-all group',
        isDone && 'opacity-60',
        isOverdue && 'border-red-200 dark:border-red-900'
      )}
    >
      {/* Priority dot */}
      <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', priorityCfg.dot)} title={priorityCfg.label} />

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isDone && 'line-through text-muted-foreground')}>{task.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', statusCfg.bg, statusCfg.color)}>
            {statusCfg.label}
          </span>
          {isOverdue && (
            <span className="flex items-center gap-0.5 text-xs text-red-500 font-medium">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </span>
          )}
          {dueDate && !isOverdue && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {dueDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.commentCount != null && task.commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {task.commentCount}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdate(task)}
          className="text-xs h-7 px-2"
        >
          <MessageSquare className="h-3.5 w-3.5 mr-1" />
          Update
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onNavigate(task.id)}
          title="Open task"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className={cn('p-1.5 rounded-lg', colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <p className="text-3xl font-display font-bold">{value}</p>
      )}
    </div>
  );
}

export default function MyTasksPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'mine', user?.id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Task[] }>('/tasks/mine');
      return data.data;
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  const tasks = data ?? [];

  const stats = {
    assigned: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
    overdue: tasks.filter((t) => {
      if (!t.dueDate || t.status === 'DONE') return false;
      return new Date(t.dueDate) < new Date();
    }).length,
  };

  const FILTERS = [
    { key: 'all', label: 'All Tasks', count: tasks.length },
    { key: 'active', label: 'In Progress', count: tasks.filter((t) => t.status === 'IN_PROGRESS').length },
    { key: 'todo', label: 'To Do', count: tasks.filter((t) => ['TODO', 'BACKLOG'].includes(t.status as string)).length },
    { key: 'review', label: 'In Review', count: tasks.filter((t) => t.status === 'IN_REVIEW').length },
    { key: 'done', label: 'Done', count: stats.done },
    { key: 'overdue', label: 'Overdue', count: stats.overdue },
  ];

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return t.status === 'IN_PROGRESS';
    if (activeFilter === 'todo') return ['TODO', 'BACKLOG'].includes(t.status as string);
    if (activeFilter === 'review') return t.status === 'IN_REVIEW';
    if (activeFilter === 'done') return t.status === 'DONE';
    if (activeFilter === 'overdue') {
      if (!t.dueDate || t.status === 'DONE') return false;
      return new Date(t.dueDate) < new Date();
    }
    return true;
  });

  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const sortedTasks = [...filteredTasks].sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3)
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-brand-500" />
            My Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tasks assigned to you — stay on top of your work
          </p>
        </div>
        {user && (
          <UserAvatar name={user.name} src={user.avatarUrl} size="md" />
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <StatCard label="Assigned" value={stats.assigned} icon={CheckCircle2} colorClass="bg-brand-100 text-brand-600 dark:bg-brand-950 dark:text-brand-300" loading={isLoading} />
        <StatCard label="In Progress" value={stats.inProgress} icon={PlayCircle} colorClass="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300" loading={isLoading} />
        <StatCard label="Completed" value={stats.done} icon={CheckCircle2} colorClass="bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-300" loading={isLoading} />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} colorClass="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300" loading={isLoading} />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2"
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
              activeFilter === f.key
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              activeFilter === f.key ? 'bg-white/20' : 'bg-muted'
            )}>
              {f.count}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Task List */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-2"
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : sortedTasks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {activeFilter === 'all' ? 'No tasks assigned to you yet' : `No ${FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()} tasks`}
            </p>
            <p className="text-sm mt-1">
              {activeFilter === 'all' ? 'Your manager will assign tasks to you from the project board' : 'Switch filter to see other tasks'}
            </p>
          </div>
        ) : (
          sortedTasks.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              index={i}
              onUpdate={(t) => setSelectedTask(t)}
              onNavigate={(id) => navigate(`/app/tasks/${id}`)}
            />
          ))
        )}
      </motion.div>

      {/* Post Update Modal */}
      <AnimatePresence>
        {selectedTask && (
          <PostUpdateModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

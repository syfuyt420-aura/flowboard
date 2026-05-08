import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, AlertTriangle, MessageSquare, CheckCircle2, Search } from 'lucide-react';
import { tasksService } from '@/services/tasks.service';
import { useUIStore } from '@/stores/uiStore';
import { projectsService } from '@/services/projects.service';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/shared/Skeleton';
import type { Task } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'P0', label: 'Critical' },
  { value: 'P1', label: 'High' },
  { value: 'P2', label: 'Medium' },
  { value: 'P3', label: 'Low' },
];

const STATUS_COLOR: Record<string, string> = {
  BACKLOG: 'text-slate-500 bg-slate-50 dark:bg-slate-900',
  TODO: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  IN_PROGRESS: 'text-amber-600 bg-amber-50 dark:bg-amber-950',
  IN_REVIEW: 'text-purple-600 bg-purple-50 dark:bg-purple-950',
  DONE: 'text-green-600 bg-green-50 dark:bg-green-950',
};

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: 'Backlog', TODO: 'To Do', IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review', DONE: 'Done',
};

const PRIORITY_DOT: Record<string, string> = {
  P0: 'bg-red-500', P1: 'bg-orange-500', P2: 'bg-yellow-400', P3: 'bg-slate-400',
};

function TaskRow({ task, index, onClick }: { task: Task; index: number; onClick: () => void }) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due && due < new Date() && task.status !== 'DONE';
  const isDone = task.status === 'DONE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.15 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-accent/50 cursor-pointer transition-colors',
        isDone && 'opacity-50'
      )}
    >
      <span className={cn('h-2 w-2 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority as string] ?? PRIORITY_DOT.P2)} />

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isDone && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded', STATUS_COLOR[task.status as string])}>
          {STATUS_LABEL[task.status as string] ?? task.status}
        </span>

        {overdue && (
          <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
            <AlertTriangle className="h-3 w-3" />
            Overdue
          </span>
        )}

        {due && !overdue && task.status !== 'DONE' && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {due.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {task.commentCount != null && task.commentCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {task.commentCount}
          </span>
        )}

        {task.assignees && (task.assignees as Array<{ userId: string; user: { name: string; avatarUrl?: string | null } }>).length > 0 && (
          <div className="flex -space-x-1">
            {(task.assignees as Array<{ userId: string; user: { name: string; avatarUrl?: string | null } }>)
              .slice(0, 3)
              .map((a) => (
                <UserAvatar key={a.userId} name={a.user.name} src={a.user.avatarUrl} size="xs" className="ring-1 ring-background" />
              ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AllTasksPage() {
  const navigate = useNavigate();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const openCreateTask = useUIStore((s) => s.openCreateTask);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await projectsService.list(workspaceId);
      return res.data;
    },
    enabled: !!workspaceId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'all', projectFilter, statusFilter, priorityFilter, search],
    queryFn: () => tasksService.list({
      projectId: projectFilter || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      search: search || undefined,
      limit: 200,
    }),
    select: (d) => d.data,
    refetchInterval: 15000,
  });

  const tasks = data ?? [];

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length,
    overdue: tasks.filter(t => {
      if (!t.dueDate || t.status === 'DONE') return false;
      return new Date(t.dueDate) < new Date();
    }).length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
              All Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} across all projects
            </p>
          </div>
          <button
            onClick={() => openCreateTask()}
            className="flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-primary/85 transition-colors"
          >
            + New Task
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-amber-600' },
            { label: 'Completed', value: stats.done, color: 'text-green-600' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="rounded-lg border bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full pl-8 pr-3 h-8 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>

          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="h-8 text-sm rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-8 text-sm rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="h-8 text-sm rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium text-foreground">No tasks found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || statusFilter || priorityFilter || projectFilter
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-none">
            {tasks.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                index={i}
                onClick={() => navigate(`/app/tasks/${task.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

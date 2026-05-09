import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, MessageSquare, Clock, Search,
  Layers, List, ChevronDown, ChevronRight, Flame,
  CheckCircle2, Circle, Loader2, Eye, Sparkles, Plus,
} from 'lucide-react';
import { tasksService } from '@/services/tasks.service';
import { useUIStore } from '@/stores/uiStore';
import { projectsService } from '@/services/projects.service';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/shared/Skeleton';
import type { Task } from '@flowboard/shared';
import { cn } from '@/lib/utils';

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; gradient: string; pill: string; dot: string }> = {
  BACKLOG:     { label: 'Backlog',     icon: Circle,       gradient: 'from-slate-400 to-slate-500',   pill: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400',   dot: 'bg-slate-400' },
  TODO:        { label: 'To Do',       icon: Circle,       gradient: 'from-blue-400 to-blue-600',     pill: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',        dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'In Progress', icon: Loader2,      gradient: 'from-amber-400 to-orange-500',  pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',    dot: 'bg-amber-500' },
  IN_REVIEW:   { label: 'In Review',   icon: Eye,          gradient: 'from-purple-400 to-violet-600', pill: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300', dot: 'bg-purple-500' },
  DONE:        { label: 'Done',        icon: CheckCircle2, gradient: 'from-emerald-400 to-teal-500',  pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', dot: 'bg-emerald-500' },
};

const PRIORITY_CFG: Record<string, { label: string; dot: string; gradient: string }> = {
  P0: { label: 'Critical', dot: 'bg-red-500',    gradient: 'from-red-500 to-rose-600' },
  P1: { label: 'High',     dot: 'bg-orange-500', gradient: 'from-orange-400 to-orange-600' },
  P2: { label: 'Medium',   dot: 'bg-amber-400',  gradient: 'from-amber-400 to-yellow-500' },
  P3: { label: 'Low',      dot: 'bg-slate-400',  gradient: 'from-slate-400 to-slate-500' },
};

const STATUS_ORDER = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

// ── Animated stat number ──────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let n = 0;
    const step = Math.max(1, Math.ceil(value / 25));
    const timer = setInterval(() => {
      n = Math.min(n + step, value);
      setDisplay(n);
      if (n >= value) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

// ── Task Row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, index, onClick }: { task: Task; index: number; onClick: () => void }) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const now = new Date();
  const overdue = due && due < now && task.status !== 'DONE';
  const dueSoon = due && !overdue && task.status !== 'DONE' && (due.getTime() - now.getTime()) < 3 * 86400000;
  const isDone = task.status === 'DONE';
  const statusCfg = STATUS_CFG[task.status as string] ?? STATUS_CFG.TODO;
  const StatusIcon = statusCfg.icon;
  const priorityCfg = PRIORITY_CFG[task.priority as string] ?? PRIORITY_CFG.P2;
  const assignees = (task.assignees ?? []) as Array<{ userId: string; user: { name: string; avatarUrl?: string | null } }>;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0',
        'hover:bg-muted/40 cursor-pointer transition-all duration-150',
        isDone && 'opacity-60',
      )}
    >
      {/* Priority stripe */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b', priorityCfg.gradient)} />

      {/* Priority dot */}
      <div className={cn('h-2 w-2 rounded-full flex-shrink-0', priorityCfg.dot)} title={priorityCfg.label} />

      {/* Status icon */}
      <div className={cn('h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0 bg-gradient-to-br', statusCfg.gradient)}>
        <StatusIcon className={cn('h-3 w-3 text-white', task.status === 'IN_PROGRESS' && 'animate-spin')} />
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isDone && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
        {task.description && !isDone && (
          <p className="text-xs text-muted-foreground truncate mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{task.description}</p>
        )}
      </div>

      {/* Right metadata */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Priority label (on hover) */}
        <span className="text-[10px] font-medium text-muted-foreground/60 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity capitalize">
          {priorityCfg.label}
        </span>

        {/* Status badge */}
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', statusCfg.pill)}>
          {statusCfg.label}
        </span>

        {/* Overdue / due */}
        {overdue && (
          <motion.span
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-1 text-xs font-semibold text-red-500"
          >
            <Flame className="h-3 w-3" />
            Overdue
          </motion.span>
        )}
        {dueSoon && !overdue && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
            <Clock className="h-3 w-3" />
            {due!.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {due && !overdue && !dueSoon && task.status !== 'DONE' && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {due.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Comment count */}
        {(task.commentCount ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {task.commentCount}
          </span>
        )}

        {/* Assignees */}
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((a) => (
              <UserAvatar key={a.userId} name={a.user.name} src={a.user.avatarUrl} size="xs" className="ring-2 ring-background" />
            ))}
            {assignees.length > 3 && (
              <div className="h-5 w-5 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Status Group ──────────────────────────────────────────────────────────────
function StatusGroup({ status, tasks, onClickTask }: { status: string; tasks: Task[]; onClickTask: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.TODO;
  const GroupIcon = cfg.icon;

  if (tasks.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 transition-transform" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <div className={cn('h-4 w-4 rounded flex items-center justify-center bg-gradient-to-br', cfg.gradient)}>
          <GroupIcon className="h-2.5 w-2.5 text-white" />
        </div>
        <span className="uppercase tracking-wider">{cfg.label}</span>
        <span className={cn('text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-1', cfg.pill)}>{tasks.length}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mx-4 rounded-xl border border-border/60 bg-card overflow-hidden mb-2">
              {tasks.map((task, i) => (
                <TaskRow key={task.id} task={task} index={i} onClick={() => onClickTask(task.id)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AllTasksPage() {
  const navigate = useNavigate();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const openCreateTask = useUIStore((s) => s.openCreateTask);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [groupByStatus, setGroupByStatus] = useState(true);

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
    refetchInterval: 15_000,
  });

  const tasks = data ?? [];
  const stats = {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
    overdue: tasks.filter((t) => t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date()).length,
    todo: tasks.filter((t) => t.status === 'TODO').length,
  };

  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto">

        {/* ── Hero ───────────────────────────────── */}
        <div
          className="relative overflow-hidden p-6 text-white"
          style={{ background: 'linear-gradient(135deg, #4330cd 0%, #6b5efa 45%, #8b5cf6 100%)' }}
        >
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 right-32 h-32 w-32 rounded-full bg-white/8 blur-2xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />

          <div className="relative z-10 flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-white/60" />
                <span className="text-white/60 text-sm font-medium">Task Manager</span>
              </div>
              <h1 className="text-3xl font-display font-bold tracking-tight">All Tasks</h1>
              <p className="text-white/70 text-sm mt-1">
                {stats.total} task{stats.total !== 1 ? 's' : ''} · {completionPct}% complete
              </p>
            </div>
            <button
              onClick={() => openCreateTask()}
              className="flex items-center gap-2 bg-white text-brand-700 hover:bg-white/90 rounded-xl px-4 py-2.5 text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>

          {/* Stat cards */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Tasks', value: stats.total, icon: CheckSquare, color: 'from-white/20 to-white/10' },
              { label: 'In Progress', value: stats.inProgress, icon: Loader2, color: 'from-amber-400/30 to-amber-600/20' },
              { label: 'Completed', value: stats.done, icon: CheckCircle2, color: 'from-emerald-400/30 to-emerald-600/20' },
              { label: 'Overdue', value: stats.overdue, icon: Flame, color: 'from-red-400/30 to-red-600/20' },
            ].map(({ label, value, icon: Icon, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn('rounded-xl p-3 bg-gradient-to-br border border-white/15 backdrop-blur-sm', color)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/70 text-xs font-medium">{label}</span>
                  <Icon className="h-3.5 w-3.5 text-white/60" />
                </div>
                <div className="text-2xl font-black text-white">
                  {isLoading ? '—' : <AnimatedNumber value={value} />}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="relative z-10 mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/60 text-xs">Overall Progress</span>
              <span className="text-white text-xs font-bold">{completionPct}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* ── Filters ────────────────────────────── */}
        <div className="px-6 py-4 border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="w-full pl-9 pr-3 h-9 text-sm rounded-xl border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Project filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-9 text-sm rounded-xl border border-border/60 bg-background px-3 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-foreground"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
              ))}
            </select>

            {/* Priority pills */}
            <div className="flex gap-1.5">
              {[{ value: '', label: 'All' }, ...Object.entries(PRIORITY_CFG).map(([v, c]) => ({ value: v, label: c.label }))].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPriorityFilter(value)}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
                    priorityFilter === value
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : 'bg-background text-muted-foreground border-border/60 hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); if (e.target.value) setGroupByStatus(false); else setGroupByStatus(true); }}
              className="h-9 text-sm rounded-xl border border-border/60 bg-background px-3 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-foreground"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CFG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>

            {/* Group toggle */}
            <button
              onClick={() => setGroupByStatus((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-medium transition-all',
                groupByStatus
                  ? 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/50 dark:border-brand-800'
                  : 'bg-background text-muted-foreground border-border/60 hover:bg-muted',
              )}
            >
              {groupByStatus ? <Layers className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
              {groupByStatus ? 'Grouped' : 'Flat'}
            </button>
          </div>
        </div>

        {/* ── Task List ──────────────────────────── */}
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-50 to-violet-50 dark:from-brand-950/30 dark:to-violet-950/30 border border-brand-200/60 dark:border-brand-800/40 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-7 w-7 text-brand-400" />
              </div>
              <p className="text-base font-semibold">No tasks found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter || priorityFilter || projectFilter
                  ? 'Try adjusting your filters'
                  : 'Create your first task to get started'}
              </p>
              {!search && !statusFilter && !priorityFilter && !projectFilter && (
                <button
                  onClick={() => openCreateTask()}
                  className="mt-4 flex items-center gap-2 bg-gradient-to-r from-brand-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />
                  New Task
                </button>
              )}
            </motion.div>
          ) : groupByStatus && !statusFilter ? (
            <div>
              {STATUS_ORDER.map((status) => (
                <StatusGroup
                  key={status}
                  status={status}
                  tasks={grouped[status] ?? []}
                  onClickTask={(id) => navigate(`/app/tasks/${id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
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
    </div>
  );
}

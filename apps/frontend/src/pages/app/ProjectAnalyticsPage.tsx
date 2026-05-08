import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react';
import { tasksService } from '@/services/tasks.service';
import { projectsService } from '@/services/projects.service';
import { QUERY_KEYS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'bg-slate-400',
  TODO: 'bg-blue-500',
  IN_PROGRESS: 'bg-amber-500',
  IN_REVIEW: 'bg-purple-500',
  DONE: 'bg-green-500',
  CANCELLED: 'bg-slate-300',
};

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-500',
  P1: 'bg-orange-500',
  P2: 'bg-yellow-400',
  P3: 'bg-slate-400',
};

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}

function MetricCard({ label, value, icon: Icon, color, sub }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card p-5 flex flex-col gap-3 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <span className={cn('p-2 rounded-xl', color)}>
          <Icon className="h-4 w-4 text-white" />
        </span>
      </div>
      <div>
        <span className="text-3xl font-display font-bold">{value}</span>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const offset = circumference - (clampedScore / 100) * circumference;

  const color =
    clampedScore >= 75 ? '#22c55e' : clampedScore >= 50 ? '#f59e0b' : '#ef4444';

  const label =
    clampedScore >= 75 ? 'Healthy' : clampedScore >= 50 ? 'At Risk' : 'Critical';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col items-center gap-3"
    >
      <span className="text-sm text-muted-foreground font-medium self-start">Health Score</span>
      <div className="relative flex items-center justify-center">
        <svg width="128" height="128" className="-rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/30"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-display font-bold" style={{ color }}>
            {clampedScore}%
          </span>
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
      </div>
    </motion.div>
  );
}

function HorizontalBarChart({
  title,
  items,
  total,
}: {
  title: string;
  items: { key: string; label: string; count: number; colorClass: string }[];
  total: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border bg-card p-5 shadow-sm"
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div className="space-y-2.5">
        {items.map((item) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={item.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {item.count} <span className="opacity-60">({Math.round(pct)}%)</span>
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', item.colorClass)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function WeekTrend({ tasks }: { tasks: Task[] }) {
  const days = useMemo(() => {
    const result: { label: string; created: number; completed: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      result.push({
        label: i === 0 ? 'Today' : d.toLocaleDateString('en', { weekday: 'short' }),
        created: tasks.filter((t) => new Date(t.createdAt).toDateString() === dayStr).length,
        completed: tasks.filter(
          (t) => t.status === 'DONE' && new Date(t.updatedAt).toDateString() === dayStr
        ).length,
      });
    }
    return result;
  }, [tasks]);

  const maxVal = Math.max(1, ...days.map((d) => Math.max(d.created, d.completed)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">This Week</h3>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            Created
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Completed
          </span>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end h-20">
              <div
                className="flex-1 rounded-t-sm bg-brand-400 dark:bg-brand-600 transition-all duration-700"
                style={{ height: `${(d.created / maxVal) * 100}%`, minHeight: d.created > 0 ? 4 : 0 }}
                title={`Created: ${d.created}`}
              />
              <div
                className="flex-1 rounded-t-sm bg-green-500 transition-all duration-700"
                style={{ height: `${(d.completed / maxVal) * 100}%`, minHeight: d.completed > 0 ? 4 : 0 }}
                title={`Completed: ${d.completed}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function ProjectAnalyticsPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: QUERY_KEYS.tasks.list(projectId),
    queryFn: () => tasksService.list({ projectId, limit: 200 }),
    enabled: !!projectId,
    select: (d) => d.data,
  });

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: QUERY_KEYS.projects.detail(projectId!),
    queryFn: () => projectsService.get(projectId!),
    enabled: !!projectId,
  });

  const tasks = tasksData ?? [];
  const isLoading = tasksLoading || projectLoading;

  const stats = useMemo(() => {
    const now = new Date();
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'DONE').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE' && t.status !== 'CANCELLED'
    ).length;
    return { total, completed, inProgress, overdue };
  }, [tasks]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return Object.entries(STATUS_LABELS).map(([key, label]) => ({
      key,
      label,
      count: counts[key] ?? 0,
      colorClass: STATUS_COLORS[key] ?? 'bg-muted',
    }));
  }, [tasks]);

  const priorityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      counts[t.priority] = (counts[t.priority] ?? 0) + 1;
    }
    return Object.entries(PRIORITY_LABELS).map(([key, label]) => ({
      key,
      label,
      count: counts[key] ?? 0,
      colorClass: PRIORITY_COLORS[key] ?? 'bg-muted',
    }));
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-muted rounded-xl w-48 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-52 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display font-bold text-lg">{project?.name ?? 'Analytics'}</h2>
          <Badge variant="secondary">Analytics</Badge>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {tasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="font-semibold text-lg">No data yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Add tasks to this project to start seeing analytics and insights.
            </p>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Tasks"
                value={stats.total}
                icon={ListTodo}
                color="bg-brand-500"
                sub="across all statuses"
              />
              <MetricCard
                label="Completed"
                value={stats.completed}
                icon={CheckCircle2}
                color="bg-green-500"
                sub={stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}% of total` : undefined}
              />
              <MetricCard
                label="In Progress"
                value={stats.inProgress}
                icon={Clock}
                color="bg-amber-500"
                sub="active right now"
              />
              <MetricCard
                label="Overdue"
                value={stats.overdue}
                icon={AlertTriangle}
                color={stats.overdue > 0 ? 'bg-red-500' : 'bg-slate-400'}
                sub={stats.overdue > 0 ? 'past due date' : 'all on track'}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <HealthGauge score={project?.healthScore ?? 0} />
              <HorizontalBarChart
                title="Tasks by Status"
                items={statusDistribution}
                total={tasks.length}
              />
              <HorizontalBarChart
                title="Tasks by Priority"
                items={priorityDistribution}
                total={tasks.length}
              />
            </div>

            <WeekTrend tasks={tasks} />
          </>
        )}
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, Zap, Users, Target, BarChart3 } from 'lucide-react';
import { api } from '@/lib/axios';
import { QUERY_KEYS } from '@/lib/constants';
import { useUIStore } from '@/stores/uiStore';
import { Skeleton } from '@/components/shared/Skeleton';
import { Badge } from '@/components/ui/badge';
import type { VelocityData, WorkloadData, DashboardStats } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const CHART_COLORS = {
  brand: '#6b5efa',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
};

const PIE_COLORS = [
  CHART_COLORS.brand,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.blue,
  CHART_COLORS.purple,
];

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  trend?: number;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, color, trend, loading }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={cn('rounded-lg p-1.5', color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="flex items-end justify-between">
          <p className="text-3xl font-display font-bold">{value}</p>
          {trend != null && (
            <span
              className={cn(
                'text-xs font-medium px-1.5 py-0.5 rounded-full',
                trend >= 0
                  ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              )}
            >
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const DUMMY_VELOCITY: Array<VelocityData & { created: number }> = [
  { sprint: 'W1', completed: 12, planned: 18, created: 18 },
  { sprint: 'W2', completed: 19, planned: 14, created: 14 },
  { sprint: 'W3', completed: 15, planned: 22, created: 22 },
  { sprint: 'W4', completed: 24, planned: 17, created: 17 },
  { sprint: 'W5', completed: 21, planned: 20, created: 20 },
  { sprint: 'W6', completed: 28, planned: 15, created: 15 },
];

const DUMMY_STATUS_DIST = [
  { name: 'Backlog', value: 23 },
  { name: 'To Do', value: 18 },
  { name: 'In Progress', value: 14 },
  { name: 'In Review', value: 7 },
  { name: 'Done', value: 42 },
];

export default function AnalyticsPage() {
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: QUERY_KEYS.analytics.dashboard,
    queryFn: async () => {
      const { data } = await api.get<{ data: DashboardStats }>('/analytics/dashboard', {
        params: { workspaceId },
      });
      return data.data;
    },
    enabled: !!workspaceId,
  });

  const { data: workload, isLoading: workloadLoading } = useQuery<WorkloadData[]>({
    queryKey: QUERY_KEYS.analytics.workload(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkloadData[] }>('/analytics/workload', {
        params: { workspaceId },
      });
      return data.data;
    },
    enabled: !!workspaceId,
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand-500" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Team performance insights and project health metrics
          </p>
        </div>
        <Badge variant="brand">Last 6 weeks</Badge>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Total Tasks',
            value: stats?.totalTasks ?? 104,
            icon: Target,
            color: 'bg-brand-50 text-brand-600 dark:bg-brand-950',
            trend: 8,
          },
          {
            label: 'Completed This Week',
            value: stats?.tasksCompletedThisWeek ?? 28,
            icon: TrendingUp,
            color: 'bg-green-50 text-green-600 dark:bg-green-950',
            trend: 17,
          },
          {
            label: 'Overdue',
            value: stats?.overdueTaskCount ?? 6,
            icon: Zap,
            color: 'bg-red-50 text-red-600 dark:bg-red-950',
            trend: -12,
          },
          {
            label: 'Team Members',
            value: stats?.teamMembers ?? 8,
            icon: Users,
            color: 'bg-purple-50 text-purple-600 dark:bg-purple-950',
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <StatCard {...s} loading={statsLoading} />
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Velocity chart */}
        <motion.div
          className="lg:col-span-2 rounded-xl border bg-card p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Team Velocity</h2>
            <span className="text-xs text-muted-foreground">Tasks completed vs created</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={DUMMY_VELOCITY as unknown[]} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.brand} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="sprint" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  borderRadius: '0.75rem',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px',
                }}
              />
              <Legend iconType="circle" iconSize={8} />
              <Area
                type="monotone"
                dataKey="completed"
                stroke={CHART_COLORS.brand}
                strokeWidth={2}
                fill="url(#gradCompleted)"
                name="Completed"
              />
              <Area
                type="monotone"
                dataKey="created"
                stroke={CHART_COLORS.green}
                strokeWidth={2}
                fill="url(#gradCreated)"
                name="Created"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status distribution */}
        <motion.div
          className="rounded-xl border bg-card p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          <h2 className="text-sm font-semibold mb-4">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={DUMMY_STATUS_DIST}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {DUMMY_STATUS_DIST.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '0.75rem',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {DUMMY_STATUS_DIST.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Team workload */}
      <motion.div
        className="rounded-xl border bg-card p-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <h2 className="text-sm font-semibold mb-4">Team Workload</h2>
        {workloadLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={(workload ?? [
                { userId: '1', userName: 'Alice', avatarUrl: null, taskCount: 12, completedThisWeek: 8, overdueTasks: 1, estimatedHours: 20 },
                { userId: '2', userName: 'Bob', avatarUrl: null, taskCount: 9, completedThisWeek: 6, overdueTasks: 0, estimatedHours: 15 },
                { userId: '3', userName: 'Carol', avatarUrl: null, taskCount: 15, completedThisWeek: 10, overdueTasks: 2, estimatedHours: 24 },
                { userId: '4', userName: 'Dan', avatarUrl: null, taskCount: 7, completedThisWeek: 7, overdueTasks: 0, estimatedHours: 12 },
                { userId: '5', userName: 'Eve', avatarUrl: null, taskCount: 11, completedThisWeek: 5, overdueTasks: 3, estimatedHours: 18 },
              ] as WorkloadData[]) as unknown[]}
              margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="userName" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  borderRadius: '0.75rem',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px',
                }}
              />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="completedThisWeek" name="Completed" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
              <Bar dataKey="taskCount" name="Total" fill={CHART_COLORS.brand} radius={[4, 4, 0, 0]} opacity={0.5} />
              <Bar dataKey="overdueTasks" name="Overdue" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}

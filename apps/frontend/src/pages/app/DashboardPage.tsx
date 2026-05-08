import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  FolderKanban,
  Users,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/authStore';
import { Skeleton } from '@/components/shared/Skeleton';
import type { DashboardStats, ActivityLog } from '@flowboard/shared';
import { formatRelativeDate } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/avatar';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, color, loading }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`rounded-lg p-1.5 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <p className="text-3xl font-display font-bold">{value}</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin());

  // Members don't have access to the admin dashboard
  if (!isAdmin) {
    return <Navigate to="/app/my-tasks" replace />;
  }

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: QUERY_KEYS.analytics.dashboard,
    queryFn: async () => {
      const { data } = await api.get<{ data: DashboardStats }>('/analytics/dashboard');
      return data.data;
    },
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['activity', 'feed'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ActivityLog[] }>('/activity/feed?limit=20');
      return data.data;
    },
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-display font-bold">
          {greeting}, {user?.name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's what's happening with your team today.
        </p>
      </motion.div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Open Tasks',
            value: stats?.totalTasks ?? 0,
            icon: CheckSquare,
            color: 'bg-brand-50 text-brand-600 dark:bg-brand-950',
          },
          {
            label: 'Completed This Week',
            value: stats?.tasksCompletedThisWeek ?? 0,
            icon: TrendingUp,
            color: 'bg-green-50 text-green-600 dark:bg-green-950',
          },
          {
            label: 'Overdue',
            value: stats?.overdueTaskCount ?? 0,
            icon: AlertTriangle,
            color: 'bg-red-50 text-red-600 dark:bg-red-950',
          },
          {
            label: 'Active Projects',
            value: stats?.activeProjects ?? 0,
            icon: FolderKanban,
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

      {/* Two column: Activity + Quick Stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity Feed */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </h2>
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity && activity.length > 0 ? (
            <div className="space-y-3">
              {activity.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <UserAvatar
                    name={log.user.name}
                    src={log.user.avatarUrl}
                    size="sm"
                    className="flex-shrink-0 mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{log.user.name}</span>{' '}
                      <span className="text-muted-foreground">{log.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>

        {/* Team Summary */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Team Overview
          </h2>
          {statsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Members</span>
                <span className="font-semibold">{stats?.teamMembers ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Due This Week</span>
                <span className="font-semibold">{stats?.upcomingDeadlines ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Created This Week</span>
                <span className="font-semibold">{stats?.tasksCreatedThisWeek ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

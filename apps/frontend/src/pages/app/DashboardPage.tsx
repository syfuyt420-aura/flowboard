import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckSquare, Clock, AlertTriangle, TrendingUp, FolderKanban,
  Users, Plus, ArrowUpRight, ArrowRight, Zap, Target, Activity,
  Calendar, Star, Sparkles,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '@/lib/axios';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Skeleton } from '@/components/shared/Skeleton';
import type { DashboardStats, ActivityLog } from '@flowboard/shared';
import { formatRelativeDate } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

function AnimatedNumber({ value, loading }: { value: number; loading?: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (loading) { setDisplay(0); return; }
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const steps = 30;
    const increment = value / steps;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      start += increment;
      if (frame >= steps) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, loading]);

  if (loading) return <Skeleton className="h-9 w-14 inline-block" />;
  return <>{display}</>;
}

function ProgressRing({ value, max, color, size = 52 }: { value: number; max: number; color: string; size?: number }) {
  const strokeW = 4;
  const radius = (size - strokeW * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeW} stroke="currentColor" className="text-border" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" strokeWidth={strokeW} stroke={color}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
        strokeLinecap="round"
      />
    </svg>
  );
}

function getActionStyle(action: string) {
  if (action.includes('created'))
    return { pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400', dot: 'bg-emerald-500' };
  if (action.includes('completed') || action.includes('done'))
    return { pill: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400', dot: 'bg-violet-500' };
  if (action.includes('commented'))
    return { pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400', dot: 'bg-amber-500' };
  if (action.includes('updated'))
    return { pill: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400', dot: 'bg-sky-500' };
  return { pill: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const openCreateTask = useUIStore((s) => s.openCreateTask);
  const navigate = useNavigate();

  if (!isAdmin) return <Navigate to="/app/my-tasks" replace />;

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
      const { data } = await api.get<{ data: ActivityLog[] }>('/activity/feed?limit=15');
      return data.data;
    },
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const total = (stats?.totalTasks ?? 0) + (stats?.tasksCompletedThisWeek ?? 0);
  const completionPct = total > 0 ? Math.round(((stats?.tasksCompletedThisWeek ?? 0) / total) * 100) : 0;

  const pieData = [
    { name: 'Open', value: stats?.totalTasks ?? 0, color: '#6b5efa' },
    { name: 'Done', value: stats?.tasksCompletedThisWeek ?? 0, color: '#10b981' },
    { name: 'Overdue', value: stats?.overdueTaskCount ?? 0, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const statCards = [
    {
      label: 'Open Tasks',
      value: stats?.totalTasks ?? 0,
      icon: CheckSquare,
      iconGradient: 'from-violet-500 to-brand-600',
      cardGradient: 'from-violet-50/80 to-brand-50/80 dark:from-violet-950/20 dark:to-brand-950/20',
      border: 'border-violet-200/70 dark:border-violet-800/30',
      ringColor: '#6b5efa',
      ringMax: Math.max(stats?.totalTasks ?? 0, 10),
      sub: 'tasks in progress',
    },
    {
      label: 'Done This Week',
      value: stats?.tasksCompletedThisWeek ?? 0,
      icon: TrendingUp,
      iconGradient: 'from-emerald-500 to-teal-500',
      cardGradient: 'from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20',
      border: 'border-emerald-200/70 dark:border-emerald-800/30',
      ringColor: '#10b981',
      ringMax: Math.max(stats?.tasksCreatedThisWeek ?? 1, 1),
      sub: `${completionPct}% completion rate`,
    },
    {
      label: 'Overdue',
      value: stats?.overdueTaskCount ?? 0,
      icon: AlertTriangle,
      iconGradient: 'from-red-500 to-orange-500',
      cardGradient: 'from-red-50/80 to-orange-50/80 dark:from-red-950/20 dark:to-orange-950/20',
      border: 'border-red-200/70 dark:border-red-800/30',
      ringColor: '#ef4444',
      ringMax: Math.max(stats?.totalTasks ?? 1, 1),
      sub: (stats?.overdueTaskCount ?? 0) > 0 ? 'needs attention' : 'all on track ✓',
    },
    {
      label: 'Active Projects',
      value: stats?.activeProjects ?? 0,
      icon: FolderKanban,
      iconGradient: 'from-sky-500 to-blue-600',
      cardGradient: 'from-sky-50/80 to-blue-50/80 dark:from-sky-950/20 dark:to-blue-950/20',
      border: 'border-sky-200/70 dark:border-sky-800/30',
      ringColor: '#0ea5e9',
      ringMax: Math.max(stats?.activeProjects ?? 0, 5),
      sub: `${stats?.upcomingDeadlines ?? 0} due this week`,
    },
  ];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto p-6 space-y-5">

        {/* ── Hero Banner ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg, #5340e8 0%, #6b5efa 40%, #7c3aed 70%, #9333ea 100%)' }}
        >
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/8 blur-2xl" />
          <div className="pointer-events-none absolute top-6 right-40 h-20 w-20 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute bottom-4 right-12 h-10 w-10 rounded-full bg-white/15" />

          {/* Dot grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-white/60" />
                <span className="text-white/60 text-sm font-medium">{today}</span>
              </div>
              <h1 className="text-3xl font-display font-bold tracking-tight mb-1">
                {greeting}, {user?.name.split(' ')[0]} 👋
              </h1>
              <p className="text-white/70 text-sm max-w-md">
                {(stats?.totalTasks ?? 0) > 0
                  ? `You have ${stats?.totalTasks} open tasks${(stats?.overdueTaskCount ?? 0) > 0 ? ` · ${stats?.overdueTaskCount} need urgent attention` : ' · everything looks great'}.`
                  : statsLoading ? 'Loading your workspace...' : 'Your workspace is all caught up — great work!'}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => openCreateTask()}
                className="flex items-center gap-2 bg-white text-brand-700 hover:bg-white/90 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                New Task
              </button>
              <button
                onClick={() => navigate('/app/projects')}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 backdrop-blur-sm"
              >
                <FolderKanban className="h-4 w-4" />
                Projects
              </button>
              <button
                onClick={() => navigate('/app/analytics')}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 backdrop-blur-sm"
              >
                <Star className="h-4 w-4" />
                Analytics
              </button>
            </div>
          </div>

          {/* Mini stats strip */}
          <div className="relative z-10 mt-5 flex gap-3 flex-wrap">
            {[
              { label: 'Due This Week', value: stats?.upcomingDeadlines ?? 0, icon: Calendar },
              { label: 'Created This Week', value: stats?.tasksCreatedThisWeek ?? 0, icon: Activity },
              { label: 'Team Members', value: stats?.teamMembers ?? 0, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3.5 py-2 border border-white/15">
                <Icon className="h-3.5 w-3.5 text-white/60" />
                <span className="text-white/70 text-xs">{label}</span>
                <span className="text-white font-bold text-sm">{statsLoading ? '—' : value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Stat Cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.35 }}
              className={cn(
                'relative overflow-hidden rounded-xl border p-4 bg-gradient-to-br cursor-default',
                'transition-all duration-200 hover:shadow-lg hover:-translate-y-1',
                card.cardGradient,
                card.border,
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-medium text-muted-foreground leading-tight">{card.label}</span>
                <div className={cn('rounded-xl p-2 bg-gradient-to-br shadow-sm', card.iconGradient)}>
                  <card.icon className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-display font-black tracking-tight leading-none">
                    <AnimatedNumber value={card.value} loading={statsLoading} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">{card.sub}</p>
                </div>
                <ProgressRing value={card.value} max={card.ringMax} color={card.ringColor} size={52} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Content Grid ───────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.38, duration: 0.35 }}
            className="lg:col-span-2 rounded-xl border bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-muted/20">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <div className="h-5 w-5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                  <Clock className="h-3 w-3 text-white" />
                </div>
                Recent Activity
              </h2>
              <button
                onClick={() => navigate('/app/inbox')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors group"
              >
                View all
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="p-4">
              {activityLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-1">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2.5 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity && activity.length > 0 ? (
                <div>
                  {activity.map((log, idx) => {
                    const style = getActionStyle(log.action);
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + idx * 0.025 }}
                        className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0 -mx-4 px-4 hover:bg-muted/30 transition-colors rounded-none"
                      >
                        <div className="relative flex-shrink-0 mt-0.5">
                          <UserAvatar name={log.user.name} src={log.user.avatarUrl} size="sm" />
                          <div className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card', style.dot)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold">{log.user.name}</span>
                            <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', style.pill)}>
                              {log.action}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeDate(log.createdAt)}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center mb-3">
                    <Activity className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No activity yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">Activity will appear here as your team creates tasks, updates projects, and more.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Column */}
          <div className="space-y-4">

            {/* Task Distribution Donut */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.42, duration: 0.35 }}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border/60 bg-muted/20">
                <div className="h-5 w-5 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <Target className="h-3 w-3 text-white" />
                </div>
                <h2 className="text-sm font-semibold">Task Distribution</h2>
              </div>

              <div className="p-4">
                {statsLoading ? (
                  <div className="flex justify-center py-6">
                    <Skeleton className="h-32 w-32 rounded-full" />
                  </div>
                ) : pieData.length > 0 ? (
                  <>
                    <div className="flex justify-center relative">
                      <ResponsiveContainer width={150} height={150}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={44}
                            outerRadius={66}
                            paddingAngle={3}
                            dataKey="value"
                            animationBegin={600}
                            animationDuration={900}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              fontSize: '12px',
                              borderRadius: '10px',
                              border: 'none',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                              padding: '8px 12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black">{completionPct}%</span>
                        <span className="text-[10px] text-muted-foreground font-medium">complete</span>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2.5 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-muted-foreground flex-1">{d.name}</span>
                          <span className="font-bold">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Target className="h-8 w-8 text-muted-foreground/25 mb-2" />
                    <p className="text-xs text-muted-foreground">No tasks yet</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Team Overview */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.52, duration: 0.35 }}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
                    <Users className="h-3 w-3 text-white" />
                  </div>
                  <h2 className="text-sm font-semibold">Team Overview</h2>
                </div>
                <button
                  onClick={() => navigate('/app/team')}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-4">
                {statsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {[
                      { label: 'Total Members', value: stats?.teamMembers ?? 0, max: 20, fromColor: '#0ea5e9', toColor: '#2563eb', icon: Users },
                      { label: 'Due This Week', value: stats?.upcomingDeadlines ?? 0, max: 10, fromColor: '#f59e0b', toColor: '#f97316', icon: Calendar },
                      { label: 'Created This Week', value: stats?.tasksCreatedThisWeek ?? 0, max: 20, fromColor: '#6b5efa', toColor: '#7c3aed', icon: Zap },
                    ].map(({ label, value, max, fromColor, toColor, icon: Icon }) => (
                      <div key={label} className="rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{label}</span>
                          </div>
                          <span className="text-sm font-bold">{value}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(to right, ${fromColor}, ${toColor})` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%` }}
                            transition={{ duration: 0.9, delay: 0.65, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.62, duration: 0.35 }}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border/60 bg-muted/20">
                <div className="h-5 w-5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <Zap className="h-3 w-3 text-white" />
                </div>
                <h2 className="text-sm font-semibold">Quick Actions</h2>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { label: 'Create New Task', icon: CheckSquare, gradient: 'from-violet-500 to-brand-600', action: () => openCreateTask() },
                  { label: 'View Projects', icon: FolderKanban, gradient: 'from-sky-500 to-blue-600', action: () => navigate('/app/projects') },
                  { label: 'Team Members', icon: Users, gradient: 'from-emerald-500 to-teal-500', action: () => navigate('/app/org-members') },
                  { label: 'Analytics', icon: Star, gradient: 'from-amber-500 to-orange-500', action: () => navigate('/app/analytics') },
                ].map(({ label, icon: Icon, gradient, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-muted/60 transition-all duration-150 group text-left"
                  >
                    <div className={cn('rounded-lg p-1.5 bg-gradient-to-br shadow-sm group-hover:shadow transition-shadow flex-shrink-0', gradient)}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-medium text-[13px] flex-1">{label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150" />
                  </button>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Grid3X3, List, Search, FolderKanban, MoreHorizontal,
  Settings, Trash2, AlertTriangle, CheckCircle2, Clock, Users,
  Sparkles, TrendingUp, Zap, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { projectsService } from '@/services/projects.service';
import { useUIStore } from '@/stores/uiStore';
import { QUERY_KEYS } from '@/lib/constants';
import { SkeletonCard } from '@/components/shared/Skeleton';
import type { Project } from '@flowboard/shared';
import { cn, formatDate } from '@/lib/utils';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; gradient: string; pill: string; dot: string }> = {
  PLANNING:  { label: 'Planning',  gradient: 'from-sky-500 to-blue-600',      pill: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',          dot: 'bg-sky-500' },
  ACTIVE:    { label: 'Active',    gradient: 'from-emerald-500 to-teal-600',   pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', dot: 'bg-emerald-500' },
  ON_HOLD:   { label: 'On Hold',   gradient: 'from-amber-400 to-orange-500',   pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',   dot: 'bg-amber-500' },
  COMPLETED: { label: 'Completed', gradient: 'from-brand-500 to-violet-600',   pill: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',   dot: 'bg-brand-500' },
  ARCHIVED:  { label: 'Archived',  gradient: 'from-slate-400 to-slate-600',    pill: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400',     dot: 'bg-slate-400' },
};

const STATUS_TABS = ['ALL', 'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] as const;

// ── SVG Progress Ring ─────────────────────────────────────────────────────────
function ProgressRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const strokeW = 5;
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct / 100, 1));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeW} stroke="currentColor" className="text-border" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" strokeWidth={strokeW}
        stroke={color}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ project, onConfirm, onCancel, isPending }: {
  project: Project; onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200/60 dark:border-red-800/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="font-bold">Delete project?</p>
            <p className="text-xs text-muted-foreground mt-0.5">This cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          All tasks, comments, and data inside{' '}
          <span className="font-semibold text-foreground">"{project.name}"</span>{' '}
          will be permanently deleted.
        </p>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onCancel} disabled={isPending} className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending} className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Project Card (grid) ───────────────────────────────────────────────────────
function ProjectCard({ project, onDelete }: { project: Project; onDelete: (p: Project) => void }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const statusCfg = STATUS_CFG[project.status] ?? STATUS_CFG.PLANNING;
  const completionPct = project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;

  // Pick a ring color based on completion
  const ringColor = completionPct >= 80 ? '#10b981' : completionPct >= 50 ? '#f59e0b' : '#6b5efa';

  // Generate a soft bg from the project color
  const accentStyle = {
    '--project-color': project.color || '#6b5efa',
  } as React.CSSProperties;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      style={accentStyle}
      className="relative rounded-2xl border border-border/60 bg-card overflow-hidden cursor-pointer group shadow-sm hover:shadow-xl transition-shadow duration-300"
      onClick={() => navigate(`/app/projects/${project.id}`)}
    >
      {/* Gradient top accent */}
      <div className={cn('h-1.5 w-full bg-gradient-to-r', statusCfg.gradient)} />

      {/* Colored glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ boxShadow: `0 0 40px -10px ${project.color || '#6b5efa'}40` }}
      />

      {/* ⋯ menu */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
        className={cn(
          'absolute top-4 right-3 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all z-10',
          menuOpen ? 'opacity-100 bg-muted' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-11 right-3 z-20 bg-popover border border-border rounded-xl shadow-xl py-1.5 w-44 text-sm"
          >
            <button
              onClick={() => { setMenuOpen(false); navigate(`/app/projects/${project.id}/settings`); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-muted transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Settings
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={() => { setMenuOpen(false); onDelete(project); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-5">
        {/* Header: icon + name + status */}
        <div className="flex items-start gap-3 mb-4 pr-6">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
            style={{ backgroundColor: `${project.color || '#6b5efa'}18`, border: `1.5px solid ${project.color || '#6b5efa'}30` }}
          >
            {project.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm leading-tight truncate">{project.name}</h3>
            {project.dueDate && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due {formatDate(project.dueDate)}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
        )}

        {/* Progress ring + stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <ProgressRing pct={completionPct} color={ringColor} size={56} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-black leading-none">{completionPct}%</span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tasks done</span>
              <span className="font-bold">{project.completedTaskCount}/{project.taskCount}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: ringColor }}
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> {project.memberCount} member{project.memberCount !== 1 ? 's' : ''}
              </span>
              <span className={cn('font-semibold text-[11px] px-2 py-0.5 rounded-full', statusCfg.pill)}>
                {statusCfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* Health */}
        <div className="pt-3 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={cn('h-2 w-2 rounded-full', statusCfg.dot)} />
            <span className="text-xs text-muted-foreground">Health</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', project.healthScore >= 80 ? 'bg-emerald-500' : project.healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                style={{ width: `${project.healthScore}%` }}
              />
            </div>
            <span className="text-xs font-bold">{project.healthScore}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Project List Row ──────────────────────────────────────────────────────────
function ProjectRow({ project, index }: { project: Project; onDelete?: (p: Project) => void; index: number }) {
  const navigate = useNavigate();
  const statusCfg = STATUS_CFG[project.status] ?? STATUS_CFG.PLANNING;
  const completionPct = project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => navigate(`/app/projects/${project.id}`)}
      className="flex items-center gap-4 px-4 py-3.5 border-b border-border/50 last:border-0 hover:bg-muted/40 cursor-pointer transition-colors group rounded-xl"
    >
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: `${project.color || '#6b5efa'}18` }}
      >
        {project.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{project.name}</p>
        {project.description && <p className="text-xs text-muted-foreground truncate">{project.description}</p>}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', statusCfg.pill)}>
          {statusCfg.label}
        </span>
        <div className="flex items-center gap-2 w-28">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', completionPct >= 80 ? 'bg-emerald-500' : completionPct >= 50 ? 'bg-amber-500' : 'bg-brand-500')}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-xs font-bold w-8 text-right">{completionPct}%</span>
        </div>
        <span className="text-xs text-muted-foreground w-12 text-right">{project.taskCount} tasks</span>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/app/projects/${project.id}/settings`); }}
          className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-all"
        >
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Create Card ───────────────────────────────────────────────────────────────
function CreateCard({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      disabled={loading}
      className="relative rounded-2xl border-2 border-dashed border-border/60 hover:border-brand-400/60 bg-card hover:bg-brand-50/30 dark:hover:bg-brand-950/10 p-5 cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center gap-3 min-h-[180px]"
    >
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:shadow-brand-500/30 transition-shadow">
        <Plus className="h-6 w-6 text-white" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold">New Project</p>
        <p className="text-xs text-muted-foreground mt-0.5">Start organizing your work</p>
      </div>
      <ArrowRight className="h-4 w-4 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<typeof STATUS_TABS[number]>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.projects.list(workspaceId ?? undefined), search],
    queryFn: () => projectsService.list(workspaceId ?? '', { search: search || undefined }),
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      projectsService.create({ name: 'New Project', workspaceId: workspaceId!, color: '#6b5efa', icon: '📋' }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.list(workspaceId ?? undefined) });
      navigate(`/app/projects/${project.id}/settings`);
      toast.success('Project created');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to create project';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.list(workspaceId ?? undefined) });
      toast.success('Project deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete project'),
  });

  const allProjects = data?.data ?? [];
  const projects = allProjects.filter((p) => {
    if (statusTab !== 'ALL' && p.status !== statusTab) return false;
    return true;
  });

  const completedTasks = allProjects.reduce((s, p) => s + p.completedTaskCount, 0);
  const activeCount = allProjects.filter((p) => p.status === 'ACTIVE').length;
  const overallHealth = allProjects.length > 0 ? Math.round(allProjects.reduce((s, p) => s + p.healthScore, 0) / allProjects.length) : 0;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto">

        {/* ── Hero ───────────────────────────────── */}
        <div
          className="relative overflow-hidden p-6 text-white"
          style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 40%, #6b5efa 100%)' }}
        >
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-40 h-32 w-32 rounded-full bg-white/8 blur-2xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
          />

          <div className="relative z-10 flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-white/60" />
                <span className="text-white/60 text-sm font-medium">Workspace</span>
              </div>
              <h1 className="text-3xl font-display font-bold tracking-tight">Projects</h1>
              <p className="text-white/70 text-sm mt-1">
                {allProjects.length} project{allProjects.length !== 1 ? 's' : ''} · {activeCount} active
              </p>
            </div>
            <button
              onClick={() => { if (!workspaceId) { toast.error('Workspace loading…'); return; } createMutation.mutate(); }}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 bg-white text-teal-700 hover:bg-white/90 rounded-xl px-4 py-2.5 text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>

          {/* Stat strip */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Projects', value: allProjects.length, icon: FolderKanban, color: 'from-white/20 to-white/10' },
              { label: 'Active Projects', value: activeCount, icon: Zap, color: 'from-emerald-400/30 to-teal-600/20' },
              { label: 'Tasks Completed', value: completedTasks, icon: CheckCircle2, color: 'from-violet-400/30 to-brand-600/20' },
              { label: 'Avg Health', value: `${overallHealth}%`, icon: TrendingUp, color: 'from-sky-400/30 to-blue-600/20', isStr: true },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={cn('rounded-xl p-3 bg-gradient-to-br border border-white/15 backdrop-blur-sm', color)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/70 text-xs font-medium">{label}</span>
                  <Icon className="h-3.5 w-3.5 text-white/60" />
                </div>
                <div className="text-2xl font-black text-white">
                  {isLoading ? '—' : value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Controls ───────────────────────────── */}
        <div className="px-6 py-4 border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects…"
                className="w-full pl-9 pr-3 h-9 text-sm rounded-xl border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Status tabs */}
            <div className="flex gap-1 flex-wrap">
              {STATUS_TABS.map((tab) => {
                const cfg = tab === 'ALL' ? null : STATUS_CFG[tab];
                const count = tab === 'ALL' ? allProjects.length : allProjects.filter((p) => p.status === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setStatusTab(tab)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
                      statusTab === tab
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-background text-muted-foreground border-border/60 hover:bg-muted',
                    )}
                  >
                    {cfg && <div className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />}
                    {tab === 'ALL' ? 'All' : cfg?.label}
                    <span className={cn('text-[10px] font-bold', statusTab === tab ? 'text-white/80' : 'text-muted-foreground/60')}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View toggle */}
            <div className="flex rounded-xl border border-border/60 bg-muted/40 p-0.5 gap-0.5 ml-auto">
              {(['grid', 'list'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'rounded-lg p-1.5 transition-all',
                    view === v ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {v === 'grid' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Project Grid / List ─────────────────── */}
        <div className="p-6">
          <ErrorBoundary>
            {isLoading ? (
              <div className={cn(
                view === 'grid' ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2',
              )}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : projects.length === 0 && allProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-teal-50 to-brand-50 dark:from-teal-950/30 dark:to-brand-950/30 border border-teal-200/60 dark:border-teal-800/40 flex items-center justify-center mb-5">
                  <FolderKanban className="h-9 w-9 text-teal-500" />
                </div>
                <h2 className="text-xl font-bold">No projects yet</h2>
                <p className="text-sm text-muted-foreground mt-2 mb-6 max-w-xs">
                  Create your first project and start organizing your team's work.
                </p>
                <button
                  onClick={() => createMutation.mutate()}
                  className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />
                  Create Project
                </button>
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} onDelete={setDeleteTarget} />
                ))}
                <CreateCard onClick={() => createMutation.mutate()} loading={createMutation.isPending} />
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                {projects.map((project, i) => (
                  <ProjectRow key={project.id} project={project} onDelete={setDeleteTarget} index={i} />
                ))}
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            project={deleteTarget}
            isPending={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

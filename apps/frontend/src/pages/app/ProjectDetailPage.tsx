import { useParams, useNavigate, NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  List,
  Table2,
  CalendarDays,
  GitFork,
  BarChart3,
  MessageSquare,
  Settings,
  Star,
  Share2,
  ArrowLeft,
} from 'lucide-react';
import { projectsService } from '@/services/projects.service';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/shared/Skeleton';
import { UserAvatar } from '@/components/ui/avatar';
import type { Project, ProjectMember } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PLANNING: { label: 'Planning', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
  ON_HOLD: { label: 'On Hold', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  COMPLETED: { label: 'Completed', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
};

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-green-500' :
    score >= 50 ? 'bg-amber-500' :
    score >= 25 ? 'bg-orange-500' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{score}%</span>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: QUERY_KEYS.projects.detail(id!),
    queryFn: () => projectsService.get(id!),
    enabled: !!id,
  });

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: QUERY_KEYS.projects.members(id!),
    queryFn: () => projectsService.getMembers(id!),
    enabled: !!id,
  });

  const views = [
    { label: 'Board',     icon: LayoutGrid,    path: 'board' },
    { label: 'List',      icon: List,          path: 'list' },
    { label: 'Table',     icon: Table2,        path: 'table' },
    { label: 'Calendar',  icon: CalendarDays,  path: 'calendar' },
    { label: 'Timeline',  icon: GitFork,       path: 'timeline' },
    { label: 'Analytics', icon: BarChart3,     path: 'analytics' },
    { label: 'Updates',   icon: MessageSquare, path: 'updates' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b space-y-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-64 w-full mx-6 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Project not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/app/projects')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to projects
          </Button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.PLANNING;

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="px-6 py-4 border-b space-y-3 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/app/projects')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: `${project.color ?? '#6b5efa'}20` }}
            >
              {project.icon ?? '📋'}
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg leading-tight truncate">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground truncate">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusCfg.color)}>
              {statusCfg.label}
            </span>
            <HealthBar score={project.healthScore ?? 0} />

            <div className="flex -space-x-1.5">
              {(members as ProjectMember[]).slice(0, 4).map((m) => (
                <UserAvatar
                  key={(m as ProjectMember & { user?: { id: string } }).user?.id ?? m.userId}
                  name={(m as ProjectMember & { user?: { name: string } }).user?.name ?? '?'}
                  src={(m as ProjectMember & { user?: { avatarUrl?: string | null } }).user?.avatarUrl}
                  size="sm"
                  className="ring-2 ring-card"
                />
              ))}
              {members.length > 4 && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-card">
                  +{members.length - 4}
                </div>
              )}
            </div>

            <Button variant="ghost" size="icon-sm">
              <Star className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/app/projects/${id}/settings`)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* View tabs */}
        <div className="flex items-center gap-0.5">
          {views.map(({ label, icon: Icon, path }) => (
            <NavLink
              key={path}
              to={`/app/projects/${id}/${path}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Content outlet */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

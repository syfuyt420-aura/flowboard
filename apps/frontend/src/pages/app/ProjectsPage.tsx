import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Grid3X3, List, Search, FolderKanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { projectsService } from '@/services/projects.service';
import { useUIStore } from '@/stores/uiStore';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/shared/Skeleton';
import type { Project } from '@flowboard/shared';
import { cn, formatDate } from '@/lib/utils';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

const STATUS_COLOR: Record<Project['status'], string> = {
  PLANNING: 'info',
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'brand',
  ARCHIVED: 'secondary',
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="rounded-xl border bg-card p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/app/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{project.icon}</span>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{project.name}</h3>
            {project.dueDate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Due {formatDate(project.dueDate)}
              </p>
            )}
          </div>
        </div>
        <Badge variant={STATUS_COLOR[project.status] as Parameters<typeof Badge>[0]['variant']}>
          {project.status.replace('_', ' ')}
        </Badge>
      </div>

      {project.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Health</span>
          <span className="font-medium">{project.healthScore}%</span>
        </div>
        <HealthBar score={project.healthScore} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{project.taskCount} tasks</span>
        <span>{project.memberCount} members</span>
      </div>
    </motion.div>
  );
}

export default function ProjectsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.projects.list(workspaceId ?? undefined), search],
    queryFn: () =>
      projectsService.list(workspaceId ?? '', { search: search || undefined }),
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      projectsService.create({
        name: 'New Project',
        workspaceId: workspaceId!,
        color: '#6b5efa',
        icon: '📋',
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.list(workspaceId ?? undefined) });
      navigate(`/app/projects/${project.id}/settings`);
      toast.success('Project created');
    },
    onError: () => toast.error('Failed to create project'),
  });

  const projects = data?.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <Button
          variant="brand"
          onClick={() => createMutation.mutate()}
          loading={createMutation.isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex rounded-xl border bg-muted/50 p-0.5">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                view === v ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {v === 'grid' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      <ErrorBoundary>
        {isLoading ? (
          <div className={view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-2xl bg-muted p-6 mb-4">
              <FolderKanban className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No projects yet</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create your first project to start organizing work.
            </p>
            <Button variant="brand" onClick={() => createMutation.mutate()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        ) : (
          <div
            className={
              view === 'grid'
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-2'
            }
          >
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}

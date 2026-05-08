import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Grid3X3, List, Search, FolderKanban, MoreHorizontal, Settings, Trash2, AlertTriangle } from 'lucide-react';
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

/* ── Delete confirm modal ── */
function DeleteConfirmModal({
  project,
  onConfirm,
  onCancel,
  isPending,
}: {
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-lg border border-border shadow-lg w-full max-w-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-sm">Delete project?</p>
            <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          All tasks, comments, and data inside{' '}
          <span className="font-semibold text-foreground">"{project.name}"</span>{' '}
          will be permanently deleted.
        </p>

        <div className="flex items-center gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Deleting…' : 'Delete project'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Project card ── */
function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: (p: Project) => void;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      layout
      whileHover={{ y: -1 }}
      transition={{ duration: 0.12 }}
      className="relative rounded-lg border bg-card p-4 cursor-pointer hover:shadow-sm transition-shadow group"
      onClick={() => navigate(`/app/projects/${project.id}`)}
    >
      {/* ⋯ menu button */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
        className={cn(
          'absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
          menuOpen ? 'opacity-100 bg-accent' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.1 }}
            className="absolute top-10 right-3 z-20 bg-popover border border-border rounded-lg shadow-md py-1 w-44 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setMenuOpen(false); navigate(`/app/projects/${project.id}/settings`); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-accent transition-colors text-foreground"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Settings
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={() => { setMenuOpen(false); onDelete(project); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-destructive/10 transition-colors text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete project
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between gap-2 mb-3 pr-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">{project.icon}</span>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{project.name}</h3>
            {project.dueDate && (
              <p className="text-xs text-muted-foreground mt-0.5">Due {formatDate(project.dueDate)}</p>
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

/* ── Main page ── */
export default function ProjectsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
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

  const projects = data?.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <Button
          variant="brand"
          onClick={() => {
            if (!workspaceId) { toast.error('Workspace loading…'); return; }
            createMutation.mutate();
          }}
          disabled={createMutation.isPending}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex rounded border bg-muted/40 p-0.5 gap-0.5">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('rounded p-1.5 transition-colors', view === v ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
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
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first project to start organizing work.</p>
            <Button variant="brand" onClick={() => createMutation.mutate()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2'}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </ErrorBoundary>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
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

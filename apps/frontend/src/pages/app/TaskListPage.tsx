import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Plus,
  Circle,
  CheckCircle2,
  Clock,
  Flag,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import { tasksService } from '@/services/tasks.service';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/avatar';
import type { Task } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const STATUS_ICONS: Record<string, React.ElementType> = {
  BACKLOG: Circle,
  TODO: Circle,
  IN_PROGRESS: Clock,
  IN_REVIEW: Clock,
  DONE: CheckCircle2,
  CANCELLED: CheckCircle2,
};

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'text-slate-400',
  TODO: 'text-blue-500',
  IN_PROGRESS: 'text-amber-500',
  IN_REVIEW: 'text-purple-500',
  DONE: 'text-green-500',
  CANCELLED: 'text-slate-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'text-red-600',
  P1: 'text-orange-500',
  P2: 'text-yellow-500',
  P3: 'text-slate-400',
};

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
};

type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt';
type SortDir = 'asc' | 'desc';

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}

export default function TaskListPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.tasks.list(projectId), search, statusFilter],
    queryFn: () => tasksService.list({ projectId, search, status: statusFilter || undefined, limit: 100 }),
    select: (d) => d.data,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksService.update(id, { status: status as Task['status'] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list(projectId) });
    },
    onError: () => toast.error('Failed to update task'),
  });

  const sorted = [...(data ?? [])].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
    else if (sortField === 'priority') cmp = a.priority.localeCompare(b.priority);
    else if (sortField === 'dueDate') {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      cmp = da - db;
    } else {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const STATUS_OPTIONS = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            <button
              onClick={() => setStatusFilter('')}
              className={cn(
                'text-xs px-2 py-1 rounded-lg transition-colors',
                !statusFilter ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              All
            </button>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
                className={cn(
                  'text-xs px-2 py-1 rounded-lg transition-colors capitalize',
                  statusFilter === s
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {s.toLowerCase().replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <Button variant="brand" size="sm" className="flex-shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Add task
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b z-10">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8" />
              <th
                className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort('title')}
              >
                <span className="flex items-center gap-1">
                  Title <SortIcon field="title" current={sortField} dir={sortDir} />
                </span>
              </th>
              <th
                className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground w-32"
                onClick={() => handleSort('status')}
              >
                <span className="flex items-center gap-1">
                  Status <SortIcon field="status" current={sortField} dir={sortDir} />
                </span>
              </th>
              <th
                className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground w-28"
                onClick={() => handleSort('priority')}
              >
                <span className="flex items-center gap-1">
                  Priority <SortIcon field="priority" current={sortField} dir={sortDir} />
                </span>
              </th>
              <th
                className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground w-32"
                onClick={() => handleSort('dueDate')}
              >
                <span className="flex items-center gap-1">
                  Due date <SortIcon field="dueDate" current={sortField} dir={sortDir} />
                </span>
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">
                Assignees
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" style={{ width: j === 1 ? '80%' : '60%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Circle className="h-8 w-8 opacity-30" />
                    <p>No tasks found</p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((task, i) => {
                const StatusIcon = STATUS_ICONS[task.status] ?? Circle;
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
                return (
                  <motion.tr
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b hover:bg-accent/30 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/app/tasks/${task.id}`)}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = task.status === 'DONE' ? 'TODO' : 'DONE';
                          updateMutation.mutate({ id: task.id, status: next });
                        }}
                        className={cn('transition-colors', STATUS_COLORS[task.status])}
                      >
                        <StatusIcon className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('font-medium', task.status === 'DONE' && 'line-through text-muted-foreground')}>
                        {task.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium capitalize', STATUS_COLORS[task.status])}>
                        {task.status.toLowerCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1 text-xs font-medium', PRIORITY_COLORS[task.priority])}>
                        <Flag className="h-3 w-3" />
                        {PRIORITY_LABELS[task.priority] ?? task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.dueDate ? (
                        <span className={cn('text-xs', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                          {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {task.assignees && task.assignees.length > 0 ? (
                        <div className="flex -space-x-1">
                          {(task.assignees as Array<{ userId: string; user: { name: string; avatarUrl?: string | null } }>)
                            .slice(0, 3)
                            .map((a) => (
                              <UserAvatar
                                key={a.userId}
                                name={a.user.name}
                                src={a.user.avatarUrl}
                                size="xs"
                                className="ring-2 ring-card"
                              />
                            ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {sorted.length > 0 && (
        <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>{sorted.length} task{sorted.length !== 1 ? 's' : ''}</span>
          <span>
            {sorted.filter((t) => t.status === 'DONE').length} done ·{' '}
            {sorted.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length} overdue
          </span>
        </div>
      )}
    </div>
  );
}

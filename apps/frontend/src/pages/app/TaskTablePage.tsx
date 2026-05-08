import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Search, Circle, CheckCircle2, Clock, Flag } from 'lucide-react';
import { tasksService } from '@/services/tasks.service';
import { projectsService } from '@/services/projects.service';
import { QUERY_KEYS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/avatar';
import type { Task } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: Task['status'][] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];
const PRIORITY_OPTIONS: Task['priority'][] = ['P0', 'P1', 'P2', 'P3'];

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'text-slate-400',
  TODO: 'text-blue-500',
  IN_PROGRESS: 'text-amber-500',
  IN_REVIEW: 'text-purple-500',
  DONE: 'text-green-500',
  CANCELLED: 'text-slate-400',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  BACKLOG: Circle,
  TODO: Circle,
  IN_PROGRESS: Clock,
  IN_REVIEW: Clock,
  DONE: CheckCircle2,
  CANCELLED: CheckCircle2,
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

function StatusDropdown({
  value,
  onChange,
  onClose,
}: {
  value: Task['status'];
  onChange: (v: Task['status']) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 bg-popover border rounded-lg shadow-lg py-1 min-w-[140px]"
      onClick={(e) => e.stopPropagation()}
    >
      {STATUS_OPTIONS.map((s) => {
        const Icon = STATUS_ICONS[s] ?? Circle;
        return (
          <button
            key={s}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors',
              value === s && 'bg-accent'
            )}
            onClick={() => { onChange(s); onClose(); }}
          >
            <Icon className={cn('h-3.5 w-3.5', STATUS_COLORS[s])} />
            <span className="capitalize">{s.toLowerCase().replace(/_/g, ' ')}</span>
          </button>
        );
      })}
    </div>
  );
}

function PriorityDropdown({
  value,
  onChange,
  onClose,
}: {
  value: Task['priority'];
  onChange: (v: Task['priority']) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 bg-popover border rounded-lg shadow-lg py-1 min-w-[120px]"
      onClick={(e) => e.stopPropagation()}
    >
      {PRIORITY_OPTIONS.map((p) => (
        <button
          key={p}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors',
            value === p && 'bg-accent'
          )}
          onClick={() => { onChange(p); onClose(); }}
        >
          <Flag className={cn('h-3 w-3', PRIORITY_COLORS[p])} />
          <span className={PRIORITY_COLORS[p]}>{PRIORITY_LABELS[p] ?? p}</span>
        </button>
      ))}
    </div>
  );
}

interface EditableTitleProps {
  task: Task;
  onSave: (title: string) => void;
}

function EditableTitle({ task, onSave }: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    if (value.trim() && value.trim() !== task.title) {
      onSave(value.trim());
    } else {
      setValue(task.title);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setValue(task.title); setEditing(false); }
        }}
        className="w-full bg-background border border-brand-400 rounded px-2 py-0.5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-500"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={cn(
        'font-medium cursor-text select-none',
        task.status === 'DONE' && 'line-through text-muted-foreground'
      )}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Double-click to edit"
    >
      {task.title}
    </span>
  );
}

interface StatusCellProps {
  task: Task;
  onUpdate: (status: Task['status']) => void;
}

function StatusCell({ task, onUpdate }: StatusCellProps) {
  const [open, setOpen] = useState(false);
  const Icon = STATUS_ICONS[task.status] ?? Circle;
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium capitalize rounded px-1.5 py-0.5 hover:bg-accent transition-colors',
          STATUS_COLORS[task.status]
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon className="h-3.5 w-3.5" />
        {task.status.toLowerCase().replace(/_/g, ' ')}
      </button>
      {open && (
        <StatusDropdown
          value={task.status}
          onChange={(v) => { onUpdate(v); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

interface PriorityCellProps {
  task: Task;
  onUpdate: (priority: Task['priority']) => void;
}

function PriorityCell({ task, onUpdate }: PriorityCellProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium rounded px-1.5 py-0.5 hover:bg-accent transition-colors',
          PRIORITY_COLORS[task.priority]
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <Flag className="h-3 w-3" />
        {PRIORITY_LABELS[task.priority] ?? task.priority}
      </button>
      {open && (
        <PriorityDropdown
          value={task.priority}
          onChange={(v) => { onUpdate(v); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export default function TaskTablePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.tasks.list(projectId), search],
    queryFn: () => tasksService.list({ projectId, limit: 200, search: search || undefined }),
    enabled: !!projectId,
    select: (d) => d.data,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: project } = useQuery({
    queryKey: QUERY_KEYS.projects.detail(projectId!),
    queryFn: () => projectsService.get(projectId!),
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Task, 'title' | 'status' | 'priority'>> }) =>
      tasksService.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list(projectId) }),
    onError: () => toast.error('Failed to update task'),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      tasksService.create({ title, projectId: projectId!, status: 'TODO', priority: 'P2', assigneeIds: [], labelIds: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list(projectId) });
      setNewTaskTitle('');
      toast.success('Task created');
    },
    onError: () => toast.error('Failed to create task'),
  });

  const tasks = data ?? [];

  const filtered = search
    ? tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h2 className="font-display font-bold text-lg flex-shrink-0">{project?.name ?? 'Tasks'}</h2>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {filtered.length} task{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b z-10">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-10 text-xs">#</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Title</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-36 text-xs">Status</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-28 text-xs">Priority</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-28 text-xs">Assignees</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-28 text-xs">Due Date</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-28 text-xs">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className={cn('border-b', i % 2 === 0 ? 'bg-background' : 'bg-muted/30')}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <div className="h-3.5 bg-muted rounded animate-pulse" style={{ width: j === 1 ? '75%' : '55%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Circle className="h-8 w-8 opacity-30" />
                    <p className="text-sm">{search ? 'No tasks match your search' : 'No tasks yet'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((task, i) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
                return (
                  <motion.tr
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    className={cn(
                      'border-b hover:bg-accent/40 cursor-pointer transition-colors group',
                      i % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                    )}
                    onClick={() => navigate(`/app/tasks/${task.id}`)}
                  >
                    <td className="px-3 py-2 text-xs text-muted-foreground/60 font-mono">{i + 1}</td>
                    <td className="px-3 py-2 max-w-xs">
                      <EditableTitle
                        task={task}
                        onSave={(title) => updateMutation.mutate({ id: task.id, patch: { title } })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <StatusCell
                        task={task}
                        onUpdate={(status) => updateMutation.mutate({ id: task.id, patch: { status } })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <PriorityCell
                        task={task}
                        onUpdate={(priority) => updateMutation.mutate({ id: task.id, patch: { priority } })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {task.assignees && task.assignees.length > 0 ? (
                        <div className="flex -space-x-1">
                          {task.assignees.slice(0, 3).map((a) => (
                            <UserAvatar
                              key={a.userId}
                              name={a.user.name}
                              src={a.user.avatarUrl}
                              size="xs"
                              className="ring-2 ring-card"
                            />
                          ))}
                          {task.assignees.length > 3 && (
                            <span className="h-5 w-5 rounded-full bg-muted ring-2 ring-card flex items-center justify-center text-[10px] text-muted-foreground">
                              +{task.assignees.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {task.dueDate ? (
                        <span className={cn('text-xs', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                          {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                    </td>
                  </motion.tr>
                );
              })
            )}

            <tr className="border-b bg-background">
              <td className="px-3 py-2 text-muted-foreground/40 text-xs">+</td>
              <td colSpan={6} className="px-3 py-2">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskTitle.trim()) {
                      createMutation.mutate(newTaskTitle.trim());
                    }
                  }}
                  placeholder="Add task… press Enter to create"
                  className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 focus:placeholder:text-muted-foreground/60"
                  disabled={createMutation.isPending}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
          <span>
            {filtered.filter((t) => t.status === 'DONE').length} done ·{' '}
            {filtered.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length} overdue
          </span>
        </div>
      )}
    </div>
  );
}

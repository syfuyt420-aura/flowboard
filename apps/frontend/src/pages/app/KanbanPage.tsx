import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus,
  Clock,
  MessageSquare,
  CheckCircle2,
  Circle,
  Timer,
  Eye,
} from 'lucide-react';
import { tasksService } from '@/services/tasks.service';
import { QUERY_KEYS, KANBAN_COLUMNS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import type { Task } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const COLUMN_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType; bg: string }
> = {
  BACKLOG: { label: 'Backlog', color: 'text-slate-500', icon: Circle, bg: 'bg-slate-100 dark:bg-slate-900' },
  TODO: { label: 'To Do', color: 'text-blue-500', icon: Circle, bg: 'bg-blue-50 dark:bg-blue-950' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-500', icon: Timer, bg: 'bg-amber-50 dark:bg-amber-950' },
  IN_REVIEW: { label: 'In Review', color: 'text-purple-500', icon: Eye, bg: 'bg-purple-50 dark:bg-purple-950' },
  DONE: { label: 'Done', color: 'text-green-500', icon: CheckCircle2, bg: 'bg-green-50 dark:bg-green-950' },
};

const PRIORITY_CONFIG: Record<string, { color: string; dot: string }> = {
  P0: { color: 'text-red-600', dot: 'bg-red-500' },
  P1: { color: 'text-orange-500', dot: 'bg-orange-500' },
  P2: { color: 'text-yellow-500', dot: 'bg-yellow-400' },
  P3: { color: 'text-slate-400', dot: 'bg-slate-400' },
};

function PriorityDot({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.P2;
  return <span className={cn('h-2 w-2 rounded-full flex-shrink-0', cfg.dot)} title={priority} />;
}

function DueDateBadge({ dueDate }: { dueDate: Date | string | null | undefined }) {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const now = new Date();
  const isOverdue = date < now;
  const isToday = date.toDateString() === now.toDateString();
  const label = isToday
    ? 'Today'
    : isOverdue
    ? date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    : date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium rounded px-1.5 py-0.5',
        isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
        isToday ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
        'bg-muted text-muted-foreground'
      )}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

interface TaskCardProps {
  task: Task;
  overlay?: boolean;
  onClick?: () => void;
}

function TaskCard({ task, overlay, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-xl border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing',
        'hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800 transition-all duration-150',
        isDragging && 'opacity-40',
        overlay && 'shadow-2xl rotate-2 cursor-grabbing ring-2 ring-brand-500'
      )}
      onClick={(e) => {
        if (!overlay) {
          e.stopPropagation();
          onClick?.();
        }
      }}
    >
      {/* Priority + title */}
      <div className="flex items-start gap-2 mb-2">
        <PriorityDot priority={task.priority} />
        <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{task.title}</p>
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {(task.labels as Array<{ id: string; name: string; color: string }>).slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${label.color}20`, color: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <DueDateBadge dueDate={task.dueDate} />

        <div className="flex items-center gap-2 ml-auto">
          {task.commentCount != null && task.commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {task.commentCount}
            </span>
          )}
          {task.subtaskCount != null && task.subtaskCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              {task.completedSubtaskCount ?? 0}/{task.subtaskCount}
            </span>
          )}
          {task.assignees && task.assignees.length > 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  status: string;
  tasks: Task[];
  onAddTask: (status: string) => void;
  onTaskClick: (taskId: string) => void;
}

function KanbanColumn({ status, tasks, onAddTask, onTaskClick }: KanbanColumnProps) {
  const cfg = COLUMN_CONFIG[status] ?? COLUMN_CONFIG.TODO;
  const Icon = cfg.icon;
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', cfg.color)} />
          <span className="font-semibold text-sm">{cfg.label}</span>
          <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onAddTask(status)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          'flex-1 rounded-2xl p-2 min-h-[200px] space-y-2 transition-colors',
          cfg.bg
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <TaskCard
                  task={task}
                  onClick={() => onTaskClick(task.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && (
          <button
            onClick={() => onAddTask(status)}
            className="w-full rounded-xl border-2 border-dashed border-current/10 py-8 text-sm text-muted-foreground/50 hover:text-muted-foreground hover:border-muted-foreground/30 transition-colors flex flex-col items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const openCreateTask = useUIStore((s) => s.openCreateTask);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.tasks.list(projectId),
    queryFn: () => tasksService.list({ projectId, limit: 200 }),
    enabled: !!projectId,
    select: (d) => d.data,
    refetchInterval: 15000,      // poll every 15s so admin sees member updates
    refetchIntervalInBackground: false,
  });

  const tasks = localTasks ?? data ?? [];

  const columnTasks = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of KANBAN_COLUMNS) map[col] = [];
    for (const task of tasks) {
      const col = task.status as string;
      if (!map[col]) map[col] = [];
      map[col].push(task);
    }
    for (const col of Object.keys(map)) {
      map[col].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    return map;
  }, [tasks]);

  const moveMutation = useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: string; position: number }) =>
      tasksService.move(id, { status: status as Task['status'], position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.list(projectId) });
      setLocalTasks(null);
    },
    onError: () => {
      toast.error('Failed to move task');
      setLocalTasks(null);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function findTaskColumn(taskId: string): string | null {
    for (const [col, colTasks] of Object.entries(columnTasks)) {
      if (colTasks.some((t) => t.id === taskId)) return col;
    }
    return null;
  }

  function onDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeCol = findTaskColumn(active.id as string);
    const overCol = KANBAN_COLUMNS.includes(over.id as (typeof KANBAN_COLUMNS)[number])
      ? (over.id as string)
      : findTaskColumn(over.id as string);

    if (!activeCol || !overCol || activeCol === overCol) return;

    setLocalTasks((prev) => {
      const source = prev ?? tasks;
      return source.map((t) =>
        t.id === active.id ? { ...t, status: overCol as Task['status'] } : t
      );
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const finalCol = KANBAN_COLUMNS.includes(over.id as (typeof KANBAN_COLUMNS)[number])
      ? (over.id as string)
      : findTaskColumn(over.id as string);

    if (!finalCol) return;

    const colTasks = (localTasks ?? tasks).filter(
      (t) => t.status === finalCol
    );
    const taskIdx = colTasks.findIndex((t) => t.id === active.id);
    const newPosition = taskIdx >= 0 ? taskIdx : colTasks.length;

    moveMutation.mutate({
      id: active.id as string,
      status: finalCol,
      position: newPosition,
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex gap-4">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col} className="w-72 h-64 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-lg">Board</h2>
          <Badge variant="secondary">{tasks.length} tasks</Badge>
        </div>
        <Button
          variant="brand"
          size="sm"
          onClick={() => openCreateTask(projectId ?? undefined)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Task
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max pb-4">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col}
                status={col}
                tasks={columnTasks[col] ?? []}
                onAddTask={() => openCreateTask(projectId ?? undefined)}
                onTaskClick={(taskId) => navigate(`/app/tasks/${taskId}`)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} overlay />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

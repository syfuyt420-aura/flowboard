import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { tasksService } from '@/services/tasks.service';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const PRIORITY_DOT: Record<string, string> = {
  P0: 'bg-red-500',
  P1: 'bg-orange-500',
  P2: 'bg-yellow-400',
  P3: 'bg-slate-400',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailing; i++) cells.push(null);
  return cells;
}

interface DayTasksProps {
  tasks: Task[];
  onTaskClick: (id: string) => void;
}

function DayTasks({ tasks, onTaskClick }: DayTasksProps) {
  const visible = tasks.slice(0, 3);
  const overflow = tasks.length - visible.length;
  return (
    <div className="mt-1 space-y-0.5">
      {visible.map((task) => (
        <button
          key={task.id}
          onClick={(e) => {
            e.stopPropagation();
            onTaskClick(task.id);
          }}
          className="w-full flex items-center gap-1 text-left rounded px-1 py-0.5 hover:bg-accent/60 transition-colors group"
        >
          <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority] ?? 'bg-slate-400')} />
          <span className="text-[11px] leading-tight truncate text-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400">
            {task.title}
          </span>
        </button>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground px-1">+{overflow} more</span>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.tasks.list(projectId),
    queryFn: () => tasksService.list({ projectId, limit: 200 }),
    enabled: !!projectId,
    select: (d) => d.data,
  });

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const d = new Date(task.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  function getTasksForDay(date: Date): Task[] {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return tasksByDay.get(key) ?? [];
  }

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  const tasksWithDue = tasks.filter((t) => t.dueDate).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b flex-wrap">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-display font-bold text-lg flex-1">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <Badge variant="secondary">{tasksWithDue} scheduled</Badge>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs px-2">
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 min-w-[600px]">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wide">
                {d}
              </div>
            ))}
            {grid.map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} className="min-h-[7rem] rounded-lg" />;
              }
              const isToday = isSameDay(date, today);
              const isCurrentMonth = date.getMonth() === viewMonth;
              const dayTasks = getTasksForDay(date);
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    'min-h-[7rem] rounded-lg border p-1.5 transition-colors',
                    isCurrentMonth ? 'bg-card' : 'bg-muted/30',
                    isToday && 'ring-2 ring-brand-500 border-brand-500',
                    !isToday && 'border-border/50 hover:border-border'
                  )}
                >
                  <div className="flex items-center justify-end mb-0.5">
                    <span
                      className={cn(
                        'text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full',
                        isToday
                          ? 'bg-brand-500 text-white font-bold'
                          : isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/50'
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  <DayTasks tasks={dayTasks} onTaskClick={(id) => navigate(`/app/tasks/${id}`)} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

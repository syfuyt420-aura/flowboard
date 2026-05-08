import { useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Minus } from 'lucide-react';
import { tasksService } from '@/services/tasks.service';
import { QUERY_KEYS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const STATUS_BAR: Record<string, string> = {
  DONE: 'bg-green-500',
  IN_PROGRESS: 'bg-amber-500',
  IN_REVIEW: 'bg-purple-500',
  TODO: 'bg-blue-500',
  BACKLOG: 'bg-slate-400',
};

const STATUS_LABEL: Record<string, string> = {
  DONE: 'Done',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  TODO: 'To Do',
  BACKLOG: 'Backlog',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CELL_PX = 36;
const TOTAL_WEEKS = 8;
const TOTAL_DAYS = TOTAL_WEEKS * 7;
const SIDEBAR_W = 220;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

function dayOffset(base: Date, target: Date): number {
  return Math.round((startOfDay(target).getTime() - startOfDay(base).getTime()) / DAY_MS);
}

function buildWeeks(start: Date): { weekStart: Date; days: Date[] }[] {
  const weeks: { weekStart: Date; days: Date[] }[] = [];
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const weekStart = addDays(start, w * 7);
    const days: Date[] = [];
    for (let d = 0; d < 7; d++) days.push(addDays(weekStart, d));
    weeks.push({ weekStart, days });
  }
  return weeks;
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface TaskRowProps {
  task: Task;
  gridStart: Date;
  onClick: () => void;
}

function TaskRow({ task, gridStart, onClick }: TaskRowProps) {
  const barColor = STATUS_BAR[task.status] ?? 'bg-slate-400';

  const start = task.startDate ? startOfDay(new Date(task.startDate)) : null;
  const end = task.dueDate ? startOfDay(new Date(task.dueDate)) : null;

  let barLeft: number | null = null;
  let barWidth: number | null = null;

  if (end) {
    const endOffset = dayOffset(gridStart, end);
    if (start) {
      const startOffset = dayOffset(gridStart, start);
      barLeft = startOffset * CELL_PX;
      barWidth = Math.max((endOffset - startOffset + 1) * CELL_PX, CELL_PX);
    } else {
      barLeft = endOffset * CELL_PX;
      barWidth = CELL_PX;
    }
  }

  const isVisible = barLeft !== null && barLeft < TOTAL_DAYS * CELL_PX && (barLeft + (barWidth ?? 0)) > 0;

  return (
    <div className="flex border-b border-border/40 hover:bg-accent/20 transition-colors group" style={{ height: 40 }}>
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-border/40 bg-card z-10"
        style={{ width: SIDEBAR_W }}
      >
        <span
          className={cn('h-2 w-2 rounded-full flex-shrink-0', barColor)}
        />
        <button
          onClick={onClick}
          className="text-sm truncate text-left hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex-1 min-w-0"
          title={task.title}
        >
          {task.title}
        </button>
      </div>
      <div className="relative flex-1" style={{ width: TOTAL_DAYS * CELL_PX }}>
        {isVisible && barLeft !== null && barWidth !== null && (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 rounded-full h-5 min-w-[8px] opacity-90 hover:opacity-100 transition-opacity cursor-pointer',
              barColor
            )}
            style={{
              left: Math.max(0, barLeft),
              width: barWidth - (barLeft < 0 ? -barLeft : 0),
            }}
            onClick={onClick}
            title={`${task.title} · ${STATUS_LABEL[task.status] ?? task.status}`}
          />
        )}
        {!isVisible && barLeft !== null && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-1">
            <Minus className="h-3 w-3 text-muted-foreground/40" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.tasks.list(projectId),
    queryFn: () => tasksService.list({ projectId, limit: 200 }),
    enabled: !!projectId,
    select: (d) => d.data,
  });

  const today = startOfDay(new Date());
  const gridStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() - 4 * 7);
    return startOfDay(d);
  }, []);

  const weeks = useMemo(() => buildWeeks(gridStart), [gridStart]);

  const { scheduled, unscheduled } = useMemo(() => {
    const scheduled: Task[] = [];
    const unscheduled: Task[] = [];
    for (const t of tasks) {
      if (t.dueDate || t.startDate) scheduled.push(t);
      else unscheduled.push(t);
    }
    return { scheduled, unscheduled };
  }, [tasks]);

  const todayOffset = dayOffset(gridStart, today);
  const todayLeft = todayOffset * CELL_PX;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b flex-wrap flex-shrink-0">
        <CalendarRange className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-display font-bold text-lg flex-1">Timeline</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(STATUS_BAR).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className={cn('h-2 w-2 rounded-full', c)} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
        <Badge variant="secondary">{tasks.length} tasks</Badge>
      </div>

      {isLoading ? (
        <div className="flex-1 p-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex overflow-hidden flex-1">
            <div className="flex-shrink-0 bg-card border-r border-border/40 z-20" style={{ width: SIDEBAR_W }} />
            <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
              <div style={{ width: TOTAL_DAYS * CELL_PX, minWidth: TOTAL_DAYS * CELL_PX }}>
                <div className="flex border-b border-border/40 bg-muted/50 sticky top-0 z-10">
                  {weeks.map(({ weekStart, days }) => (
                    <div key={weekStart.toISOString()} className="flex flex-col" style={{ width: 7 * CELL_PX }}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/30">
                        {MONTH_SHORT[weekStart.getMonth()]} {weekStart.getDate()}
                      </div>
                      <div className="flex">
                        {days.map((day) => {
                          const isToday = dayOffset(gridStart, day) === todayOffset;
                          return (
                            <div
                              key={day.toISOString()}
                              className={cn(
                                'flex items-center justify-center text-[10px] font-medium',
                                isToday
                                  ? 'bg-brand-500 text-white rounded-t'
                                  : day.getDay() === 0 || day.getDay() === 6
                                  ? 'text-muted-foreground/50 bg-muted/30'
                                  : 'text-muted-foreground'
                              )}
                              style={{ width: CELL_PX, height: 24 }}
                            >
                              {day.getDate()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex">
            <div className="flex-shrink-0 bg-card border-r border-border/40 z-10" style={{ width: SIDEBAR_W }}>
              {unscheduled.length > 0 && (
                <div
                  className="flex items-center gap-2 px-3 border-b border-border/40 bg-muted/30"
                  style={{ height: 32 }}
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Unscheduled ({unscheduled.length})
                  </span>
                </div>
              )}
              {unscheduled.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-3 border-b border-border/40 hover:bg-accent/20 transition-colors group"
                  style={{ height: 40 }}
                >
                  <span className={cn('h-2 w-2 rounded-full flex-shrink-0', STATUS_BAR[task.status] ?? 'bg-slate-400')} />
                  <button
                    onClick={() => navigate(`/app/tasks/${task.id}`)}
                    className="text-sm truncate text-left hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex-1 min-w-0"
                    title={task.title}
                  >
                    {task.title}
                  </button>
                </div>
              ))}
              {scheduled.length > 0 && (
                <div
                  className="flex items-center gap-2 px-3 border-b border-border/40 bg-muted/30"
                  style={{ height: 32 }}
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Scheduled ({scheduled.length})
                  </span>
                </div>
              )}
              {scheduled.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-3 border-b border-border/40 hover:bg-accent/20 transition-colors"
                  style={{ height: 40 }}
                >
                  <span className={cn('h-2 w-2 rounded-full flex-shrink-0', STATUS_BAR[task.status] ?? 'bg-slate-400')} />
                  <button
                    onClick={() => navigate(`/app/tasks/${task.id}`)}
                    className="text-sm truncate text-left hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex-1 min-w-0"
                    title={task.title}
                  >
                    {task.title}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-x-auto">
              <div
                className="relative"
                style={{ width: TOTAL_DAYS * CELL_PX, minWidth: TOTAL_DAYS * CELL_PX }}
              >
                {todayLeft >= 0 && todayLeft < TOTAL_DAYS * CELL_PX && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-brand-500/60 z-10 pointer-events-none"
                    style={{ left: todayLeft + CELL_PX / 2 }}
                  />
                )}

                {unscheduled.length > 0 && (
                  <div
                    className="flex items-center bg-muted/30 border-b border-border/40"
                    style={{ height: 32 }}
                  >
                    {Array.from({ length: TOTAL_DAYS }).map((_, i) => {
                      const day = addDays(gridStart, i);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={cn('h-full border-r border-border/20', isWeekend && 'bg-muted/40')}
                          style={{ width: CELL_PX, flexShrink: 0 }}
                        />
                      );
                    })}
                  </div>
                )}
                {unscheduled.map((task) => (
                  <div
                    key={task.id}
                    className="flex border-b border-border/40 hover:bg-accent/20 transition-colors"
                    style={{ height: 40 }}
                  >
                    {Array.from({ length: TOTAL_DAYS }).map((_, i) => {
                      const day = addDays(gridStart, i);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={cn('h-full border-r border-border/20', isWeekend && 'bg-muted/20')}
                          style={{ width: CELL_PX, flexShrink: 0 }}
                        />
                      );
                    })}
                  </div>
                ))}

                {scheduled.length > 0 && (
                  <div
                    className="flex items-center bg-muted/30 border-b border-border/40"
                    style={{ height: 32 }}
                  >
                    {Array.from({ length: TOTAL_DAYS }).map((_, i) => {
                      const day = addDays(gridStart, i);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={cn('h-full border-r border-border/20', isWeekend && 'bg-muted/40')}
                          style={{ width: CELL_PX, flexShrink: 0 }}
                        />
                      );
                    })}
                  </div>
                )}
                {scheduled.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    gridStart={gridStart}
                    onClick={() => navigate(`/app/tasks/${task.id}`)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

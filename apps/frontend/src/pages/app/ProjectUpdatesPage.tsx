import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MessageSquare, RefreshCw, ArrowRight,
  CheckCircle2, PlayCircle, Eye, Clock3,
  Users, Mail,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { tasksService } from '@/services/tasks.service';
import { QUERY_KEYS } from '@/lib/constants';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/shared/Skeleton';
import type { Comment } from '@flowboard/shared';
import { cn } from '@/lib/utils';

/* ─── types ──────────────────────────────────────────────────── */
type Author = { name: string; avatarUrl?: string | null; email?: string };
type UpdateItem = Comment & {
  author?: Author;
  taskId: string;
  taskTitle: string;
  taskStatus: string;
};

/* ─── helpers ─────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  TODO:        { label: 'To Do',       color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950',    icon: Clock3 },
  BACKLOG:     { label: 'Backlog',     color: 'text-slate-500',  bg: 'bg-slate-50 dark:bg-slate-900',  icon: Clock3 },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950',  icon: PlayCircle },
  IN_REVIEW:   { label: 'In Review',   color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950',icon: Eye },
  DONE:        { label: 'Done',        color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950',  icon: CheckCircle2 },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
}

/* ─── UpdateCard ──────────────────────────────────────────────── */
function UpdateCard({ update, onTaskClick }: {
  update: UpdateItem;
  onTaskClick: (id: string) => void;
}) {
  const statusMatch = update.content.match(/^\[Status → ([^\]]+)\]\s*/);
  const newStatusLabel = statusMatch?.[1];
  const message = update.content.replace(/^\[Status → [^\]]+\]\s*/, '').trim();
  const taskCfg = STATUS_CFG[update.taskStatus] ?? STATUS_CFG.TODO;
  const TaskIcon = taskCfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card overflow-hidden hover:shadow-sm transition-shadow"
    >
      {/* Member identity strip */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-secondary/30">
        <UserAvatar
          name={update.author?.name ?? 'User'}
          src={update.author?.avatarUrl}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {update.author?.name ?? 'Unknown member'}
          </p>
          {update.author?.email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Mail className="h-3 w-3" />
              {update.author.email}
            </p>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {timeAgo(update.createdAt as unknown as string)}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Status change */}
        {newStatusLabel && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status changed to</span>
            <span className={cn(
              'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
              newStatusLabel === 'Done'        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
              newStatusLabel === 'In Progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
              newStatusLabel === 'In Review'   ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
              'bg-muted text-muted-foreground'
            )}>
              {newStatusLabel === 'Done' && <CheckCircle2 className="h-3 w-3" />}
              {newStatusLabel === 'In Progress' && <PlayCircle className="h-3 w-3" />}
              {newStatusLabel === 'In Review' && <Eye className="h-3 w-3" />}
              {newStatusLabel}
            </span>
          </div>
        )}

        {/* Message */}
        {message && (
          <p className="text-sm text-foreground/90 leading-relaxed">{message}</p>
        )}

        {/* Task link */}
        <button
          onClick={() => onTaskClick(update.taskId)}
          className="flex items-center gap-2 w-full text-left rounded-lg border border-border/60 px-3 py-2 hover:bg-accent transition-colors group"
        >
          <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0', taskCfg.bg, taskCfg.color)}>
            <TaskIcon className="h-3 w-3" />
            {taskCfg.label}
          </span>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate flex-1">
            {update.taskTitle}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 transition-colors" />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── MemberSidebar ───────────────────────────────────────────── */
function MemberSidebar({ updates, selected, onSelect }: {
  updates: UpdateItem[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  const memberMap = new Map<string, { author: Author; count: number; latest: string }>();
  for (const u of updates) {
    if (!u.author?.name) continue;
    const existing = memberMap.get(u.author.name);
    if (!existing) {
      memberMap.set(u.author.name, { author: u.author, count: 1, latest: u.createdAt as unknown as string });
    } else {
      existing.count++;
      if (new Date(u.createdAt as unknown as string) > new Date(existing.latest)) {
        existing.latest = u.createdAt as unknown as string;
      }
    }
  }
  const members = Array.from(memberMap.values()).sort((a, b) =>
    new Date(b.latest).getTime() - new Date(a.latest).getTime()
  );

  return (
    <div className="w-56 flex-shrink-0 border-r overflow-y-auto scrollbar-thin">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Members ({members.length})
        </p>
      </div>

      <div className="p-2 space-y-0.5">
        <button
          onClick={() => onSelect('all')}
          className={cn(
            'flex items-center gap-2 w-full text-left px-2 py-2 rounded text-sm transition-colors',
            selected === 'all'
              ? 'bg-accent font-medium text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium">All members</p>
            <p className="text-[11px] text-muted-foreground">{updates.length} updates</p>
          </div>
        </button>

        {members.map(({ author, count, latest }) => (
          <button
            key={author.name}
            onClick={() => onSelect(author.name)}
            className={cn(
              'flex items-center gap-2 w-full text-left px-2 py-2 rounded transition-colors',
              selected === author.name
                ? 'bg-accent font-medium text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <UserAvatar name={author.name} src={author.avatarUrl} size="sm" className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{author.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {count} update{count !== 1 ? 's' : ''} · {timeAgo(latest)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function ProjectUpdatesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [memberFilter, setMemberFilter] = useState('all');

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: QUERY_KEYS.tasks.list(projectId),
    queryFn: () => tasksService.list({ projectId, limit: 200 }),
    enabled: !!projectId,
    select: (d) => d.data,
    refetchInterval: 15000,
  });

  const tasks = tasksData ?? [];

  const { data: allUpdates = [], isLoading: commentsLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['project-updates', projectId, tasks.map(t => t.id).sort().join(',')],
    queryFn: async () => {
      if (!tasks.length) return [];
      const results = await Promise.all(
        tasks.map(async (task) => {
          try {
            const { data } = await api.get<{ data: (Comment & { author?: Author })[] }>(`/tasks/${task.id}/comments`);
            return data.data.map(c => ({
              ...c,
              taskId: task.id,
              taskTitle: task.title,
              taskStatus: task.status as string,
            })) as UpdateItem[];
          } catch { return []; }
        })
      );
      return results.flat().sort((a, b) =>
        new Date(b.createdAt as unknown as string).getTime() -
        new Date(a.createdAt as unknown as string).getTime()
      );
    },
    enabled: tasks.length > 0,
    refetchInterval: 15000,
  });

  const isLoading = tasksLoading || commentsLoading;

  const filtered = memberFilter === 'all'
    ? allUpdates
    : allUpdates.filter(u => u.author?.name === memberFilter);

  // Group by day
  const grouped: { day: string; items: UpdateItem[] }[] = [];
  for (const u of filtered) {
    const label = dayLabel(u.createdAt as unknown as string);
    const last = grouped[grouped.length - 1];
    if (last?.day === label) last.items.push(u);
    else grouped.push({ day: label, items: [u] });
  }

  const lastRefreshed = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Member sidebar */}
      <MemberSidebar
        updates={allUpdates}
        selected={memberFilter}
        onSelect={setMemberFilter}
      />

      {/* Main feed */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b flex-shrink-0 bg-background">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {memberFilter === 'all' ? 'All Updates' : `${memberFilter}'s Updates`}
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-muted-foreground">Last updated {lastRefreshed}</span>
            )}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground">No updates yet</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
                {memberFilter !== 'all'
                  ? `${memberFilter} hasn't posted any updates on tasks yet`
                  : 'When team members post progress updates from My Tasks, they will appear here'}
              </p>
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">
              {grouped.map(({ day, items }) => (
                <div key={day}>
                  {/* Day divider */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-semibold text-muted-foreground px-2">{day}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="space-y-3">
                    {items.map((update) => (
                      <UpdateCard
                        key={update.id}
                        update={update}
                        onTaskClick={(id) => navigate(`/app/tasks/${id}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

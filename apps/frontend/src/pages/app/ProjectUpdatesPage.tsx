import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Clock, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import { api } from '@/lib/axios';
import { tasksService } from '@/services/tasks.service';
import { QUERY_KEYS } from '@/lib/constants';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/shared/Skeleton';
import type { Comment } from '@flowboard/shared';
import { cn } from '@/lib/utils';

const STATUS_COLOR: Record<string, string> = {
  TODO: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  BACKLOG: 'text-slate-500 bg-slate-50 dark:bg-slate-900',
  IN_PROGRESS: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  IN_REVIEW: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
  DONE: 'text-green-500 bg-green-50 dark:bg-green-950',
};

const STATUS_LABEL: Record<string, string> = {
  TODO: 'To Do', BACKLOG: 'Backlog', IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review', DONE: 'Done',
};

type CommentWithMeta = Comment & {
  author?: { name: string; avatarUrl?: string | null; email?: string };
  taskId: string;
  taskTitle: string;
  taskStatus: string;
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

function UpdateCard({ update, index, onTaskClick }: {
  update: CommentWithMeta;
  index: number;
  onTaskClick: (taskId: string) => void;
}) {
  const isStatusUpdate = update.content.startsWith('[Status →');
  const statusMatch = update.content.match(/\[Status → ([^\]]+)\]/);
  const statusLabel = statusMatch?.[1];
  const message = update.content.replace(/^\[Status → [^\]]+\]\s*/, '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="flex gap-3 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow group"
    >
      <UserAvatar
        name={update.author?.name ?? 'User'}
        src={update.author?.avatarUrl}
        size="sm"
        className="flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        {/* Author + time */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{update.author?.name ?? 'Unknown'}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(update.createdAt as unknown as string)}
          </span>
          {isStatusUpdate && statusLabel && (
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              → {statusLabel}
            </span>
          )}
        </div>

        {/* Task pill */}
        <button
          onClick={() => onTaskClick(update.taskId)}
          className="flex items-center gap-1.5 mb-2 group/task"
        >
          <span className={cn(
            'text-[11px] font-medium px-2 py-0.5 rounded',
            STATUS_COLOR[update.taskStatus] ?? STATUS_COLOR.TODO
          )}>
            {STATUS_LABEL[update.taskStatus] ?? update.taskStatus}
          </span>
          <span className="text-xs text-muted-foreground font-medium truncate max-w-[240px] group-hover/task:text-foreground group-hover/task:underline transition-colors">
            {update.taskTitle}
          </span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover/task:text-foreground transition-colors flex-shrink-0" />
        </button>

        {/* Message */}
        {message && (
          <p className="text-sm text-foreground/80 leading-relaxed">{message}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function ProjectUpdatesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [memberFilter, setMemberFilter] = useState<string>('all');

  // Fetch all tasks in the project
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: QUERY_KEYS.tasks.list(projectId),
    queryFn: () => tasksService.list({ projectId, limit: 200 }),
    enabled: !!projectId,
    select: (d) => d.data,
    refetchInterval: 15000,
  });

  const tasks = tasksData ?? [];

  // Fetch comments for all tasks in parallel
  const { data: allUpdates = [], isLoading: commentsLoading, refetch } = useQuery({
    queryKey: ['project-updates', projectId, tasks.map(t => t.id).join(',')],
    queryFn: async () => {
      if (!tasks.length) return [];

      const commentArrays = await Promise.all(
        tasks.map(async (task) => {
          try {
            const { data } = await api.get<{ data: Comment[] }>(`/tasks/${task.id}/comments`);
            return (data.data as CommentWithMeta[]).map(c => ({
              ...c,
              taskId: task.id,
              taskTitle: task.title,
              taskStatus: task.status as string,
            }));
          } catch {
            return [];
          }
        })
      );

      const flat: CommentWithMeta[] = commentArrays.flat();
      flat.sort((a, b) =>
        new Date(b.createdAt as unknown as string).getTime() -
        new Date(a.createdAt as unknown as string).getTime()
      );
      return flat;
    },
    enabled: tasks.length > 0,
    refetchInterval: 15000,
  });

  const isLoading = tasksLoading || commentsLoading;

  // Unique members who posted updates
  const members = Array.from(
    new Map(
      allUpdates
        .filter(u => u.author?.name)
        .map(u => [u.author!.name, u.author!])
    ).entries()
  ).map(([, v]) => v);

  const filtered = memberFilter === 'all'
    ? allUpdates
    : allUpdates.filter(u => u.author?.name === memberFilter);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Member Updates</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {allUpdates.length} total
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Member filter */}
          {members.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={memberFilter}
                onChange={e => setMemberFilter(e.target.value)}
                className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All members</option>
                {members.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Updates list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium text-foreground">No updates yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {memberFilter !== 'all'
                ? `${memberFilter} hasn't posted any updates`
                : 'When members post progress updates on tasks, they will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {filtered.map((update, i) => (
              <UpdateCard
                key={update.id}
                update={update}
                index={i}
                onTaskClick={(taskId) => navigate(`/app/tasks/${taskId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

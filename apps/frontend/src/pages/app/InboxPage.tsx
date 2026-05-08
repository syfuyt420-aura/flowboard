import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Settings2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/shared/Skeleton';
import type { Notification } from '@flowboard/shared';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/utils';

const NOTIF_TYPE_CONFIG: Record<string, { color: string; dot: string }> = {
  TASK_ASSIGNED: { color: 'bg-brand-100 text-brand-700', dot: 'bg-brand-500' },
  TASK_COMPLETED: { color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  COMMENT_ADDED: { color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  TASK_DUE_SOON: { color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  TASK_OVERDUE: { color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  MENTION: { color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  PROJECT_INVITE: { color: 'bg-brand-100 text-brand-700', dot: 'bg-brand-500' },
};

type FilterType = 'all' | 'unread' | 'mentions';

function NotifItem({ notif, onMarkRead }: { notif: Notification; onMarkRead: (id: string) => void }) {
  const cfg = NOTIF_TYPE_CONFIG[notif.type] ?? { color: 'bg-muted', dot: 'bg-muted-foreground' };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer',
        notif.isRead
          ? 'bg-card hover:bg-accent/30'
          : 'bg-brand-50/50 dark:bg-brand-950/30 border-brand-200/50 dark:border-brand-800/50 hover:bg-brand-50'
      )}
      onClick={() => !notif.isRead && onMarkRead(notif.id)}
    >
      <div className="relative flex-shrink-0 mt-0.5">
        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold', cfg.color)}>
          <Bell className="h-4 w-4" />
        </div>
        {!notif.isRead && (
          <span className={cn('absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card', cfg.dot)} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notif.isRead && 'font-medium')}>
          {notif.title}
        </p>
        {notif.message && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeDate(notif.createdAt)}
        </p>
      </div>

      {!notif.isRead && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: QUERY_KEYS.notifications.list,
    queryFn: async () => {
      const { data } = await api.get<{ data: Notification[] }>('/notifications');
      return data.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.list }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.list }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'mentions') return n.type === 'TASK_MENTIONED';
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-brand-500" />
            Inbox
          </h1>
          {unreadCount > 0 && (
            <Badge variant="brand">{unreadCount} unread</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="icon-sm">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {(['all', 'unread', 'mentions'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              filter === f
                ? 'text-foreground border-brand-500'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 text-xs bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">
            {filter === 'unread' ? 'All caught up!' : 'No notifications'}
          </p>
          <p className="text-sm mt-1">
            {filter === 'unread'
              ? "You've read everything. Great job!"
              : "You'll be notified about task updates, mentions, and more."}
          </p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((n) => (
              <NotifItem
                key={n.id}
                notif={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Check, CheckCheck, MessageSquare, AlertTriangle, TrendingUp,
  HelpCircle, Zap, UserCheck, Clock, FolderKanban, Send, ChevronDown,
  Inbox, Sparkles, ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { QUERY_KEYS } from '@/lib/constants';
import { Skeleton } from '@/components/shared/Skeleton';
import type { Notification } from '@flowboard/shared';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: React.ElementType; pill: string; dot: string; label: string }> = {
  TASK_ASSIGNED:     { icon: UserCheck,    pill: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300', dot: 'bg-violet-500', label: 'Assigned' },
  TASK_COMMENTED:    { icon: MessageSquare,pill: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',            dot: 'bg-sky-500',    label: 'Comment' },
  TASK_MENTIONED:    { icon: MessageSquare,pill: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',dot: 'bg-purple-500', label: 'Mention' },
  TASK_DUE_SOON:     { icon: Clock,        pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',    dot: 'bg-amber-500',  label: 'Due Soon' },
  TASK_OVERDUE:      { icon: AlertTriangle,pill: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',            dot: 'bg-red-500',    label: 'Overdue' },
  TASK_STATUS_CHANGED:{ icon: TrendingUp,  pill: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',        dot: 'bg-teal-500',   label: 'Status' },
  PROJECT_INVITE:    { icon: FolderKanban, pill: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',    dot: 'bg-brand-500',  label: 'Invite' },
  WORKSPACE_INVITE:  { icon: FolderKanban, pill: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',    dot: 'bg-brand-500',  label: 'Invite' },
  PROJECT_COMPLETED: { icon: Zap,          pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Done' },
  MEMBER_UPDATE:     { icon: Send,         pill: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300', dot: 'bg-orange-500', label: 'Update' },
};

const UPDATE_TYPES = [
  { value: 'PROGRESS', label: 'Progress Update', icon: TrendingUp, color: 'from-sky-500 to-blue-600',     desc: 'Share what you\'ve been working on' },
  { value: 'BLOCKER',  label: 'Blocker Alert',   icon: AlertTriangle,color: 'from-red-500 to-orange-500',  desc: 'Something is blocking your work' },
  { value: 'DONE',     label: 'Work Completed',  icon: Check,        color: 'from-emerald-500 to-teal-500',desc: 'A task or milestone is done' },
  { value: 'QUESTION', label: 'Question',        icon: HelpCircle,   color: 'from-purple-500 to-violet-600',desc: 'Ask your admin a question' },
];

type FilterTab = 'all' | 'unread' | 'updates' | 'mentions';

// ── Sub-components ────────────────────────────────────────────────────────────

function NotifCard({ notif, onMarkRead }: { notif: Notification; onMarkRead: (id: string) => void }) {
  const cfg = TYPE_CONFIG[notif.type] ?? { icon: Bell, pill: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground', label: 'Notification' };
  const Icon = cfg.icon;
  const meta = notif.metadata as Record<string, string>;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => !notif.isRead && onMarkRead(notif.id)}
      className={cn(
        'group relative flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all duration-150',
        notif.isRead
          ? 'bg-card hover:bg-muted/40 border-border/60'
          : 'bg-gradient-to-r from-brand-50/60 to-violet-50/40 dark:from-brand-950/30 dark:to-violet-950/20 border-brand-200/50 dark:border-brand-800/40 hover:from-brand-50 hover:to-violet-50/60',
        notif.type === 'MEMBER_UPDATE' && !notif.isRead && 'from-orange-50/60 to-amber-50/40 dark:from-orange-950/30 dark:to-amber-950/20 border-orange-200/50 dark:border-orange-800/40',
      )}
    >
      {!notif.isRead && (
        <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r-full', cfg.dot)} />
      )}

      <div className="relative flex-shrink-0">
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', cfg.pill)}>
          <Icon className="h-4 w-4" />
        </div>
        {!notif.isRead && (
          <div className={cn('absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-card', cfg.dot)} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', cfg.pill)}>
            {cfg.label}
          </span>
          {notif.type === 'MEMBER_UPDATE' && meta?.senderName && (
            <span className="text-xs text-muted-foreground">from {meta.senderName}</span>
          )}
        </div>
        <p className={cn('text-sm', !notif.isRead && 'font-semibold text-foreground')}>
          {notif.title}
        </p>
        {notif.message && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1.5">{formatRelativeDate(notif.createdAt)}</p>
      </div>

      {!notif.isRead && (
        <button
          onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-accent transition-all duration-150"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}

function SendUpdatePanel() {
  const [updateType, setUpdateType] = useState('PROGRESS');
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(true);

  const mutation = useMutation({
    mutationFn: () => api.post('/notifications/send-update', { message, updateType }),
    onSuccess: (res: { data: { data: { adminCount: number } } }) => {
      toast.success(`Update sent to ${res.data.data.adminCount} admin${res.data.data.adminCount !== 1 ? 's' : ''}`);
      setMessage('');
    },
    onError: () => toast.error('Failed to send update'),
  });

  const selected = UPDATE_TYPES.find((u) => u.value === updateType)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card overflow-hidden mb-5"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-orange-50/80 to-amber-50/60 dark:from-orange-950/30 dark:to-amber-950/20 border-b border-orange-200/40 dark:border-orange-800/30"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
            <Send className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Send Work Update</p>
            <p className="text-xs text-muted-foreground">Let your admin know how things are going</p>
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {/* Update type selector */}
              <div className="grid grid-cols-2 gap-2">
                {UPDATE_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setUpdateType(type.value)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2.5 text-left border transition-all duration-150',
                        updateType === type.value
                          ? 'border-brand-300 bg-brand-50 dark:bg-brand-950/40 dark:border-brand-700'
                          : 'border-border/60 hover:bg-muted/50',
                      )}
                    >
                      <div className={cn('h-6 w-6 rounded-md bg-gradient-to-br flex items-center justify-center flex-shrink-0', type.color)}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{type.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{type.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Write your ${selected.label.toLowerCase()}...`}
                rows={3}
                className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all placeholder:text-muted-foreground"
              />

              <button
                onClick={() => mutation.mutate()}
                disabled={!message.trim() || mutation.isPending}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all duration-150',
                  'bg-gradient-to-r from-brand-500 to-violet-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md',
                )}
              >
                <Send className="h-3.5 w-3.5" />
                {mutation.isPending ? 'Sending...' : 'Send to Admin'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [filter, setFilter] = useState<FilterTab>('all');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: QUERY_KEYS.notifications.list,
    queryFn: async () => {
      const { data } = await api.get<{ data: Notification[] }>('/notifications?limit=50');
      return data.data;
    },
    refetchInterval: 15_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.list });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.list });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
      toast.success('All caught up!');
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const memberUpdates = notifications.filter((n) => n.type === 'MEMBER_UPDATE');
  const unreadUpdates = memberUpdates.filter((n) => !n.isRead);

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'updates') return n.type === 'MEMBER_UPDATE';
    if (filter === 'mentions') return n.type === 'TASK_MENTIONED';
    return true;
  });

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    ...(isAdmin ? [{ id: 'updates' as FilterTab, label: 'Member Updates', count: memberUpdates.length }] : []),
    { id: 'mentions', label: 'Mentions' },
  ];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto p-6 space-y-5">

        {/* ── Hero ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6b5efa 50%, #7c3aed 100%)' }}
        >
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/8 blur-2xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-white/60" />
                <span className="text-white/60 text-sm font-medium">Inbox</span>
              </div>
              <h1 className="text-3xl font-display font-bold tracking-tight mb-1">
                {unreadCount > 0 ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </h1>
              <p className="text-white/70 text-sm">
                {isAdmin
                  ? `${memberUpdates.length} member update${memberUpdates.length !== 1 ? 's' : ''} · ${unreadCount} unread`
                  : `Stay updated on your tasks and team activity`}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-2 bg-white text-brand-700 hover:bg-white/90 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-lg hover:-translate-y-0.5"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Mini stat strip for admin */}
          {isAdmin && (
            <div className="relative z-10 mt-4 flex gap-3 flex-wrap">
              {[
                { label: 'Total', value: notifications.length, icon: Bell },
                { label: 'Unread', value: unreadCount, icon: Inbox },
                { label: 'Member Updates', value: memberUpdates.length, icon: Send },
                { label: 'Unread Updates', value: unreadUpdates.length, icon: AlertTriangle },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/15">
                  <Icon className="h-3.5 w-3.5 text-white/60" />
                  <span className="text-white/70 text-xs">{label}</span>
                  <span className="text-white font-bold text-sm">{value}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Member send-update panel */}
        {!isAdmin && <SendUpdatePanel />}

        {/* Admin: Member updates section */}
        {isAdmin && memberUpdates.length > 0 && filter === 'all' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-orange-200/60 dark:border-orange-800/40 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50/80 to-amber-50/60 dark:from-orange-950/30 dark:to-amber-950/20 border-b border-orange-200/40 dark:border-orange-800/30">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
                  <Send className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-semibold">Member Updates</span>
                {unreadUpdates.length > 0 && (
                  <span className="text-xs font-bold bg-orange-500 text-white rounded-full px-2 py-0.5">
                    {unreadUpdates.length} new
                  </span>
                )}
              </div>
              <button
                onClick={() => setFilter('updates')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {memberUpdates.slice(0, 3).map((n) => {
                const meta = n.metadata as Record<string, string>;
                const typeInfo = UPDATE_TYPES.find((u) => u.value === meta?.updateType);
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                    className={cn(
                      'flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors',
                      n.isRead ? 'hover:bg-muted/40' : 'bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50',
                    )}
                  >
                    <div className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      typeInfo ? `bg-gradient-to-br ${typeInfo.color}` : 'bg-orange-500',
                    )}>
                      {typeInfo ? <typeInfo.icon className="h-3.5 w-3.5 text-white" /> : <Send className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{meta?.senderName ?? 'Team member'}</p>
                        {typeInfo && (
                          <span className="text-[10px] font-medium bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full">
                            {typeInfo.label}
                          </span>
                        )}
                        {!n.isRead && <div className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatRelativeDate(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1 border-b border-border/60">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
                filter === tab.id
                  ? 'text-foreground border-brand-500'
                  : 'text-muted-foreground border-transparent hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center',
                  filter === tab.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-card">
                <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-50 to-brand-50 dark:from-sky-950/30 dark:to-brand-950/30 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-center mb-4">
              {filter === 'unread' ? (
                <CheckCheck className="h-7 w-7 text-emerald-500" />
              ) : (
                <Bell className="h-7 w-7 text-brand-400" />
              )}
            </div>
            <p className="text-base font-semibold">
              {filter === 'unread' ? 'All caught up!' : filter === 'updates' ? 'No member updates yet' : 'Nothing here yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {filter === 'unread'
                ? "You've read all your notifications. Great job!"
                : filter === 'updates'
                ? 'When team members send work updates, they\'ll appear here.'
                : 'Notifications about tasks, comments, and more will appear here.'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filtered.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <NotifCard
                    notif={n}
                    onMarkRead={(id) => markReadMutation.mutate(id)}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

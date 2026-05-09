import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Bell, Users,
  BarChart3, Zap, Settings, ChevronLeft, ChevronRight, Plus,
  Search, Inbox, Building2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { UserAvatar } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/axios';
import type { Task } from '@flowboard/shared';

const ADMIN_NAV = [
  { group: 'Workspace', items: [
    { to: '/app/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/my-tasks',    icon: Inbox,           label: 'My Tasks' },
    { to: '/app/inbox',       icon: Bell,            label: 'Inbox' },
  ]},
  { group: 'Manage', items: [
    { to: '/app/projects',    icon: FolderKanban,    label: 'Projects' },
    { to: '/app/tasks',       icon: CheckSquare,     label: 'All Tasks' },
    { to: '/app/team',        icon: Users,           label: 'Team' },
    { to: '/app/org-members', icon: Building2,       label: 'Members of Org' },
  ]},
  { group: 'Insights', items: [
    { to: '/app/analytics',   icon: BarChart3,       label: 'Analytics' },
    { to: '/app/automations', icon: Zap,             label: 'Automations' },
  ]},
];

const MEMBER_NAV = [
  { group: 'Main', items: [
    { to: '/app/my-tasks',  icon: Inbox,        label: 'My Tasks' },
    { to: '/app/projects',  icon: FolderKanban, label: 'Projects' },
    { to: '/app/inbox',     icon: Bell,         label: 'Inbox' },
  ]},
];

function Tooltip({ label }: { label: string }) {
  return (
    <div className="pointer-events-none hidden group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[200] items-center">
      <div className="h-1.5 w-1.5 rotate-45 bg-gray-900 dark:bg-gray-100 -mr-0.5 flex-shrink-0" />
      <span className="bg-gray-900 dark:bg-gray-100 text-gray-100 dark:text-gray-900 text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
        {label}
      </span>
    </div>
  );
}

export default function Sidebar() {
  useTranslation();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const NAV_GROUPS = isAdmin ? ADMIN_NAV : MEMBER_NAV;
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const openCreateTask = useUIStore((s) => s.openCreateTask);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  const { data: myTasksData } = useQuery({
    queryKey: ['tasks', 'mine', user?.id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Task[] }>('/tasks/mine');
      return data.data;
    },
    enabled: !!user?.id,
  });
  const pendingCount = (myTasksData ?? []).filter((t) => !['DONE'].includes(t.status as string)).length;

  return (
    <motion.aside
      className="relative flex h-full flex-col border-r border-border/50 bg-card overflow-hidden"
      animate={{ width: collapsed ? 52 : 240 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Subtle top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500 via-violet-500 to-purple-500" />

      {/* Brand header */}
      <div className={cn(
        'flex h-12 items-center border-b border-border/50 px-2 gap-2',
        collapsed && 'justify-center',
      )}>
        {/* Gradient logo mark */}
        <div className="relative h-7 w-7 flex-shrink-0">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-md shadow-brand-500/25">
            <span className="text-white font-black text-sm leading-none">F</span>
          </div>
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 opacity-30 blur-md -z-10" />
        </div>

        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-w-0"
          >
            <span className="text-sm font-bold text-foreground tracking-tight">FlowBoard</span>
          </motion.div>
        )}

        <button
          onClick={toggleSidebar}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors flex-shrink-0',
          )}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Search + New Task */}
      <div className="px-1.5 pt-2 pb-1 space-y-0.5">
        <div className="relative group">
          <button
            onClick={openCommandPalette}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
              collapsed && 'justify-center',
            )}
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search</span>
                <kbd className="text-[10px] bg-muted/70 text-muted-foreground/60 font-mono px-1.5 py-0.5 rounded-md border border-border/60">⌘K</kbd>
              </>
            )}
          </button>
          {collapsed && <Tooltip label="Search  ⌘K" />}
        </div>

        {isAdmin && (
          <div className="relative group">
            <button
              onClick={() => openCreateTask()}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors',
                'bg-gradient-to-r from-brand-500/10 to-violet-500/10 text-brand-600 dark:text-brand-400',
                'hover:from-brand-500/20 hover:to-violet-500/20 border border-brand-200/50 dark:border-brand-800/40',
                collapsed && 'justify-center',
              )}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>New Task</span>}
            </button>
            {collapsed && <Tooltip label="New Task" />}
          </div>
        )}
      </div>

      <div className="mx-2 my-1 border-t border-border/40" />

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-1.5 py-1 space-y-3">
        {NAV_GROUPS.map(({ group, items }) => (
          <div key={group}>
            {!collapsed && (
              <p className="px-2 mb-1 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                {group}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map(({ to, icon: Icon, label }) => {
                const isMyTasks = to === '/app/my-tasks';
                const badge = isMyTasks && pendingCount > 0 ? pendingCount : null;
                return (
                  <div key={to} className="relative group">
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          'relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-all duration-100',
                          isActive
                            ? 'bg-gradient-to-r from-brand-500/15 to-violet-500/10 text-foreground font-semibold shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          collapsed && 'justify-center px-1.5',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-gradient-to-b from-brand-500 to-violet-500" />
                          )}
                          <div className="relative flex-shrink-0">
                            <Icon className={cn(
                              'h-4 w-4 transition-colors',
                              isActive ? 'text-brand-600 dark:text-brand-400' : 'text-muted-foreground/70',
                            )} />
                            {badge && collapsed && (
                              <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 flex items-center justify-center rounded-full bg-brand-500 text-white text-[8px] font-bold">
                                {badge > 9 ? '9+' : badge}
                              </span>
                            )}
                          </div>
                          {!collapsed && (
                            <>
                              <span className="flex-1">{label}</span>
                              {badge && (
                                <span className="text-[10px] font-bold bg-brand-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                                  {badge > 99 ? '99+' : badge}
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </NavLink>
                    {collapsed && <Tooltip label={badge ? `${label} (${badge})` : label} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-2 border-t border-border/40" />

      {/* User footer */}
      <div className="px-1.5 py-2">
        <div className="relative group">
          <NavLink
            to="/app/settings"
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted',
              location.pathname === '/app/settings' && 'bg-muted',
              collapsed && 'justify-center',
            )}
          >
            {user && (
              <div className="relative flex-shrink-0">
                <UserAvatar name={user.name} src={user.avatarUrl} size="xs" />
                <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
            )}
            {!collapsed && user && (
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <Settings className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
              </div>
            )}
          </NavLink>
          {collapsed && user && <Tooltip label={`${user.name} · Settings`} />}
        </div>
      </div>
    </motion.aside>
  );
}

import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  Users,
  BarChart3,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Inbox,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { tasksService } from '@/services/tasks.service';

const NAV_ITEMS = [
  { to: '/app/dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard', label: 'Dashboard' },
  { to: '/app/my-tasks', icon: Inbox, labelKey: 'navigation.myTasks', label: 'My Tasks' },
  { to: '/app/projects', icon: FolderKanban, labelKey: 'navigation.projects', label: 'Projects' },
  { to: '/app/tasks', icon: CheckSquare, labelKey: 'navigation.tasks', label: 'Tasks' },
  { to: '/app/inbox', icon: Bell, labelKey: 'navigation.inbox', label: 'Inbox' },
  { to: '/app/team', icon: Users, labelKey: 'navigation.team', label: 'Team' },
  { to: '/app/analytics', icon: BarChart3, labelKey: 'navigation.analytics', label: 'Analytics' },
  { to: '/app/automations', icon: Zap, labelKey: 'navigation.automations', label: 'Automations' },
];


export default function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const openCreateTask = useUIStore((s) => s.openCreateTask);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  const { data: myTasksData } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => tasksService.list({ assignee: user?.id, limit: 200 }),
    enabled: !!user?.id,
    select: (d) => d.data,
  });
  const pendingCount = (myTasksData ?? []).filter(
    (t) => !['DONE'].includes(t.status as string)
  ).length;

  return (
    <motion.aside
      className="relative flex h-full flex-col border-r bg-card flex-shrink-0"
      animate={{ width: collapsed ? 64 : 224 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Logo + toggle always in header */}
      <div className="flex h-14 items-center border-b px-3 gap-2">
        {/* F icon — always visible */}
        <div className="h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          F
        </div>

        {/* "FlowBoard" text — only when expanded */}
        {!collapsed && (
          <motion.span
            className="font-display font-bold text-base flex-1 truncate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            FlowBoard
          </motion.span>
        )}

        {/* Toggle button — always visible, changes direction */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className={cn('text-muted-foreground flex-shrink-0', collapsed && 'mx-auto')}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Search / Command */}
      <div className="px-2 py-3">
        <div className={cn('relative group', collapsed && 'flex justify-center')}>
          <button
            onClick={openCommandPalette}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl border border-dashed bg-muted/50 px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center w-10 h-10 p-0'
            )}
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search…</span>
                <kbd className="ml-auto hidden rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-mono sm:block">
                  ⌘K
                </kbd>
              </>
            )}
          </button>
          {collapsed && (
            <div className="hidden group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 items-center">
              <div className="h-1.5 w-1.5 rotate-45 bg-foreground/90 -mr-0.5 flex-shrink-0" />
              <span className="bg-foreground/90 text-background text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                Search (⌘K)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey, label }) => {
          const isMyTasks = to === '/app/my-tasks';
          const badge = isMyTasks && pendingCount > 0 ? pendingCount : null;
          return (
            <div key={to} className="relative group">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    collapsed && 'justify-center px-2'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative flex-shrink-0">
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          isActive ? 'text-brand-600 dark:text-brand-400' : 'text-muted-foreground'
                        )}
                      />
                      {badge && collapsed && (
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 flex items-center justify-center rounded-full bg-brand-500 text-white text-[8px] font-bold">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <span className="flex-1">{t(labelKey)}</span>
                    )}
                    {!collapsed && badge && (
                      <span className="ml-auto text-[10px] font-bold bg-brand-500 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>

              {/* Tooltip shown only when collapsed */}
              {collapsed && (
                <div className="pointer-events-none hidden group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 items-center">
                  <div className="h-1.5 w-1.5 rotate-45 bg-foreground/90 -mr-0.5 flex-shrink-0" />
                  <span className="bg-foreground/90 text-background text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                    {badge ? `${label} (${badge})` : label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Quick Create */}
      <div className="px-2 pb-2">
        <div className="relative group">
          <Button
            variant="brand"
            size={collapsed ? 'icon' : 'default'}
            className="w-full"
            onClick={() => openCreateTask()}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span className="ml-2">New Task</span>}
          </Button>
          {collapsed && (
            <div className="pointer-events-none hidden group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 items-center">
              <div className="h-1.5 w-1.5 rotate-45 bg-foreground/90 -mr-0.5 flex-shrink-0" />
              <span className="bg-foreground/90 text-background text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                New Task
              </span>
            </div>
          )}
        </div>
      </div>

      {/* User Footer */}
      <div className="border-t p-2">
        <div className="relative group">
          <NavLink
            to="/app/settings"
            className={cn(
              'flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-accent',
              location.pathname === '/app/settings' && 'bg-accent',
              collapsed && 'justify-center'
            )}
          >
            {user && (
              <UserAvatar name={user.name} src={user.avatarUrl} size="sm" />
            )}
            {!collapsed && user && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <Settings className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
          </NavLink>
          {collapsed && user && (
            <div className="pointer-events-none hidden group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 items-center">
              <div className="h-1.5 w-1.5 rotate-45 bg-foreground/90 -mr-0.5 flex-shrink-0" />
              <span className="bg-foreground/90 text-background text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                {user.name} · Settings
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

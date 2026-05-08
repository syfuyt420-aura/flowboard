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
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/axios';
import type { Task } from '@flowboard/shared';

const ADMIN_NAV = [
  { to: '/app/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/my-tasks',    icon: Inbox,           label: 'My Tasks' },
  { to: '/app/projects',    icon: FolderKanban,    label: 'Projects' },
  { to: '/app/tasks',       icon: CheckSquare,     label: 'Tasks' },
  { to: '/app/inbox',       icon: Bell,            label: 'Inbox' },
  { to: '/app/team',        icon: Users,           label: 'Team' },
  { to: '/app/analytics',   icon: BarChart3,       label: 'Analytics' },
  { to: '/app/automations', icon: Zap,             label: 'Automations' },
];

const MEMBER_NAV = [
  { to: '/app/my-tasks',  icon: Inbox,        label: 'My Tasks' },
  { to: '/app/projects',  icon: FolderKanban, label: 'Projects' },
  { to: '/app/inbox',     icon: Bell,         label: 'Inbox' },
];

function SideTooltip({ label }: { label: string }) {
  return (
    <div className="pointer-events-none hidden group-hover:flex absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-[200] items-center">
      <div className="h-1.5 w-1.5 rotate-45 bg-foreground -mr-0.5 flex-shrink-0 rounded-[1px]" />
      <span className="bg-foreground text-background text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-md">
        {label}
      </span>
    </div>
  );
}

export default function Sidebar() {
  useTranslation();
  const isAdmin = useAuthStore(s => s.isAdmin());
  const NAV_ITEMS = isAdmin ? ADMIN_NAV : MEMBER_NAV;
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
  const pendingCount = (myTasksData ?? []).filter(
    (t) => !['DONE'].includes(t.status as string)
  ).length;

  return (
    <motion.aside
      className="relative flex h-full flex-col border-r border-border/60 bg-secondary/40"
      animate={{ width: collapsed ? 52 : 240 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Workspace header */}
      <div className={cn(
        'flex h-11 items-center border-b border-border/60 px-2 gap-1.5',
        collapsed && 'justify-center'
      )}>
        {/* Logo mark */}
        <div className="h-6 w-6 rounded-md bg-foreground flex items-center justify-center text-background font-bold text-xs flex-shrink-0">
          F
        </div>

        {!collapsed && (
          <motion.span
            className="flex-1 text-sm font-semibold text-foreground truncate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12 }}
          >
            FlowBoard
          </motion.span>
        )}

        {/* Toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors flex-shrink-0',
            collapsed && 'ml-0'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft className="h-3.5 w-3.5" />
          }
        </button>
      </div>

      {/* Actions */}
      <div className="px-1.5 py-1.5 space-y-0.5">
        {/* Search */}
        <div className="relative group">
          <button
            onClick={openCommandPalette}
            className={cn(
              'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-75',
              collapsed && 'justify-center px-1.5'
            )}
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-[13px]">Search</span>
                <kbd className="text-[10px] text-muted-foreground/60 font-mono bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
              </>
            )}
          </button>
          {collapsed && <SideTooltip label="Search  ⌘K" />}
        </div>

        {/* New Task — admin only */}
        {isAdmin && (
          <div className="relative group">
            <button
              onClick={() => openCreateTask()}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-75',
                collapsed && 'justify-center px-1.5'
              )}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="text-[13px]">New Task</span>}
            </button>
            {collapsed && <SideTooltip label="New Task" />}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-2 border-t border-border/60" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-1.5 py-1.5 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isMyTasks = to === '/app/my-tasks';
          const badge = isMyTasks && pendingCount > 0 ? pendingCount : null;
          return (
            <div key={to} className="relative group">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-2 py-1.5 text-[13px] transition-colors duration-75',
                    isActive
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    collapsed && 'justify-center px-1.5'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative flex-shrink-0">
                      <Icon className={cn('h-4 w-4', isActive ? 'text-foreground' : 'text-muted-foreground/70')} />
                      {badge && collapsed && (
                        <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-bold">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{label}</span>
                        {badge && (
                          <span className="text-[10px] font-semibold bg-primary/10 text-primary rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
              {collapsed && <SideTooltip label={badge ? `${label} (${badge})` : label} />}
            </div>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-2 border-t border-border/60" />

      {/* User footer */}
      <div className="px-1.5 py-1.5">
        <div className="relative group">
          <NavLink
            to="/app/settings"
            className={cn(
              'flex items-center gap-2 rounded px-2 py-1.5 transition-colors duration-75 hover:bg-accent',
              location.pathname === '/app/settings' && 'bg-accent',
              collapsed && 'justify-center px-1.5'
            )}
          >
            {user && <UserAvatar name={user.name} src={user.avatarUrl} size="xs" />}
            {!collapsed && user && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{user.name}</p>
                </div>
                <Settings className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
              </>
            )}
          </NavLink>
          {collapsed && user && <SideTooltip label={`${user.name} · Settings`} />}
        </div>
      </div>
    </motion.aside>
  );
}

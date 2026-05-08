import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Plus,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { to: '/app/dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard' },
  { to: '/app/projects', icon: FolderKanban, labelKey: 'navigation.projects' },
  { to: '/app/tasks', icon: CheckSquare, labelKey: 'navigation.tasks' },
  { to: '/app/inbox', icon: Bell, labelKey: 'navigation.inbox' },
  { to: '/app/team', icon: Users, labelKey: 'navigation.team' },
  { to: '/app/analytics', icon: BarChart3, labelKey: 'navigation.analytics' },
  { to: '/app/automations', icon: Zap, labelKey: 'navigation.automations' },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  return (
    <motion.aside
      className="flex h-full flex-col border-r bg-card"
      animate={{ width: collapsed ? 64 : 224 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-3 border-b">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="logo-full"
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
                F
              </div>
              <span className="font-display font-bold text-base">FlowBoard</span>
            </motion.div>
          )}
          {collapsed && (
            <motion.div
              key="logo-icon"
              className="mx-auto h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search / Command */}
      <div className="px-2 py-3">
        <button
          onClick={openCommandPalette}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border border-dashed bg-muted/50 px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center'
          )}
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          {!collapsed && (
            <span className="flex-1 text-left">Search…</span>
          )}
          {!collapsed && (
            <kbd className="ml-auto hidden rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-mono sm:block">
              ⌘K
            </kbd>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
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
                <Icon
                  className={cn(
                    'h-4 w-4 flex-shrink-0',
                    isActive ? 'text-brand-600' : 'text-muted-foreground'
                  )}
                />
                {!collapsed && (
                  <span>{t(labelKey)}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Quick Create */}
      <div className="px-2 pb-2">
        <Button
          variant="brand"
          size={collapsed ? 'icon' : 'default'}
          className="w-full"
          onClick={openCommandPalette}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span className="ml-2">New Task</span>}
        </Button>
      </div>

      {/* User Footer */}
      <div className={cn('border-t p-2', collapsed ? 'flex justify-center' : '')}>
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
      </div>

      {/* Collapse toggle when collapsed */}
      {collapsed && (
        <div className="border-t p-2 flex justify-center">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            className="text-muted-foreground rotate-180"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.aside>
  );
}

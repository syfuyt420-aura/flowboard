import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  Users,
  BarChart3,
  Zap,
  Settings,
  Plus,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

const STATIC_ACTIONS = [
  {
    group: 'Navigate',
    items: [
      { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, to: '/app/dashboard' },
      { id: 'nav-projects', label: 'Go to Projects', icon: FolderKanban, to: '/app/projects' },
      { id: 'nav-inbox', label: 'Go to Inbox', icon: Bell, to: '/app/inbox' },
      { id: 'nav-team', label: 'Go to Team', icon: Users, to: '/app/team' },
      { id: 'nav-analytics', label: 'Go to Analytics', icon: BarChart3, to: '/app/analytics' },
      { id: 'nav-automations', label: 'Go to Automations', icon: Zap, to: '/app/automations' },
      { id: 'nav-settings', label: 'Go to Settings', icon: Settings, to: '/app/settings' },
    ],
  },
  {
    group: 'Create',
    items: [
      { id: 'create-project', label: 'New Project', icon: Plus, to: '/app/projects?new=1' },
      { id: 'create-task', label: 'New Task', icon: CheckSquare, to: '/app/tasks?new=1' },
    ],
  },
];

export default function CommandPalette() {
  const isOpen = useUIStore((s) => s.commandPaletteOpen);
  const close = useUIStore((s) => s.closeCommandPalette);
  const open = useUIStore((s) => s.openCommandPalette);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) close();
        else open();
      }
      if (e.key === 'Escape' && isOpen) close();
    },
    [isOpen, close, open]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = (to: string) => {
    close();
    setSearch('');
    navigate(to);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <Command
              className="rounded-2xl border bg-card shadow-2xl overflow-hidden"
              shouldFilter
            >
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search or jump to…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  ESC
                </kbd>
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>
                {STATIC_ACTIONS.map(({ group, items }) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {items.map(({ id, label, icon: Icon, to }) => (
                      <Command.Item
                        key={id}
                        value={label}
                        onSelect={() => handleSelect(to)}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors',
                          'aria-selected:bg-accent aria-selected:text-accent-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{label}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
              <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1 font-mono">↑↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1 font-mono">↵</kbd> Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1 font-mono">ESC</kbd> Close
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

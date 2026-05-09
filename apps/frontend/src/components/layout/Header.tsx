import { Bell, Moon, Sun, Monitor, Search } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { api, clearAccessToken } from '@/lib/axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Header() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const { data: unreadCount } = useQuery({
    queryKey: QUERY_KEYS.notifications.unreadCount,
    queryFn: async () => {
      const { data } = await api.get<{ data: { count: number } }>('/notifications/unread-count');
      return data.data.count;
    },
    refetchInterval: 30_000,
  });

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* continue */ }
    finally {
      clearAccessToken();
      logout();
      navigate('/login');
      toast.success('Signed out');
    }
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="flex h-12 items-center justify-between gap-2 border-b border-border/50 bg-card/80 backdrop-blur-sm px-4">
      {/* Left: search hint */}
      <button
        onClick={openCommandPalette}
        className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs transition-colors group"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="group-hover:text-foreground">Search anything...</span>
        <kbd className="ml-1 text-[10px] bg-muted text-muted-foreground/60 font-mono px-1.5 py-0.5 rounded-md border border-border/60">⌘K</kbd>
      </button>
      <div className="flex-1 sm:hidden" />

      {/* Right controls */}
      <div className="flex items-center gap-1">
        {/* Theme */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <ThemeIcon className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Appearance</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['light', 'dark', 'system'] as const).map((t) => (
              <DropdownMenuItem
                key={t}
                onClick={() => setTheme(t)}
                className={cn('text-sm', theme === t && 'bg-accent font-medium')}
              >
                {t === 'light' ? <Sun className="mr-2 h-3.5 w-3.5" />
                  : t === 'dark' ? <Moon className="mr-2 h-3.5 w-3.5" />
                  : <Monitor className="mr-2 h-3.5 w-3.5" />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={() => navigate('/app/inbox')}
        >
          <Bell className="h-4 w-4" />
          {unreadCount != null && unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 shadow-sm" />
          )}
        </button>

        <div className="mx-1 h-5 w-px bg-border/60" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors group">
              <div className="relative">
                {user && <UserAvatar name={user.name} src={user.avatarUrl} size="xs" />}
                <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              {user && (
                <div className="hidden sm:block text-left">
                  <p className="text-[13px] font-semibold text-foreground leading-tight">{user.name}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {user && (
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13px]" onClick={() => navigate('/app/settings')}>
              Profile settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[13px]" onClick={() => navigate('/app/workspace/settings')}>
              Workspace settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13px] text-destructive focus:text-destructive" onClick={handleLogout}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

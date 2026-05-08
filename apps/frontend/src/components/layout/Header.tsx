import { Bell, Moon, Sun, Monitor } from 'lucide-react';
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
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout regardless
    } finally {
      clearAccessToken();
      logout();
      navigate('/login');
      toast.success('Signed out');
    }
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="flex h-11 items-center justify-end gap-1 border-b border-border/60 bg-background px-3">
      {/* Theme */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-75">
            <ThemeIcon className="h-3.5 w-3.5" />
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
        className="relative flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-75"
        onClick={() => navigate('/app/inbox')}
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount != null && unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-primary" />
        )}
      </button>

      {/* Divider */}
      <div className="mx-1 h-4 w-px bg-border/60" />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 rounded px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-75">
            {user && <UserAvatar name={user.name} src={user.avatarUrl} size="xs" />}
            {user && (
              <span className="text-[13px] font-medium text-foreground hidden sm:block">{user.name}</span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {user && (
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
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
    </header>
  );
}

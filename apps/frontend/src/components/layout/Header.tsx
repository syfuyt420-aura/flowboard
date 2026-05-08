import { Bell, Moon, Sun, Monitor } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
      toast.success('Signed out successfully');
    }
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b bg-card/80 backdrop-blur-sm px-4">
      {/* Theme Toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
            <ThemeIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(['light', 'dark', 'system'] as const).map((t) => (
            <DropdownMenuItem
              key={t}
              onClick={() => setTheme(t)}
              className={theme === t ? 'bg-accent' : ''}
            >
              {t === 'light' ? <Sun className="mr-2 h-4 w-4" /> : t === 'dark' ? <Moon className="mr-2 h-4 w-4" /> : <Monitor className="mr-2 h-4 w-4" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="relative text-muted-foreground"
        onClick={() => navigate('/app/inbox')}
      >
        <Bell className="h-4 w-4" />
        {unreadCount != null && unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-4 min-w-4 px-1 py-0 text-[10px]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-accent">
            {user && <UserAvatar name={user.name} src={user.avatarUrl} size="sm" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {user && (
            <div className="px-2 py-1.5">
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/app/settings')}>
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/app/workspace/settings')}>
            Workspace Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

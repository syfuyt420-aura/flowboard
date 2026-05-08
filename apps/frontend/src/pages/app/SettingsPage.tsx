import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { User, Bell, Moon, Sun, Monitor, Shield, KeyRound, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
});

type ProfileValues = z.infer<typeof profileSchema>;

type SettingsSection = 'profile' | 'notifications' | 'appearance' | 'security';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('profile');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileValues) => {
      const resp = await api.patch('/users/me', data);
      return resp.data.data;
    },
    onSuccess: (updated) => {
      if (user) setUser({ ...user, ...updated });
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r p-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-2">Settings</p>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              section === id
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}

        <div className="pt-4 border-t mt-4">
          <button
            onClick={() => { logout(); window.location.href = '/login'; }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
        {section === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold">Profile</h2>
              <p className="text-sm text-muted-foreground mt-1">Update your personal information</p>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <UserAvatar name={user?.name ?? 'User'} src={user?.avatarUrl} size="xl" />
              <div>
                <Button variant="outline" size="sm">Change photo</Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP. Max 5MB.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit((d) => profileMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Full name</label>
                <Input {...register('name')} placeholder="Your name" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input {...register('email')} type="email" placeholder="you@example.com" />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <Button
                type="submit"
                variant="brand"
                disabled={!isDirty || profileMutation.isPending}
              >
                Save changes
              </Button>
            </form>
          </motion.div>
        )}

        {section === 'appearance' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold">Appearance</h2>
              <p className="text-sm text-muted-foreground mt-1">Customize how FlowBoard looks</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium',
                      theme === value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                        : 'border-border hover:border-muted-foreground/40 text-muted-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {section === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold">Notifications</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose what you want to be notified about</p>
            </div>
            {[
              { label: 'Task assigned to you', description: 'When someone assigns a task to you' },
              { label: 'Comments on your tasks', description: 'When someone comments on a task you own' },
              { label: 'Mentions', description: 'When someone @mentions you' },
              { label: 'Due date reminders', description: '24 hours before a task is due' },
              { label: 'Project invitations', description: 'When you\'re invited to a project' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <button
                  className="h-6 w-11 rounded-full bg-brand-500 relative transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  role="switch"
                >
                  <span className="block h-5 w-5 rounded-full bg-white shadow-sm translate-x-5 transition-transform" />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {section === 'security' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold">Security</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage your account security</p>
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 flex items-center justify-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Change password</p>
                  <p className="text-xs text-muted-foreground">Update your account password</p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">Change</Button>
              </div>
            </div>

            <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button variant="destructive" size="sm">Delete account</Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

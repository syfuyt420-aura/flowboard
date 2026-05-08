import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, LayoutDashboard, Inbox, ArrowLeft, ShieldCheck, Users } from 'lucide-react';
import { loginSchema } from '@flowboard/shared';
import type { z } from 'zod';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { UserRole } from '@flowboard/shared';

type LoginFormValues = z.input<typeof loginSchema>;
type Portal = 'admin' | 'member' | null;

const ADMIN_ROLES: UserRole[] = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];

/* ── Portal selection ── */
function PortalSelect({ onSelect }: { onSelect: (p: Portal) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose how you want to log in</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onSelect('admin')}
          className="group flex flex-col items-start gap-3 rounded-lg border-2 border-border p-5 hover:border-primary hover:bg-primary/5 transition-all text-left"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Admin</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Manage projects, assign tasks & track team progress
            </p>
          </div>
        </button>

        <button
          onClick={() => onSelect('member')}
          className="group flex flex-col items-start gap-3 rounded-lg border-2 border-border p-5 hover:border-primary hover:bg-primary/5 transition-all text-left"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Member</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              View assigned tasks, post updates & report progress
            </p>
          </div>
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-primary hover:underline underline-offset-2">
          Sign up free
        </Link>
      </p>
    </div>
  );
}

/* ── Login form ── */
function LoginForm({ portal, onBack }: { portal: Portal; onBack: () => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore(s => s.setUser);
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: searchParams.get('email') ?? '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const { user, workspaceRole } = await authService.login({ ...values, rememberMe });
      setUser(user, workspaceRole);
      queryClient.setQueryData(QUERY_KEYS.auth.me, user);

      const actuallyAdmin = ADMIN_ROLES.includes(workspaceRole);

      if (portal === 'admin' && !actuallyAdmin) {
        toast.error("You don't have admin access. Redirecting to your task panel.");
        navigate('/app/my-tasks');
        return;
      }
      if (portal === 'member' && actuallyAdmin) {
        // Admins can still use member view if they want
        toast.success(`Logged in as ${user.name.split(' ')[0]}`);
        navigate('/app/my-tasks');
        return;
      }

      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(actuallyAdmin ? '/app/dashboard' : '/app/my-tasks');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? 'Invalid email or password');
    }
  };

  const isAdmin = portal === 'admin';

  return (
    <div className="space-y-5">
      {/* Header with portal indicator */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change portal
        </button>

        <div className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3',
          isAdmin
            ? 'bg-primary/10 text-primary'
            : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
        )}>
          {isAdmin
            ? <><ShieldCheck className="h-3.5 w-3.5" /> Admin Portal</>
            : <><Users className="h-3.5 w-3.5" /> Member Portal</>
          }
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isAdmin
            ? 'Access your workspace dashboard and tools'
            : 'See your tasks and post progress updates'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="email">Email address</label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            {...register('email')}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline underline-offset-2">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
              className={cn('pr-10', errors.password ? 'border-destructive' : '')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm text-muted-foreground">Remember me for 30 days</span>
        </label>

        <Button type="submit" variant="brand" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Logging in…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {isAdmin
                ? <><LayoutDashboard className="h-4 w-4" /> Log in as Admin</>
                : <><Inbox className="h-4 w-4" /> Log in as Member</>
              }
            </span>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-primary hover:underline underline-offset-2">
          Sign up free
        </Link>
      </p>
    </div>
  );
}

/* ── Main export ── */
export default function LoginPage() {
  const [portal, setPortal] = useState<Portal>(null);

  if (!portal) {
    return <PortalSelect onSelect={setPortal} />;
  }
  return <LoginForm portal={portal} onBack={() => setPortal(null)} />;
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, ShieldCheck, Users, Check, X } from 'lucide-react';
import { loginSchema, signupSchema } from '@flowboard/shared';
import type { SignupInput, UserRole } from '@flowboard/shared';
import type { z } from 'zod';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { api, setAccessToken } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type LoginValues = z.input<typeof loginSchema>;
type Step = 'role' | 'admin-choice' | 'admin-signup' | 'admin-login' | 'member-login';
const ADMIN_ROLES: UserRole[] = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];

const slide = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

/* ─── Password strength ─────────────────────────────────── */
function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];
  const score = rules.filter(r => r.ok).length;
  const bar = score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-orange-400' : score === 3 ? 'bg-yellow-400' : 'bg-green-500';
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  if (!password) return null;
  return (
    <div className="space-y-1.5 mt-1.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1,2,3,4].map(i => <div key={i} className={cn('h-1 flex-1 rounded-full', i <= score ? bar : 'bg-muted')} />)}
        </div>
        <span className={cn('text-xs font-medium w-10 text-right', score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-500' : score === 3 ? 'text-yellow-500' : 'text-green-600')}>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-0.5">
        {rules.map(r => (
          <p key={r.label} className={cn('flex items-center gap-1 text-[11px]', r.ok ? 'text-green-600' : 'text-muted-foreground')}>
            {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-30" />}{r.label}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ─── Back button ─────────────────────────────────────────── */
function BackBtn({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
      <ArrowLeft className="h-3.5 w-3.5" />{label}
    </button>
  );
}

/* ─── Portal badge ────────────────────────────────────────── */
function PortalBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3', isAdmin ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300')}>
      {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
      {isAdmin ? 'Admin Portal' : 'Member Portal'}
    </span>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore(s => s.setUser);
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('role');
  const [showPw, setShowPw] = useState(false);
  const [pwValue, setPwValue] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  /* Login form */
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: searchParams.get('email') ?? '', password: '' },
  });

  /* Signup form */
  const signupForm = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  /* ── Handlers ── */
  async function handleLogin(values: LoginValues, portal: 'admin' | 'member') {
    try {
      const { user, workspaceRole } = await authService.login({ ...values, rememberMe });
      setUser(user, workspaceRole);
      queryClient.setQueryData(QUERY_KEYS.auth.me, user);
      const actuallyAdmin = ADMIN_ROLES.includes(workspaceRole);
      if (portal === 'admin' && !actuallyAdmin) {
        toast.error("You don't have admin access. Opening member panel.");
        navigate('/app/my-tasks');
      } else {
        toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
        navigate(actuallyAdmin && portal === 'admin' ? '/app/dashboard' : '/app/my-tasks');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? 'Invalid email or password');
    }
  }

  async function handleSignup(values: SignupInput) {
    try {
      const { data } = await api.post<{ data: { user: Parameters<typeof setUser>[0]; workspaceRole: UserRole; accessToken: string } }>('/auth/signup', values);
      setAccessToken(data.data.accessToken);
      setUser(data.data.user, data.data.workspaceRole ?? 'OWNER');
      queryClient.setQueryData(QUERY_KEYS.auth.me, data.data.user);
      toast.success(`Welcome to FlowBoard, ${data.data.user?.name?.split(' ')[0]}! 🎉`);
      navigate('/app/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? 'Failed to create account');
    }
  }

  /* ── Steps ── */
  const steps: Record<Step, React.ReactNode> = {

    /* Step 1: Choose role */
    'role': (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to FlowBoard</h1>
          <p className="text-sm text-muted-foreground mt-1">Who are you? Choose your role to continue.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStep('admin-choice')}
            className="group flex flex-col items-start gap-4 rounded-xl border-2 border-border p-5 hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Admin</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Create & manage workspace, projects and team</p>
            </div>
          </button>

          <button
            onClick={() => setStep('member-login')}
            className="group flex flex-col items-start gap-4 rounded-xl border-2 border-border p-5 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all text-left"
          >
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">Member</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">View assigned tasks, report progress & updates</p>
            </div>
          </button>
        </div>
      </div>
    ),

    /* Step 2a: Admin — create or login */
    'admin-choice': (
      <div className="space-y-6">
        <div>
          <BackBtn onClick={() => setStep('role')} label="Change role" />
          <PortalBadge isAdmin />
          <h1 className="text-2xl font-semibold tracking-tight">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">How would you like to continue?</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStep('admin-signup')}
            className="flex flex-col items-start gap-3 rounded-xl border-2 border-border p-5 hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <p className="text-2xl">🚀</p>
            <div>
              <p className="font-semibold text-sm">Create Account</p>
              <p className="text-xs text-muted-foreground mt-1">New to FlowBoard? Set up your workspace</p>
            </div>
          </button>
          <button
            onClick={() => setStep('admin-login')}
            className="flex flex-col items-start gap-3 rounded-xl border-2 border-border p-5 hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <p className="text-2xl">👋</p>
            <div>
              <p className="font-semibold text-sm">Log In</p>
              <p className="text-xs text-muted-foreground mt-1">Already have an account? Welcome back</p>
            </div>
          </button>
        </div>
      </div>
    ),

    /* Step 3a: Admin Signup */
    'admin-signup': (
      <div className="space-y-5">
        <div>
          <BackBtn onClick={() => setStep('admin-choice')} />
          <PortalBadge isAdmin />
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your admin workspace — free forever</p>
        </div>
        <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name</label>
            <Input type="text" placeholder="Your full name" autoFocus autoComplete="name" {...signupForm.register('name')} className={signupForm.formState.errors.name ? 'border-destructive' : ''} />
            {signupForm.formState.errors.name && <p className="text-xs text-destructive">{signupForm.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email address</label>
            <Input type="email" placeholder="you@example.com" autoComplete="email" {...signupForm.register('email')} className={signupForm.formState.errors.email ? 'border-destructive' : ''} />
            {signupForm.formState.errors.email && <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} placeholder="Create a strong password" autoComplete="new-password"
                {...signupForm.register('password', { onChange: e => setPwValue(e.target.value) })}
                className={cn('pr-10', signupForm.formState.errors.password ? 'border-destructive' : '')} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {signupForm.formState.errors.password && <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>}
            <PasswordStrength password={pwValue} />
          </div>
          <Button type="submit" variant="brand" className="w-full" disabled={signupForm.formState.isSubmitting}>
            {signupForm.formState.isSubmitting
              ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating account…</span>
              : 'Create admin account'}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <button onClick={() => setStep('admin-login')} className="font-semibold text-primary hover:underline underline-offset-2">Log in</button>
        </p>
      </div>
    ),

    /* Step 3b: Admin Login */
    'admin-login': (
      <div className="space-y-5">
        <div>
          <BackBtn onClick={() => setStep('admin-choice')} />
          <PortalBadge isAdmin />
          <h1 className="text-2xl font-semibold tracking-tight">Admin log in</h1>
          <p className="text-sm text-muted-foreground mt-1">Access your workspace dashboard</p>
        </div>
        <form onSubmit={loginForm.handleSubmit(v => handleLogin(v, 'admin'))} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email address</label>
            <Input type="email" placeholder="you@example.com" autoFocus autoComplete="email" {...loginForm.register('email')} className={loginForm.formState.errors.email ? 'border-destructive' : ''} />
            {loginForm.formState.errors.email && <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Password</label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline underline-offset-2">Forgot password?</Link>
            </div>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                {...loginForm.register('password')} className={cn('pr-10', loginForm.formState.errors.password ? 'border-destructive' : '')} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {loginForm.formState.errors.password && <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
            <span className="text-sm text-muted-foreground">Remember me for 30 days</span>
          </label>
          <Button type="submit" variant="brand" className="w-full" disabled={loginForm.formState.isSubmitting}>
            {loginForm.formState.isSubmitting
              ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Logging in…</span>
              : 'Log in as Admin'}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          New here?{' '}
          <button onClick={() => setStep('admin-signup')} className="font-semibold text-primary hover:underline underline-offset-2">Create admin account</button>
        </p>
      </div>
    ),

    /* Step 2b + 3b: Member Login (no signup) */
    'member-login': (
      <div className="space-y-5">
        <div>
          <BackBtn onClick={() => setStep('role')} label="Change role" />
          <PortalBadge isAdmin={false} />
          <h1 className="text-2xl font-semibold tracking-tight">Member log in</h1>
          <p className="text-sm text-muted-foreground mt-1">Access your tasks and post progress updates</p>
        </div>
        <form onSubmit={loginForm.handleSubmit(v => handleLogin(v, 'member'))} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email address</label>
            <Input type="email" placeholder="you@example.com" autoFocus autoComplete="email" {...loginForm.register('email')} className={loginForm.formState.errors.email ? 'border-destructive' : ''} />
            {loginForm.formState.errors.email && <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Password</label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline underline-offset-2">Forgot password?</Link>
            </div>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                {...loginForm.register('password')} className={cn('pr-10', loginForm.formState.errors.password ? 'border-destructive' : '')} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {loginForm.formState.errors.password && <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
            <span className="text-sm text-muted-foreground">Remember me</span>
          </label>
          <Button type="submit" variant="brand" className="w-full" disabled={loginForm.formState.isSubmitting}>
            {loginForm.formState.isSubmitting
              ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Logging in…</span>
              : 'Log in as Member'}
          </Button>
        </form>

        {/* No signup for members */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center space-y-1">
          <p className="text-xs font-medium text-foreground">Don't have an account?</p>
          <p className="text-xs text-muted-foreground">
            Members are added by their admin. Contact your workspace admin to get access.
          </p>
        </div>
      </div>
    ),
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        variants={slide}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.18, ease: 'easeInOut' }}
      >
        {steps[step]}
      </motion.div>
    </AnimatePresence>
  );
}

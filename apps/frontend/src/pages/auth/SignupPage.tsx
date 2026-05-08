import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { signupSchema, type SignupInput } from '@flowboard/shared';
import { useAuthStore } from '@/stores/authStore';
import { api, setAccessToken } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const color = score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-orange-400' : score === 3 ? 'bg-yellow-400' : 'bg-green-500';
  const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i <= score ? color : 'bg-muted')} />
          ))}
        </div>
        <span className={cn('text-xs font-medium', score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-500' : score === 3 ? 'text-yellow-500' : 'text-green-600')}>
          {label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map(c => (
          <div key={c.label} className={cn('flex items-center gap-1 text-[11px]', c.pass ? 'text-green-600' : 'text-muted-foreground')}>
            {c.pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-40" />}
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore(s => s.setUser);
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupInput) => {
    try {
      // Signup now returns tokens directly — auto-login
      const { data } = await api.post<{ data: { user: Parameters<typeof setUser>[0]; workspaceRole: import('@flowboard/shared').UserRole; accessToken: string } }>(
        '/auth/signup', values
      );
      setAccessToken(data.data.accessToken);
      setUser(data.data.user, data.data.workspaceRole ?? 'MEMBER');
      queryClient.setQueryData(QUERY_KEYS.auth.me, data.data.user);
      toast.success(`Welcome to FlowBoard, ${data.data.user?.name?.split(' ')[0] ?? 'there'}! 🎉`);
      navigate('/app/my-tasks');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? 'Failed to create account');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">Free forever. No credit card required.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="name">Full name</label>
          <Input
            id="name"
            type="text"
            placeholder="Syfulla Shaik"
            autoComplete="name"
            autoFocus
            {...register('name')}
            className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="email">Email address</label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register('email')}
            className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="password">Password</label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              autoComplete="new-password"
              {...register('password', {
                onChange: e => setPassword(e.target.value),
              })}
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
          <PasswordStrength password={password} />
        </div>

        <Button type="submit" variant="brand" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Creating account…
            </span>
          ) : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By signing up you agree to our{' '}
        <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</Link>
        {' '}and{' '}
        <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-2">
          Log in
        </Link>
      </p>
    </div>
  );
}

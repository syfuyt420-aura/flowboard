import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@flowboard/shared';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordInput) => {
    try {
      await authService.forgotPassword(values.email);
      setSent(true);
    } catch {
      toast.error('Failed to send reset email. Please try again.');
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-950">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a password reset link to{' '}
            <span className="font-medium text-foreground">{getValues('email')}</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Didn't receive it?{' '}
          <button
            onClick={() => setSent(false)}
            className="text-brand-500 underline hover:text-brand-600"
          >
            Try again
          </button>
        </p>
        <Link
          to="/login"
          className="block text-sm font-medium text-brand-500 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-display font-bold">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="email">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            {...register('email')}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <Button type="submit" variant="brand" className="w-full" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <Link
        to="/login"
        className="block text-center text-sm font-medium text-brand-500 hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { authService } from '@/services/auth.service';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    authService
      .verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-sm">
        {state === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-500" />
            <p className="text-muted-foreground">Verifying your email…</p>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Email verified!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your account is ready. Sign in to get started.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Sign in
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Verification failed</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This link is invalid or has expired.
              </p>
            </div>
            <Link to="/login" className="text-sm font-medium text-brand-500 hover:underline">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

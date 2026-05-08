import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [invite, setInvite] = useState<{ workspaceName: string; role: string } | null>(null);

  useEffect(() => {
    if (!token) { setState('error'); return; }
    api.get(`/workspaces/invites/${token}`)
      .then(({ data }) => { setInvite(data.data); setState('ready'); })
      .catch(() => setState('error'));
  }, [token]);

  const accept = async () => {
    if (!isAuthenticated) { navigate(`/signup?invite=${token}`); return; }
    try {
      await api.post(`/workspaces/invites/${token}/accept`);
      setState('success');
      setTimeout(() => navigate('/app/dashboard'), 2000);
    } catch { setState('error'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-sm">
        {state === 'loading' && <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" />}
        {state === 'ready' && invite && (
          <>
            <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-2xl">F</div>
            <div>
              <h1 className="text-xl font-display font-bold">You're invited!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Join <strong>{invite.workspaceName}</strong> as <strong>{invite.role}</strong>
              </p>
            </div>
            <Button variant="brand" className="w-full" onClick={accept}>Accept Invitation</Button>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <p className="font-semibold">Joined successfully! Redirecting…</p>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="font-semibold">Invitation is invalid or expired.</p>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users, UserPlus, Trash2, Mail, Shield, Crown,
  X, Eye, EyeOff, Copy, Check, Search, AlertTriangle,
  KeyRound, UserCheck,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { useUIStore } from '@/stores/uiStore';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/shared/Skeleton';
import { cn } from '@/lib/utils';

/* ─── Types ──────────────────────────────────────────────── */
interface OrgMember {
  role: string;
  joinedAt: string;
  userId: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null; status: string };
  taskStats?: { assigned: number; done: number; inProgress: number };
}

const ROLE_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OWNER: { label: 'Owner', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: Crown },
  ADMIN: { label: 'Admin', color: 'bg-primary/10 text-primary', icon: Shield },
  MEMBER: { label: 'Member', color: 'bg-muted text-muted-foreground', icon: Users },
};

const STATUS_DOT: Record<string, string> = {
  ONLINE: 'bg-green-500', AWAY: 'bg-amber-400', OFFLINE: 'bg-slate-300',
};

/* ─── Add Member Modal ───────────────────────────────────── */
function AddMemberModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ name: string; email: string; password: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspaceId}/members/create-account`, { name: name.trim(), email: email.trim().toLowerCase(), password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', workspaceId] });
      setCreatedCreds({ name: name.trim(), email: email.trim().toLowerCase(), password });
      toast.success(`Account created for ${name.split(' ')[0]}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? 'Failed to create member account');
    },
  });

  function copyCredentials() {
    navigator.clipboard.writeText(`Email: ${createdCreds?.email}\nPassword: ${createdCreds?.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-xl border shadow-xl w-full max-w-md"
      >
        {!createdCreds ? (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-sm font-semibold">Add Member</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Create a login account for your team member</p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full name</label>
                <Input placeholder="e.g. Rahul Sharma" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Email address
                </label>
                <Input type="email" placeholder="rahul@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Member will log in with this email</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5" /> Set password
                </label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Set a login password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Share this password with the member so they can log in</p>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20 rounded-b-xl">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                variant="brand"
                size="sm"
                disabled={!name.trim() || !email.trim() || password.length < 6 || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending
                  ? <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating…</span>
                  : <span className="flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" />Create Account</span>
                }
              </Button>
            </div>
          </>
        ) : (
          /* Success — show credentials to copy */
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <UserCheck className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">Account Created!</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Share these login credentials with <span className="font-medium text-foreground">{createdCreds.name}</span>
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{createdCreds.email}</p>
              </div>
              <div className="border-t border-border/50 pt-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Password</p>
                <p className="text-sm font-medium font-mono">{createdCreds.password}</p>
              </div>
            </div>

            <button
              onClick={copyCredentials}
              className={cn(
                'flex items-center justify-center gap-2 w-full rounded-lg border py-2.5 text-sm font-medium transition-all',
                copied ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:text-green-300' : 'hover:bg-accent border-border'
              )}
            >
              {copied ? <><Check className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />Copy Credentials</>}
            </button>

            <p className="text-[11px] text-muted-foreground text-center">
              The member should go to <span className="font-medium">Member Portal → Log in</span> and use these credentials
            </p>

            <Button variant="brand" className="w-full" onClick={onClose}>Done</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Remove confirm ─────────────────────────────────────── */
function RemoveConfirm({ member, workspaceId, onClose }: { member: OrgMember; workspaceId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.delete(`/workspaces/${workspaceId}/members/${member.userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', workspaceId] });
      toast.success(`${member.user.name} removed`);
      onClose();
    },
    onError: () => toast.error('Failed to remove member'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.12 }}
        className="bg-card rounded-xl border shadow-xl w-full max-w-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-sm">Remove member?</p>
            <p className="text-xs text-muted-foreground mt-0.5">This will revoke their workspace access</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{member.user.name}</span> ({member.user.email}) will no longer be able to log in or view assigned tasks.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Member Row ─────────────────────────────────────────── */
function MemberRow({ member, index, onRemove }: { member: OrgMember; index: number; onRemove: () => void }) {
  const roleCfg = ROLE_CFG[member.role] ?? ROLE_CFG.MEMBER;
  const RoleIcon = roleCfg.icon;
  const isOwnerOrAdmin = member.role === 'OWNER' || member.role === 'ADMIN';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
      className="flex items-center gap-4 px-5 py-3.5 border-b last:border-0 hover:bg-accent/40 transition-colors group"
    >
      <div className="relative flex-shrink-0">
        <UserAvatar name={member.user.name} src={member.user.avatarUrl} size="md" />
        <span className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card', STATUS_DOT[member.user.status] ?? STATUS_DOT.OFFLINE)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold truncate">{member.user.name}</p>
          <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', roleCfg.color)}>
            <RoleIcon className="h-3 w-3" />{roleCfg.label}
          </span>
          {member.user.status === 'ONLINE' && (
            <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Online
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Mail className="h-3 w-3 flex-shrink-0" />
          {member.user.email}
        </p>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        {member.taskStats && (
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary/60" />{member.taskStats.assigned} tasks
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />{member.taskStats.done} done
            </span>
          </div>
        )}
        <span className="text-xs text-muted-foreground hidden md:block">
          Added {new Date(member.joinedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>

        {!isOwnerOrAdmin && (
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded"
          >
            <Trash2 className="h-3.5 w-3.5" />Remove
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function OrgMembersPage() {
  const workspaceId = useUIStore(s => s.activeWorkspaceId);
  const [showAdd, setShowAdd] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<OrgMember | null>(null);
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading } = useQuery<OrgMember[]>({
    queryKey: ['org-members', workspaceId],
    queryFn: async () => {
      const { data } = await api.get<{ data: OrgMember[] }>(`/workspaces/${workspaceId}/members`);
      return data.data;
    },
    enabled: !!workspaceId,
    refetchInterval: 20000,
  });

  const filtered = members.filter(m =>
    m.user.name.toLowerCase().includes(search.toLowerCase()) ||
    m.user.email.toLowerCase().includes(search.toLowerCase())
  );

  const regularMembers = filtered.filter(m => m.role === 'MEMBER' || m.role === 'VIEWER');
  const admins = filtered.filter(m => m.role === 'OWNER' || m.role === 'ADMIN');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b flex-shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              Members of Organization
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {members.length} total · {regularMembers.length} team members · Admins can add or remove anytime
            </p>
          </div>
          <Button variant="brand" size="sm" onClick={() => setShowAdd(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Member
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-foreground">No members yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-xs">
              Add your first team member. Set their email and password so they can log in.
            </p>
            <Button variant="brand" onClick={() => setShowAdd(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />Add First Member
            </Button>
          </div>
        ) : (
          <div>
            {/* Team Members */}
            {regularMembers.length > 0 && (
              <div>
                <div className="px-5 py-2.5 bg-muted/30 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team Members ({regularMembers.length})</p>
                </div>
                {regularMembers.map((m, i) => (
                  <MemberRow key={m.userId} member={m} index={i} onRemove={() => setRemoveTarget(m)} />
                ))}
              </div>
            )}

            {/* Admins */}
            {admins.length > 0 && (
              <div>
                <div className="px-5 py-2.5 bg-muted/30 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admins ({admins.length})</p>
                </div>
                {admins.map((m, i) => (
                  <MemberRow key={m.userId} member={m} index={i} onRemove={() => setRemoveTarget(m)} />
                ))}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No members match "{search}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAdd && workspaceId && (
          <AddMemberModal workspaceId={workspaceId} onClose={() => setShowAdd(false)} />
        )}
        {removeTarget && workspaceId && (
          <RemoveConfirm member={removeTarget} workspaceId={workspaceId} onClose={() => setRemoveTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

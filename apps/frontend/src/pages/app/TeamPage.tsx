import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users, Mail, Shield, Crown, UserPlus, Search,
  CheckCircle2, PlayCircle, ClipboardList, X,
  Calendar, Send,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { useUIStore } from '@/stores/uiStore';
import { projectsService } from '@/services/projects.service';
import { tasksService } from '@/services/tasks.service';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/shared/Skeleton';
import { cn } from '@/lib/utils';
import type { Project } from '@flowboard/shared';

/* ─── Types ──────────────────────────────────────────────── */
interface MemberStats { assigned: number; done: number; inProgress: number }
interface WorkspaceMember {
  role: string;
  joinedAt: string;
  userId: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null; status: string; createdAt?: string; lastLoginAt?: string | null };
  taskStats: MemberStats;
}

/* ─── Config ─────────────────────────────────────────────── */
const ROLE_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OWNER: { label: 'Owner', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: Crown },
  ADMIN: { label: 'Admin', color: 'bg-primary/10 text-primary', icon: Shield },
  MEMBER: { label: 'Member', color: 'bg-muted text-muted-foreground', icon: Users },
  VIEWER: { label: 'Viewer', color: 'bg-muted text-muted-foreground', icon: Users },
};
const STATUS_DOT: Record<string, string> = {
  ONLINE: 'bg-green-500', AWAY: 'bg-amber-400', BUSY: 'bg-red-500', OFFLINE: 'bg-slate-300',
};
const URGENCY_OPTIONS = [
  { value: 'P3', label: '🟢 Low', color: 'text-slate-500' },
  { value: 'P2', label: '🟡 Medium', color: 'text-yellow-500' },
  { value: 'P1', label: '🟠 High', color: 'text-orange-500' },
  { value: 'P0', label: '🔴 Critical', color: 'text-red-600' },
];

/* ─── Quick Assign Modal ─────────────────────────────────── */
function QuickAssignModal({
  member,
  projects,
  onClose,
}: {
  member: WorkspaceMember;
  projects: Project[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const workspaceId = useUIStore(s => s.activeWorkspaceId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('P2');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');

  const mutation = useMutation({
    mutationFn: () => tasksService.create({
      title: title.trim(),
      description: description.trim() || undefined,
      projectId,
      priority: priority as 'P0' | 'P1' | 'P2' | 'P3',
      status: 'TODO',
      assigneeIds: [member.userId],
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      labelIds: [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] });
      toast.success(`Task assigned to ${member.user.name.split(' ')[0]}`);
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? 'Failed to assign task');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.16 }}
        className="bg-card rounded-xl border shadow-xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="relative">
              <UserAvatar name={member.user.name} src={member.user.avatarUrl} size="md" />
              <span className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card', STATUS_DOT[member.user.status] ?? STATUS_DOT.OFFLINE)} />
            </div>
            <div>
              <p className="text-sm font-semibold">{member.user.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />{member.user.email}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assign a Task</p>

          {/* Project */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full h-8 text-sm rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
            >
              {projects.length === 0 && <option value="">No projects yet</option>}
              {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
          </div>

          {/* Task title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">What needs to be done?</label>
            <Input
              placeholder="e.g. Design the landing page"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Textarea
              placeholder="Add details, requirements, or context…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Priority + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full h-8 text-sm rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
              >
                {URGENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full h-8 text-sm rounded border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20 rounded-b-xl">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="brand"
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || !projectId || mutation.isPending}
          >
            {mutation.isPending
              ? <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Assigning…</span>
              : <span className="flex items-center gap-1.5"><Send className="h-3.5 w-3.5" />Assign Task</span>
            }
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Member Card ────────────────────────────────────────── */
function MemberCard({ member, index, onAssign }: { member: WorkspaceMember; index: number; onAssign: (m: WorkspaceMember) => void }) {
  const roleCfg = ROLE_CFG[member.role] ?? ROLE_CFG.MEMBER;
  const RoleIcon = roleCfg.icon;
  const isAdmin = member.role === 'OWNER' || member.role === 'ADMIN';
  const completion = member.taskStats.assigned > 0
    ? Math.round((member.taskStats.done / member.taskStats.assigned) * 100)
    : 0;
  const lastLogin = member.user.lastLoginAt
    ? new Date(member.user.lastLoginAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const joinedDate = new Date(member.joinedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="rounded-xl border bg-card p-5 hover:shadow-sm transition-shadow flex flex-col gap-4"
    >
      {/* Top: avatar + name + role */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <UserAvatar name={member.user.name} src={member.user.avatarUrl} size="lg" />
          <span className={cn('absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card', STATUS_DOT[member.user.status] ?? STATUS_DOT.OFFLINE)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{member.user.name}</p>
            <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', roleCfg.color)}>
              <RoleIcon className="h-3 w-3" />{roleCfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
            <Mail className="h-3 w-3 flex-shrink-0" />{member.user.email}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
            <span>Joined {joinedDate}</span>
            {lastLogin && <span>· Last login {lastLogin}</span>}
          </div>
        </div>
      </div>

      {/* Task stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/50 py-2 px-1">
          <p className="text-lg font-bold text-foreground">{member.taskStats.assigned}</p>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <ClipboardList className="h-3 w-3" />Assigned
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 py-2 px-1">
          <p className="text-lg font-bold text-amber-600">{member.taskStats.inProgress}</p>
          <p className="text-[10px] text-amber-600/80 flex items-center justify-center gap-1">
            <PlayCircle className="h-3 w-3" />In Progress
          </p>
        </div>
        <div className="rounded-lg bg-green-50 dark:bg-green-950/40 py-2 px-1">
          <p className="text-lg font-bold text-green-600">{member.taskStats.done}</p>
          <p className="text-[10px] text-green-600/80 flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3" />Done
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {member.taskStats.assigned > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Completion rate</span>
            <span className="font-semibold">{completion}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', completion >= 80 ? 'bg-green-500' : completion >= 40 ? 'bg-amber-400' : 'bg-red-400')}
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      )}

      {/* Assign Task button (not for admins/owners) */}
      {!isAdmin && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onAssign(member)}
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Assign Task
        </Button>
      )}
    </motion.div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function TeamPage() {
  const navigate = useNavigate();
  const workspaceId = useUIStore(s => s.activeWorkspaceId);
  const [search, setSearch] = useState('');
  const [assignTarget, setAssignTarget] = useState<WorkspaceMember | null>(null);

  const { data: members = [], isLoading } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspaces', workspaceId, 'members'],
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`);
      return data.data;
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await projectsService.list(workspaceId);
      return res.data;
    },
    enabled: !!workspaceId,
  });
  const projects = projectsData ?? [];

  const filtered = members.filter(m =>
    m.user.name.toLowerCase().includes(search.toLowerCase()) ||
    m.user.email.toLowerCase().includes(search.toLowerCase())
  );

  const regularMembers = filtered.filter(m => m.role === 'MEMBER' || m.role === 'VIEWER');
  const adminMembers = filtered.filter(m => m.role === 'OWNER' || m.role === 'ADMIN' || m.role === 'PROJECT_MANAGER');

  const totalTasks = members.reduce((acc, m) => acc + m.taskStats.assigned, 0);
  const totalDone = members.reduce((acc, m) => acc + m.taskStats.done, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              Team Members
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {members.length} member{members.length !== 1 ? 's' : ''} · {totalTasks} tasks assigned · {totalDone} completed
            </p>
          </div>
          <Button variant="brand" size="sm" onClick={() => navigate('/app/workspace/settings')}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Invite Member
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="h-14 w-14 text-muted-foreground/30 mb-4" />
            <p className="font-semibold">No members yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Invite people to your workspace to get started</p>
            <Button variant="brand" onClick={() => navigate('/app/workspace/settings')}>
              <UserPlus className="h-4 w-4 mr-1.5" />Invite Member
            </Button>
          </div>
        ) : (
          <>
            {/* Team members (MEMBER/VIEWER) */}
            {regularMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Team Members ({regularMembers.length})
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regularMembers.map((m, i) => (
                    <MemberCard key={m.user.id} member={m} index={i} onAssign={setAssignTarget} />
                  ))}
                </div>
              </div>
            )}

            {/* Admins / Owners */}
            {adminMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Admins ({adminMembers.length})
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {adminMembers.map((m, i) => (
                    <MemberCard key={m.user.id} member={m} index={i} onAssign={setAssignTarget} />
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No members match "{search}"</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Assign Modal */}
      <AnimatePresence>
        {assignTarget && (
          <QuickAssignModal
            member={assignTarget}
            projects={projects}
            onClose={() => setAssignTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

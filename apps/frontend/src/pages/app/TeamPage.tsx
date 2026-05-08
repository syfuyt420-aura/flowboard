import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Mail, Shield, Crown, MoreHorizontal, UserPlus } from 'lucide-react';
import { api } from '@/lib/axios';
import { useUIStore } from '@/stores/uiStore';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/shared/Skeleton';
import { cn } from '@/lib/utils';

interface WorkspaceMember {
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    status: string;
  };
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OWNER: { label: 'Owner', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: Crown },
  ADMIN: { label: 'Admin', color: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300', icon: Shield },
  MEMBER: { label: 'Member', color: 'bg-muted text-muted-foreground', icon: Users },
  VIEWER: { label: 'Viewer', color: 'bg-muted text-muted-foreground', icon: Users },
};

const STATUS_COLORS: Record<string, string> = {
  ONLINE: 'bg-green-500',
  AWAY: 'bg-amber-400',
  BUSY: 'bg-red-500',
  OFFLINE: 'bg-muted-foreground/40',
};

function MemberCard({ member, index }: { member: WorkspaceMember; index: number }) {
  const roleCfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.MEMBER;
  const RoleIcon = roleCfg.icon;

  return (
    <motion.div
      className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar name={member.user.name} src={member.user.avatarUrl} size="md" />
        <span
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
            STATUS_COLORS[member.user.status] ?? STATUS_COLORS.OFFLINE
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-medium text-sm truncate">{member.user.name}</p>
          <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', roleCfg.color)}>
            <RoleIcon className="h-3 w-3" />
            {roleCfg.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {member.user.email}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:block">
          Joined {new Date(member.joinedAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
        </span>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function TeamPage() {
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  const { data: members = [], isLoading } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspaces', workspaceId, 'members'],
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkspaceMember[] }>(
        `/workspaces/${workspaceId}/members`
      );
      return data.data;
    },
    enabled: !!workspaceId,
  });

  const grouped = members.reduce<Record<string, WorkspaceMember[]>>((acc, m) => {
    const role = m.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(m);
    return acc;
  }, {});

  const roleOrder = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
  const sortedGroups = roleOrder.filter((r) => grouped[r]?.length);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-500" />
            Team
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} member{members.length !== 1 ? 's' : ''} in this workspace
          </p>
        </div>
        <Button variant="brand" size="sm">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Invite member
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No workspace selected</p>
          <p className="text-sm mt-1">Select a workspace to see its members</p>
        </div>
      ) : (
        sortedGroups.map((role) => (
          <div key={role}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {ROLE_CONFIG[role]?.label ?? role} ({grouped[role].length})
            </h2>
            <div className="space-y-2">
              {grouped[role].map((member, i) => (
                <MemberCard key={member.user.id} member={member} index={i} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

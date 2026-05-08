import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import { useUIStore } from '@/stores/uiStore';
import { ACCESS_TOKEN_KEY } from '@/lib/constants';
import { workspaceService } from '@/services/workspace.service';
import { api } from '@/lib/axios';
import CreateTaskModal from '@/components/features/create-task/CreateTaskModal';
import type { UserRole } from '@flowboard/shared';

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const setWorkspaceRole = useAuthStore((s) => s.setWorkspaceRole);
  const connect = useSocketStore((s) => s.connect);
  const disconnect = useSocketStore((s) => s.disconnect);
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useUIStore((s) => s.setActiveWorkspaceId);
  const isCreateTaskOpen = useUIStore((s) => s.isCreateTaskOpen);
  const createTaskProjectId = useUIStore((s) => s.createTaskProjectId);
  const closeCreateTask = useUIStore((s) => s.closeCreateTask);
  const location = useLocation();

  useEffect(() => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && user) connect(token);
    return () => disconnect();
  }, [user, connect, disconnect]);

  useEffect(() => {
    if (!user || activeWorkspaceId) return;
    workspaceService.list().then(async (workspaces) => {
      let wsId: string;
      if (workspaces.length > 0) {
        wsId = workspaces[0].id;
        setActiveWorkspaceId(wsId);
      } else {
        const ws = await workspaceService.create({ name: `${user.name}'s Workspace` });
        wsId = ws.id;
        setActiveWorkspaceId(wsId);
      }
      // Fetch actual workspace role and update store
      try {
        const { data } = await api.get<{ data: Array<{ userId: string; role: string }> }>(`/workspaces/${wsId}/members`);
        const me = data.data.find((m) => m.userId === user.id);
        if (me) setWorkspaceRole(me.role as UserRole);
      } catch { /* non-fatal */ }
    }).catch(console.error);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-background">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
      <CreateTaskModal
        open={isCreateTaskOpen}
        onClose={closeCreateTask}
        projectId={createTaskProjectId ?? undefined}
      />
    </div>
  );
}

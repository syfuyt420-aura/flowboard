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

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const connect = useSocketStore((s) => s.connect);
  const disconnect = useSocketStore((s) => s.disconnect);
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useUIStore((s) => s.setActiveWorkspaceId);
  const location = useLocation();

  useEffect(() => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && user) connect(token);
    return () => disconnect();
  }, [user, connect, disconnect]);

  useEffect(() => {
    if (!user) return;
    workspaceService.list().then(async (workspaces) => {
      if (workspaces.length > 0) {
        if (!activeWorkspaceId) setActiveWorkspaceId(workspaces[0].id);
      } else {
        const ws = await workspaceService.create({ name: `${user.name}'s Workspace` });
        setActiveWorkspaceId(ws.id);
      }
    }).catch(() => {});
  }, [user, activeWorkspaceId, setActiveWorkspaceId]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

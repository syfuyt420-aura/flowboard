import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import AppShell from '@/components/layout/AppShell';
import AuthLayout from '@/components/layout/AuthLayout';
import FullPageSpinner from '@/components/shared/FullPageSpinner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import CommandPalette from '@/components/features/command-palette/CommandPalette';
import { authService } from '@/services/auth.service';
import { ACCESS_TOKEN_KEY } from '@/lib/constants';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));
const InvitePage = lazy(() => import('@/pages/InvitePage'));
const DashboardPage = lazy(() => import('@/pages/app/DashboardPage'));
const ProjectsPage = lazy(() => import('@/pages/app/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/app/ProjectDetailPage'));
const KanbanPage = lazy(() => import('@/pages/app/KanbanPage'));
const TaskListPage = lazy(() => import('@/pages/app/TaskListPage'));
const TaskTablePage = lazy(() => import('@/pages/app/TaskTablePage'));
const CalendarPage = lazy(() => import('@/pages/app/CalendarPage'));
const TimelinePage = lazy(() => import('@/pages/app/TimelinePage'));
const ProjectAnalyticsPage = lazy(() => import('@/pages/app/ProjectAnalyticsPage'));
const ProjectSettingsPage = lazy(() => import('@/pages/app/ProjectSettingsPage'));
const TaskDetailPage = lazy(() => import('@/pages/app/TaskDetailPage'));
const InboxPage = lazy(() => import('@/pages/app/InboxPage'));
const TeamPage = lazy(() => import('@/pages/app/TeamPage'));
const AnalyticsPage = lazy(() => import('@/pages/app/AnalyticsPage'));
const AutomationsPage = lazy(() => import('@/pages/app/AutomationsPage'));
const SettingsPage = lazy(() => import('@/pages/app/SettingsPage'));
const WorkspaceSettingsPage = lazy(() => import('@/pages/app/WorkspaceSettingsPage'));
const MyTasksPage = lazy(() => import('@/pages/app/MyTasksPage'));
const ProjectUpdatesPage = lazy(() => import('@/pages/app/ProjectUpdatesPage'));
const AllTasksPage = lazy(() => import('@/pages/app/AllTasksPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) { setRestoring(false); return; }
    authService.getMe()
      .then((user) => setUser(user))
      .catch(() => sessionStorage.removeItem(ACCESS_TOKEN_KEY))
      .finally(() => setRestoring(false));
  }, [setUser]);

  if (restoring) return <FullPageSpinner />;

  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ duration: 4000 }}
      />
      <CommandPalette />
      <ErrorBoundary>
        <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/invite/:token" element={<InvitePage />} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

            {/* Auth (public only) */}
            <Route
              element={
                <PublicOnlyRoute>
                  <AuthLayout />
                </PublicOnlyRoute>
              }
            >
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            </Route>

            {/* App (protected) */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />}>
                <Route index element={<KanbanPage />} />
                <Route path="board" element={<KanbanPage />} />
                <Route path="list" element={<TaskListPage />} />
                <Route path="table" element={<TaskTablePage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="timeline" element={<TimelinePage />} />
                <Route path="analytics" element={<ProjectAnalyticsPage />} />
                <Route path="settings" element={<ProjectSettingsPage />} />
                <Route path="updates" element={<ProjectUpdatesPage />} />
              </Route>
              <Route path="tasks" element={<AllTasksPage />} />
              <Route path="tasks/:id" element={<TaskDetailPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="automations" element={<AutomationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="workspace/settings" element={<WorkspaceSettingsPage />} />
              <Route path="my-tasks" element={<MyTasksPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

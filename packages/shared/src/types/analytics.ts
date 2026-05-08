export interface VelocityData {
  sprint: string;
  planned: number;
  completed: number;
}

export interface BurndownData {
  date: string;
  remaining: number;
  ideal: number;
}

export interface WorkloadData {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  taskCount: number;
  overdueTasks: number;
  completedThisWeek: number;
  estimatedHours: number;
}

export interface CycleTimeData {
  date: string;
  avgCycleTimeHours: number;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  overdueTaskCount: number;
  upcomingDeadlines: number;
  activeProjects: number;
  teamMembers: number;
  tasksCompletedThisWeek: number;
  tasksCreatedThisWeek: number;
}

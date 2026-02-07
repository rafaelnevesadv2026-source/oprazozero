export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "completed";
export type TaskDomain = "juridico" | "pessoal" | "descarte";

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO date string
  priority: TaskPriority;
  status: TaskStatus;
  domain: TaskDomain;
  source?: string;
  createdAt: string;
}

export type DeadlineStatus = "overdue" | "urgent" | "soon" | "safe";

export function getDeadlineStatus(deadline: string): DeadlineStatus {
  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "overdue";
  if (diffDays <= 1) return "urgent";
  if (diffDays <= 3) return "soon";
  return "safe";
}

export function getDaysRemaining(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDeadline(deadline: string): string {
  const days = getDaysRemaining(deadline);
  if (days < 0) return `${Math.abs(days)} dia${Math.abs(days) !== 1 ? "s" : ""} atrasado`;
  if (days === 0) return "Vence hoje!";
  if (days === 1) return "Vence amanhã";
  return `${days} dias restantes`;
}

const STORAGE_KEY = "prazo-zero-tasks";

export function loadTasks(): Task[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function createTask(data: Omit<Task, "id" | "createdAt" | "status">): Task {
  return {
    ...data,
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

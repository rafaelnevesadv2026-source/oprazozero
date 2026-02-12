import { useState, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { StatsCards, StatsFilter } from "@/components/StatsCards";
import { DailyPanel } from "@/components/DailyPanel";
import { DeadlineRadar } from "@/components/DeadlineRadar";
import { TaskFilters, FilterType } from "@/components/TaskFilters";
import { TaskCard } from "@/components/TaskCard";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { SmartAlertsPanel } from "@/components/SmartAlertsPanel";
import { ManusChat } from "@/components/ManusChat";
import { getDeadlineStatus, Task } from "@/lib/tasks";
import { Mail, FolderOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Index() {
  const { user, loading, signOut } = useAuth();
  const { tasks, loading: tasksLoading, toggleComplete, addTask, deleteTask, updateTask } = useTasks();

  const [filter, setFilter] = useState<FilterType>("all");
  const [statsFilter, setStatsFilter] = useState<StatsFilter>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const filteredTasks = (() => {
    let result = tasks;

    if (statsFilter === "overdue") {
      result = result.filter((t) => t.status === "pending" && getDeadlineStatus(t.deadline) === "overdue");
    } else if (statsFilter === "urgent") {
      result = result.filter(
        (t) =>
          t.status === "pending" &&
          (getDeadlineStatus(t.deadline) === "urgent" || getDeadlineStatus(t.deadline) === "soon")
      );
    } else if (statsFilter === "completed") {
      result = result.filter((t) => t.status === "completed");
    }

    if (filter === "pending") result = result.filter((t) => t.status === "pending");
    else if (filter === "overdue")
      result = result.filter((t) => t.status === "pending" && getDeadlineStatus(t.deadline) === "overdue");
    else if (filter === "completed") result = result.filter((t) => t.status === "completed");

    return result;
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/logo_prazo_zero.png..png" alt="Prazo Zero" className="h-8 w-8" />
            <h1 className="text-lg font-bold">Prazo Zero</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/emails">
              <Button variant="ghost" size="sm">
                <Mail className="mr-1 h-4 w-4" /> Emails
              </Button>
            </Link>
            <Link to="/processes">
              <Button variant="ghost" size="sm">
                <FolderOpen className="mr-1 h-4 w-4" /> Processos
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <StatsCards tasks={tasks} activeFilter={statsFilter} onFilterClick={setStatsFilter} />
        <SmartAlertsPanel />
        <DailyPanel tasks={tasks} onToggle={toggleComplete} onSelectTask={setSelectedTask} />
        <DeadlineRadar tasks={tasks} />

        {/* Tasks */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <TaskFilters active={filter} onChange={setFilter} />
            <AddTaskDialog onAdd={addTask} />
          </div>

          {tasksLoading ? (
            <p className="text-center text-sm text-muted-foreground">Carregando tarefas...</p>
          ) : filteredTasks.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={toggleComplete}
                  onDelete={deleteTask}
                  onClick={() => setSelectedTask(task)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onToggle={toggleComplete}
          onDelete={deleteTask}
        />
      )}

      <ManusChat />
    </div>
  );
}

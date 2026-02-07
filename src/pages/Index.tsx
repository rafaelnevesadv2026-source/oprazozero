import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { getDeadlineStatus } from "@/lib/tasks";
import { StatsCards } from "@/components/StatsCards";
import { TaskCard } from "@/components/TaskCard";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { TaskFilters, FilterType } from "@/components/TaskFilters";
import { Target } from "lucide-react";

const Index = () => {
  const { tasks, addTask, toggleComplete, deleteTask } = useTasks();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    switch (filter) {
      case "pending":
        return sorted.filter((t) => t.status === "pending");
      case "overdue":
        return sorted.filter(
          (t) => t.status === "pending" && getDeadlineStatus(t.deadline) === "overdue"
        );
      case "completed":
        return sorted.filter((t) => t.status === "completed");
      default:
        return sorted;
    }
  }, [tasks, filter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Prazo Zero
              </h1>
              <p className="text-sm text-muted-foreground">
                Nunca perca um prazo
              </p>
            </div>
          </div>
          <AddTaskDialog onAdd={addTask} />
        </div>

        {/* Stats */}
        <StatsCards tasks={tasks} />

        {/* Filters + Tasks */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Tarefas</h2>
            <TaskFilters active={filter} onChange={setFilter} />
          </div>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground mb-1">
                  {filter === "all" ? "Nenhuma tarefa ainda" : "Nenhuma tarefa neste filtro"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filter === "all"
                    ? "Crie sua primeira tarefa para começar!"
                    : "Tente outro filtro ou crie uma nova tarefa."}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={toggleComplete}
                  onDelete={deleteTask}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

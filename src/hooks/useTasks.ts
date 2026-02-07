import { useState, useCallback, useEffect } from "react";
import { Task, loadTasks, saveTasks, createTask } from "@/lib/tasks";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  const persist = useCallback((updated: Task[]) => {
    setTasks(updated);
    saveTasks(updated);
  }, []);

  const addTask = useCallback(
    (data: Omit<Task, "id" | "createdAt" | "status">) => {
      const task = createTask(data);
      persist([...tasks, task]);
    },
    [tasks, persist]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      persist(tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    },
    [tasks, persist]
  );

  const deleteTask = useCallback(
    (id: string) => {
      persist(tasks.filter((t) => t.id !== id));
    },
    [tasks, persist]
  );

  const toggleComplete = useCallback(
    (id: string) => {
      persist(
        tasks.map((t) =>
          t.id === id
            ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
            : t
        )
      );
    },
    [tasks, persist]
  );

  return { tasks, addTask, updateTask, deleteTask, toggleComplete };
}

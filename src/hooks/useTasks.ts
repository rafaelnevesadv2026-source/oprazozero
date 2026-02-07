import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TaskPriority, TaskStatus, Task } from "@/lib/tasks";

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("deadline", { ascending: true });

    if (!error && data) {
      setTasks(
        data.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description || "",
          deadline: t.deadline,
          priority: t.priority as TaskPriority,
          status: t.status as TaskStatus,
          source: t.source || "manual",
          createdAt: t.created_at,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription for tasks (auto-created from emails)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tasks_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        () => { fetchTasks(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchTasks]);

  const addTask = useCallback(
    async (data: { title: string; description: string; deadline: string; priority: TaskPriority }) => {
      if (!user) return;
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        priority: data.priority,
      });
      if (!error) await fetchTasks();
    },
    [user, fetchTasks]
  );

  const toggleComplete = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const newStatus = task.status === "completed" ? "pending" : "completed";
      await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
      await fetchTasks();
    },
    [tasks, fetchTasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await supabase.from("tasks").delete().eq("id", id);
      await fetchTasks();
    },
    [fetchTasks]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      await supabase.from("tasks").update(updates).eq("id", id);
      await fetchTasks();
    },
    [fetchTasks]
  );

  return { tasks, loading, addTask, updateTask, deleteTask, toggleComplete, refetch: fetchTasks };
}

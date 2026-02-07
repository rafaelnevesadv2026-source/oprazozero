import { useState, useMemo } from "react";
import { Task } from "@/lib/tasks";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useLabels } from "@/hooks/useLabels";
import { useProcesses } from "@/hooks/useProcesses";
import { useGmail } from "@/hooks/useGmail";
import { getDeadlineStatus } from "@/lib/tasks";
import { StatsCards, StatsFilter } from "@/components/StatsCards";
import { TaskCard } from "@/components/TaskCard";
import { TaskActionSheet } from "@/components/TaskActionSheet";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { TaskFilters, FilterType } from "@/components/TaskFilters";
import { DeadlineRadar } from "@/components/DeadlineRadar";
import { DailyPanel } from "@/components/DailyPanel";
import { LabelManager } from "@/components/LabelManager";
import { TaskTimeline } from "@/components/TaskTimeline";
import { DomainTabs, DomainFilter } from "@/components/DomainTabs";
import { SmartAlertsPanel } from "@/components/SmartAlertsPanel";
import { AuditButton } from "@/components/AuditButton";
import { WeekSimulation } from "@/components/WeekSimulation";
import { PowerSearch } from "@/components/PowerSearch";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { LogOut, Mail, FolderOpen, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const statsToFilter: Record<StatsFilter, FilterType> = {
  all: "all",
  overdue: "overdue",
  urgent: "pending",
  completed: "completed",
};

const statsLabels: Record<StatsFilter, string> = {
  all: "Todas as Tarefas",
  overdue: "Tarefas Atrasadas",
  urgent: "Tarefas Urgentes",
  completed: "Tarefas Concluídas",
};

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { tasks, loading: tasksLoading, addTask, toggleComplete, deleteTask } = useTasks();
  const { labels, addLabel, deleteLabel } = useLabels();
  const { processes } = useProcesses();
  const { emails } = useGmail();
  const [filter, setFilter] = useState<FilterType>("all");
  const [domain, setDomain] = useState<DomainFilter>("all");
  const [statsFilter, setStatsFilter] = useState<StatsFilter | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const domainCounts = useMemo(() => {
    const pending = tasks.filter(t => t.status === "pending");
    return {
      all: pending.length,
      juridico: pending.filter(t => t.domain === "juridico").length,
      pessoal: pending.filter(t => t.domain === "pessoal").length,
      descarte: pending.filter(t => t.domain === "descarte").length,
    };
  }, [tasks]);

  const domainTasks = useMemo(() => {
    if (domain === "all") return tasks;
    return tasks.filter(t => t.domain === domain);
  }, [tasks, domain]);

  const filteredTasks = useMemo(() => {
    let result = [...domainTasks];
    switch (filter) {
      case "pending": result = result.filter((t) => t.status === "pending"); break;
      case "overdue": result = result.filter((t) => t.status === "pending" && getDeadlineStatus(t.deadline) === "overdue"); break;
      case "completed": result = result.filter((t) => t.status === "completed"); break;
    }
    result.sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
    return result;
  }, [domainTasks, filter]);

  // Tasks for the action sheet opened from stats cards
  const statsSheetTasks = useMemo(() => {
    if (!statsFilter) return [];
    const base = domainTasks;
    switch (statsFilter) {
      case "all": return base;
      case "overdue": return base.filter(t => t.status === "pending" && getDeadlineStatus(t.deadline) === "overdue");
      case "urgent": return base.filter(t => t.status === "pending" && (getDeadlineStatus(t.deadline) === "urgent" || getDeadlineStatus(t.deadline) === "soon"));
      case "completed": return base.filter(t => t.status === "completed");
      default: return [];
    }
  }, [statsFilter, domainTasks]);

  const handleStatsClick = (key: StatsFilter) => {
    if (statsFilter === key) {
      setStatsFilter(null); // toggle off
    } else {
      setStatsFilter(key);
    }
  };

  const emailsForSearch = useMemo(() =>
    emails.map((e: any) => ({
      id: e.id,
      subject: e.subject,
      sender: e.sender,
      snippet: e.snippet,
      ai_summary: e.ai_summary,
      domain: e.domain || "pessoal",
      category: e.category,
      extracted_deadline: e.extracted_deadline,
      extracted_value: e.extracted_value,
      received_at: e.received_at,
    })),
  [emails]);

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="O Prazo é Zero" className="h-10 w-auto" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">O Prazo é Zero</h1>
              <p className="text-sm text-muted-foreground">Nunca perca um prazo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/processes"><Button variant="outline" size="icon" title="Processos"><FolderOpen className="h-4 w-4" /></Button></Link>
            <Link to="/emails"><Button variant="outline" size="icon" title="Emails"><Mail className="h-4 w-4" /></Button></Link>
            <AddTaskDialog onAdd={addTask} />
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Power Search */}
        <div className="mb-6">
          <PowerSearch tasks={tasks} emails={emailsForSearch} processes={processes} />
        </div>

        {/* Domain Tabs */}
        <DomainTabs active={domain} onChange={setDomain} counts={domainCounts} />

        {/* Stats Cards - Clickable */}
        <StatsCards
          tasks={domainTasks}
          activeFilter={statsFilter ?? undefined}
          onFilterClick={handleStatsClick}
        />

        {/* Action Sheet from Stats Click */}
        {statsFilter && (
          <div className="mt-4">
            <TaskActionSheet
              tasks={statsSheetTasks}
              title={statsLabels[statsFilter]}
              onToggle={toggleComplete}
              onDelete={deleteTask}
              onClose={() => setStatsFilter(null)}
            />
          </div>
        )}

        {/* Radar + Daily Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <DeadlineRadar tasks={tasks} />
          <DailyPanel tasks={tasks} onToggle={toggleComplete} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="md:col-span-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Tarefas</h2>
                <TaskFilters active={filter} onChange={setFilter} />
              </div>
              {tasksLoading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando tarefas...</div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                        <Target className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium text-foreground mb-1">
                        {filter === "all" ? "Nenhuma tarefa ainda" : "Nenhuma tarefa encontrada"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {filter === "all" ? "Crie sua primeira tarefa para começar!" : "Tente outro filtro."}
                      </p>
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} onClick={() => setSelectedTask(task)} />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <SmartAlertsPanel />
            <AuditButton />
            <WeekSimulation />
            <LabelManager labels={labels} onAdd={addLabel} onDelete={deleteLabel} />
            <TaskTimeline tasks={tasks} />
          </div>
        </div>

        <TaskDetailSheet
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          onToggle={toggleComplete}
          onDelete={deleteTask}
        />
      </div>
    </div>
  );
};

export default Index;

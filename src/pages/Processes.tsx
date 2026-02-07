import { useState, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProcesses } from "@/hooks/useProcesses";
import { useTasks } from "@/hooks/useTasks";
import { getDeadlineStatus } from "@/lib/tasks";
import { AddProcessDialog } from "@/components/AddProcessDialog";
import { ProcessCard } from "@/components/ProcessCard";
import { SearchBar } from "@/components/SearchBar";
import { Target, LogOut, ArrowLeft, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const Processes = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { processes, loading, addProcess } = useProcesses();
  const { tasks } = useTasks();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "closed">("all");

  const processStats = useMemo(() => {
    const stats: Record<string, { taskCount: number; overdueCount: number }> = {};
    tasks.forEach((t) => {
      const pid = (t as any).processId || "";
      if (!pid) return;
      if (!stats[pid]) stats[pid] = { taskCount: 0, overdueCount: 0 };
      if (t.status === "pending") {
        stats[pid].taskCount++;
        if (getDeadlineStatus(t.deadline) === "overdue") stats[pid].overdueCount++;
      }
    });
    return stats;
  }, [tasks]);

  const filtered = useMemo(() => {
    let result = [...processes];
    if (statusFilter !== "all") result = result.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.processNumber.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.adversary.toLowerCase().includes(q)
      );
    }
    return result;
  }, [processes, search, statusFilter]);

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Processos</h1>
              <p className="text-sm text-muted-foreground">Visão completa de todos os processos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AddProcessDialog onAdd={addProcess} />
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(["all", "active", "closed"] as const).map((s) => {
            const count = s === "all" ? processes.length : processes.filter((p) => p.status === s).length;
            const labels = { all: "Total", active: "Ativos", closed: "Encerrados" };
            return (
              <button key={s} onClick={() => setStatusFilter(s === statusFilter ? "all" : s)}
                className={`rounded-lg border p-3 text-center transition-colors ${statusFilter === s ? "border-primary bg-primary/5" : "bg-card"}`}>
                <div className="text-2xl font-bold text-foreground">{count}</div>
                <div className="text-xs text-muted-foreground">{labels[s]}</div>
              </button>
            );
          })}
        </div>

        <SearchBar value={search} onChange={setSearch} />

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando processos...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">
                {processes.length === 0 ? "Nenhum processo cadastrado" : "Nenhum processo encontrado"}
              </p>
              <p className="text-sm text-muted-foreground">
                {processes.length === 0 ? "Crie seu primeiro processo!" : "Tente outro filtro ou busca."}
              </p>
            </div>
          ) : (
            filtered.map((p) => (
              <ProcessCard key={p.id} process={p}
                taskCount={processStats[p.id]?.taskCount || 0}
                overdueCount={processStats[p.id]?.overdueCount || 0} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Processes;

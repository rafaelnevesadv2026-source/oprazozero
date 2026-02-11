import { useState, useMemo } from "react";
import { MessageSquare, Send, Bot, X, Mail, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { StatsCards, StatsFilter } from "@/components/StatsCards";
import { DailyPanel } from "@/components/DailyPanel";
import { DeadlineRadar } from "@/components/DeadlineRadar";
import { TaskCard } from "@/components/TaskCard";
import { TaskFilters, FilterType } from "@/components/TaskFilters";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { SearchBar } from "@/components/SearchBar";
import { DomainTabs, DomainFilter } from "@/components/DomainTabs";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { NavLink } from "@/components/NavLink";
import { getDeadlineStatus, Task } from "@/lib/tasks";
import { Navigate } from "react-router-dom";

const ManusChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    const newUserMessage = { role: "user", content: message };
    setChatHistory(prev => [...prev, newUserMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('manus-sync', {
        body: { action: 'chat', payload: { message } }
      });
      if (error) throw error;
      setChatHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Vaso de Deus, estou processando sua solicitação. Tente novamente em instantes." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen ? (
        <Card className="w-80 h-96 flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-5 bg-background">
          <div className="p-3 bg-primary text-primary-foreground flex justify-between items-center rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <span className="font-bold text-sm">MANUS - PRAZO ZERO</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-primary-foreground hover:bg-primary-foreground/20"><X size={16} /></Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`max-w-[80%] p-2 rounded-lg text-xs ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-[10px] text-muted-foreground animate-pulse">Manus está analisando...</div>}
          </ScrollArea>
          <div className="p-3 border-t flex gap-2 bg-background">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Dúvida jurídica..."
              className="text-xs"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button size="sm" onClick={handleSendMessage} disabled={isLoading}><Send size={14} /></Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setIsOpen(true)} className="rounded-full w-14 h-14 shadow-lg">
          <MessageSquare size={24} />
        </Button>
      )}
    </div>
  );
};

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading, addTask, toggleComplete, deleteTask } = useTasks();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [domain, setDomain] = useState<DomainFilter>("all");
  const [statsFilter, setStatsFilter] = useState<StatsFilter>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Domain filter
    if (domain !== "all") result = result.filter((t) => t.domain === domain);

    // Stats filter
    if (statsFilter === "overdue") result = result.filter((t) => t.status === "pending" && getDeadlineStatus(t.deadline) === "overdue");
    else if (statsFilter === "urgent") result = result.filter((t) => t.status === "pending" && (getDeadlineStatus(t.deadline) === "urgent" || getDeadlineStatus(t.deadline) === "soon"));
    else if (statsFilter === "completed") result = result.filter((t) => t.status === "completed");

    // Status filter
    if (filter === "pending") result = result.filter((t) => t.status === "pending");
    else if (filter === "completed") result = result.filter((t) => t.status === "completed");
    else if (filter === "overdue") result = result.filter((t) => t.status === "pending" && getDeadlineStatus(t.deadline) === "overdue");

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }

    return result;
  }, [tasks, filter, domain, search, statsFilter]);

  const domainCounts = useMemo(() => ({
    all: tasks.filter((t) => t.status === "pending").length,
    juridico: tasks.filter((t) => t.domain === "juridico" && t.status === "pending").length,
    pessoal: tasks.filter((t) => t.domain === "pessoal" && t.status === "pending").length,
    descarte: tasks.filter((t) => t.domain === "descarte" && t.status === "pending").length,
  }), [tasks]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo_prazo_zero.png..png" alt="Prazo Zero" className="h-8" />
            <h1 className="text-xl font-bold text-foreground">Prazo Zero</h1>
          </div>
          <nav className="flex items-center gap-4">
            <NavLink to="/" className="text-sm font-medium text-foreground" activeClassName="text-primary">Tarefas</NavLink>
            <NavLink to="/emails" className="text-sm font-medium text-muted-foreground hover:text-foreground" activeClassName="text-primary">
              <span className="flex items-center gap-1"><Mail size={16} /> Emails</span>
            </NavLink>
            <NavLink to="/processes" className="text-sm font-medium text-muted-foreground hover:text-foreground" activeClassName="text-primary">
              <span className="flex items-center gap-1"><Scale size={16} /> Processos</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <StatsCards tasks={tasks} activeFilter={statsFilter} onFilterClick={setStatsFilter} />

        {/* Daily Panel */}
        <DailyPanel tasks={tasks} onToggle={toggleComplete} onSelectTask={setSelectedTask} />

        {/* Deadline Radar */}
        <DeadlineRadar tasks={tasks} />

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <DomainTabs active={domain} onChange={setDomain} counts={domainCounts} />
          <div className="flex gap-2 items-center">
            <SearchBar value={search} onChange={setSearch} />
            <AddTaskDialog onAdd={addTask} />
          </div>
        </div>

        <TaskFilters active={filter} onChange={setFilter} />

        {/* Task List */}
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Carregando tarefas...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Nenhuma tarefa encontrada.</div>
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
      </main>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
        onToggle={toggleComplete}
        onDelete={deleteTask}
      />

      {/* Manus Chat */}
      <ManusChat />
    </div>
  );
};

export default Index;

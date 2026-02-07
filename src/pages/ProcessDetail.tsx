import { useMemo } from "react";
import { Navigate, Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProcesses } from "@/hooks/useProcesses";
import { useProcessDetail } from "@/hooks/useProcessDetail";
import { getDeadlineStatus, formatDeadline } from "@/lib/tasks";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Target, ArrowLeft, Scale, User, Mail, CheckCircle2, Clock, AlertTriangle,
  FileText, Calendar, Flag, MessageSquare, Activity
} from "lucide-react";
import { useState } from "react";

const priorityLabels: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

const ProcessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { processes, updateProcess } = useProcesses();
  const { tasks, emails, loading } = useProcessDetail(id);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");

  const process = processes.find((p) => p.id === id);

  const stats = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "pending");
    const completed = tasks.filter((t) => t.status === "completed");
    const overdue = pending.filter((t) => getDeadlineStatus(t.deadline) === "overdue");
    return { pending: pending.length, completed: completed.length, overdue: overdue.length, total: tasks.length };
  }, [tasks]);

  // Build timeline from tasks + emails
  const timeline = useMemo(() => {
    const items: { date: string; label: string; type: "task" | "email" | "completed"; icon: typeof Mail }[] = [];
    tasks.forEach((t) => {
      items.push({ date: t.createdAt, label: `Tarefa criada: ${t.title}`, type: "task", icon: FileText });
      if (t.status === "completed") {
        items.push({ date: t.deadline, label: `Concluído: ${t.title}`, type: "completed", icon: CheckCircle2 });
      }
    });
    emails.forEach((e) => {
      items.push({ date: e.receivedAt || "", label: `E-mail: ${e.subject || "Sem assunto"}`, type: "email", icon: Mail });
    });
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [tasks, emails]);

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!process && !loading) return <Navigate to="/processes" replace />;
  if (!process) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Carregando processo...</div></div>;

  const handleSaveNotes = async () => {
    await updateProcess(process.id, { notes });
    setEditingNotes(false);
  };

  const statusColors: Record<string, string> = {
    active: "bg-primary/10 text-primary border-primary/20",
    paused: "bg-warning/10 text-warning border-warning/20",
    closed: "bg-success/10 text-success border-success/20",
  };
  const statusLabels: Record<string, string> = { active: "Em andamento", paused: "Pausado", closed: "Encerrado" };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/processes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            {process.domain === "juridico" ? <Scale className="h-5 w-5 text-primary-foreground" /> : <User className="h-5 w-5 text-primary-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate">Processo {process.processNumber}</h1>
            <p className="text-sm text-muted-foreground">Cliente: {process.clientName}{process.adversary ? ` • vs. ${process.adversary}` : ""}</p>
          </div>
          <Badge className={cn("shrink-0", statusColors[process.status])}>
            {statusLabels[process.status] || process.status}
          </Badge>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Tarefas</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-success">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Concluídas</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <div className={cn("text-2xl font-bold", stats.overdue > 0 ? "text-urgent" : "text-success")}>{stats.overdue}</div>
            <div className="text-xs text-muted-foreground">Atrasadas</div>
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main content */}
          <div className="md:col-span-2 space-y-4">
            {/* Open Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Tarefas Abertas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.filter((t) => t.status === "pending").length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tarefa aberta</p>
                ) : (
                  tasks.filter((t) => t.status === "pending").map((task) => {
                    const ds = getDeadlineStatus(task.deadline);
                    return (
                      <div key={task.id} className="flex items-center gap-3 p-2 rounded-md border bg-card">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", ds === "overdue" ? "bg-urgent" : ds === "urgent" ? "bg-warning" : "bg-primary")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{task.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDeadline(task.deadline)}
                            <Flag className="h-3 w-3 ml-1" />
                            {priorityLabels[task.priority]}
                          </div>
                        </div>
                        <StatusBadge status={ds} />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Emails */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> E-mails ({emails.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {emails.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum e-mail vinculado</p>
                ) : (
                  emails.map((email) => (
                    <div key={email.id} className="p-2 rounded-md border bg-card">
                      <p className="text-sm font-medium text-card-foreground truncate">{email.subject || "Sem assunto"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{email.sender}</span>
                        {email.receivedAt && <span>• {new Date(email.receivedAt).toLocaleDateString("pt-BR")}</span>}
                        {email.category && <Badge variant="outline" className="text-[10px] px-1 py-0">{email.category}</Badge>}
                      </div>
                      {email.aiSummary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.aiSummary}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Alerts */}
            {stats.overdue > 0 && (
              <Card className="border-urgent/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-urgent">
                    <AlertTriangle className="h-4 w-4" /> Alertas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Este processo tem <span className="font-semibold text-urgent">{stats.overdue} tarefa{stats.overdue !== 1 ? "s" : ""} atrasada{stats.overdue !== 1 ? "s" : ""}</span>.
                    Ação imediata recomendada.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Linha do Tempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem eventos</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.slice(-10).map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex gap-2">
                          <div className="flex flex-col items-center">
                            <div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                              item.type === "completed" ? "bg-success/10" : item.type === "email" ? "bg-primary/10" : "bg-muted"
                            )}>
                              <Icon className={cn("h-3 w-3",
                                item.type === "completed" ? "text-success" : item.type === "email" ? "text-primary" : "text-muted-foreground"
                              )} />
                            </div>
                            {i < Math.min(timeline.length, 10) - 1 && <div className="w-px h-full bg-border min-h-[12px]" />}
                          </div>
                          <div className="pb-2">
                            <p className="text-xs font-medium text-card-foreground leading-tight">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.date ? new Date(item.date).toLocaleDateString("pt-BR") : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Internal Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" /> Observações Internas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingNotes ? (
                  <div className="space-y-2">
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Notas internas..." />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNotes}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => { setNotes(process.notes); setEditingNotes(true); }}
                    className="cursor-pointer text-sm text-muted-foreground min-h-[60px] p-2 rounded-md border border-dashed hover:border-primary/30 transition-colors"
                  >
                    {process.notes || "Clique para adicionar observações internas..."}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Change */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(["active", "paused", "closed"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={process.status === s ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => updateProcess(process.id, { status: s })}
                  >
                    {s === "active" ? "🟢 Em andamento" : s === "paused" ? "🟡 Pausado" : "✅ Encerrado"}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessDetail;

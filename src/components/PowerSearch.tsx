import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X, Filter, Mail, CheckSquare, FolderOpen, Calendar, DollarSign } from "lucide-react";
import { Task, formatDeadline, getDeadlineStatus } from "@/lib/tasks";

interface SearchResult {
  type: "task" | "email" | "process";
  id: string;
  title: string;
  subtitle: string;
  domain: string;
  deadline?: string;
  value?: number;
  icon: typeof Mail;
}

interface PowerSearchProps {
  tasks: Task[];
  emails: Array<{ id: string; subject: string | null; sender: string | null; snippet: string | null; ai_summary: string | null; domain: string; category: string | null; extracted_deadline: string | null; extracted_value: number | null; received_at: string | null }>;
  processes: Array<{ id: string; processNumber: string; clientName: string; adversary: string; status: string; domain: string }>;
}

const filterOptions = [
  { key: "all", label: "Tudo" },
  { key: "task", label: "Tarefas" },
  { key: "email", label: "Emails" },
  { key: "process", label: "Processos" },
] as const;

export function PowerSearch({ tasks, emails, processes }: PowerSearchProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    const items: SearchResult[] = [];

    // Search tasks
    tasks.forEach((t) => {
      if (t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) {
        items.push({
          type: "task",
          id: t.id,
          title: t.title,
          subtitle: t.status === "completed" ? "✅ Concluída" : formatDeadline(t.deadline),
          domain: t.domain,
          deadline: t.deadline,
          icon: CheckSquare,
        });
      }
    });

    // Search emails
    emails.forEach((e) => {
      const searchText = `${e.subject || ""} ${e.sender || ""} ${e.snippet || ""} ${e.ai_summary || ""}`.toLowerCase();
      if (searchText.includes(q)) {
        items.push({
          type: "email",
          id: e.id,
          title: e.subject || "(sem assunto)",
          subtitle: e.sender || "",
          domain: e.domain,
          deadline: e.extracted_deadline || undefined,
          value: e.extracted_value || undefined,
          icon: Mail,
        });
      }
    });

    // Search processes
    processes.forEach((p) => {
      const searchText = `${p.processNumber} ${p.clientName} ${p.adversary}`.toLowerCase();
      if (searchText.includes(q)) {
        items.push({
          type: "process",
          id: p.id,
          title: `${p.processNumber} — ${p.clientName}`,
          subtitle: p.adversary ? `vs. ${p.adversary}` : p.status,
          domain: p.domain,
          icon: FolderOpen,
        });
      }
    });

    // Filter by type
    if (typeFilter !== "all") return items.filter((i) => i.type === typeFilter);
    return items;
  }, [query, tasks, emails, processes, typeFilter]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por palavra, cliente, processo, valor, remetente..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-8"
        />
        {query && (
          <button onClick={() => { setQuery(""); setIsOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-[400px] overflow-auto">
          <CardContent className="p-2">
            {/* Type filters */}
            <div className="flex gap-1 mb-2 p-1">
              {filterOptions.map((f) => (
                <Button key={f.key} variant={typeFilter === f.key ? "default" : "ghost"} size="sm"
                  className="h-6 text-xs px-2" onClick={() => setTypeFilter(f.key)}>
                  {f.label}
                </Button>
              ))}
            </div>

            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum resultado para "{query}"</p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground px-2">{results.length} resultado{results.length !== 1 ? "s" : ""}</p>
                {results.slice(0, 20).map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={`${r.type}-${r.id}`} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-card-foreground truncate">{r.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{r.subtitle}</span>
                          {r.value && (
                            <span className="flex items-center gap-0.5 text-success">
                              <DollarSign className="h-3 w-3" />
                              R$ {r.value.toLocaleString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {r.type === "task" ? "Tarefa" : r.type === "email" ? "Email" : "Processo"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

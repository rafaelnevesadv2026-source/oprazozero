import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Scale, User, DollarSign, Calendar, AlertTriangle,
  ArrowRight, Info, Filter, X
} from "lucide-react";

export type EmailCategoryFilter = "all" | "pagamentos" | "boletos" | "prazos" | "processos" | "intimacoes" | "sinistros" | "contatos" | "promocoes" | "outros";
export type EmailDomainFilter = "all" | "juridico" | "pessoal";
export type EmailStatusFilter = "all" | "action" | "response" | "informational";

interface EmailFiltersProps {
  category: EmailCategoryFilter;
  domain: EmailDomainFilter;
  status: EmailStatusFilter;
  onCategoryChange: (c: EmailCategoryFilter) => void;
  onDomainChange: (d: EmailDomainFilter) => void;
  onStatusChange: (s: EmailStatusFilter) => void;
  counts: {
    total: number;
    action: number;
    response: number;
    informational: number;
    juridico: number;
    pessoal: number;
    byCategory: Record<string, number>;
  };
}

const categories: { key: EmailCategoryFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pagamentos", label: "Pagamentos" },
  { key: "boletos", label: "Boletos" },
  { key: "prazos", label: "Prazos" },
  { key: "processos", label: "Processos" },
  { key: "intimacoes", label: "Intimações" },
  { key: "sinistros", label: "Sinistros" },
  { key: "contatos", label: "Contatos" },
  { key: "outros", label: "Outros" },
];

export function EmailFilters({
  category, domain, status,
  onCategoryChange, onDomainChange, onStatusChange,
  counts,
}: EmailFiltersProps) {
  const hasActiveFilter = category !== "all" || domain !== "all" || status !== "all";

  return (
    <div className="space-y-3">
      {/* Domain tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDomainChange("all")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            domain === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Todos ({counts.total})
        </button>
        <button
          onClick={() => onDomainChange("juridico")}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            domain === "juridico" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <Scale className="h-3 w-3" /> Jurídico ({counts.juridico})
        </button>
        <button
          onClick={() => onDomainChange("pessoal")}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            domain === "pessoal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <User className="h-3 w-3" /> Pessoal ({counts.pessoal})
        </button>
      </div>

      {/* Status + Category row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        
        {/* Status filters */}
        <button
          onClick={() => onStatusChange(status === "action" ? "all" : "action")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors",
            status === "action"
              ? "bg-urgent/10 text-urgent border-urgent/30"
              : "bg-card text-muted-foreground border-border hover:border-urgent/30"
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          Ação ({counts.action})
        </button>
        <button
          onClick={() => onStatusChange(status === "response" ? "all" : "response")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors",
            status === "response"
              ? "bg-warning/10 text-warning border-warning/30"
              : "bg-card text-muted-foreground border-border hover:border-warning/30"
          )}
        >
          <ArrowRight className="h-3 w-3" />
          Resposta ({counts.response})
        </button>
        <button
          onClick={() => onStatusChange(status === "informational" ? "all" : "informational")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors",
            status === "informational"
              ? "bg-muted text-foreground border-foreground/20"
              : "bg-card text-muted-foreground border-border hover:border-foreground/20"
          )}
        >
          <Info className="h-3 w-3" />
          Informativo ({counts.informational})
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Category pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {categories.map((c) => {
            const count = c.key === "all" ? counts.total : (counts.byCategory[c.key] || 0);
            return (
              <button
                key={c.key}
                onClick={() => onCategoryChange(category === c.key ? "all" : c.key)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                  category === c.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {c.label} ({count})
              </button>
            );
          })}
        </div>

        {hasActiveFilter && (
          <button
            onClick={() => { onCategoryChange("all"); onDomainChange("all"); onStatusChange("all"); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}

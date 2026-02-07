import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Hash, Scale, Building2, FileText, Users, User, Calendar,
  Clock, Gavel, AlertTriangle, ChevronRight, Zap
} from "lucide-react";
import type { LegalData } from "@/lib/legalDataExtractor";

interface ProcessSheetProps {
  processNumber: string | null;
  legalData: LegalData | null;
  processLinked: boolean;
}

function FieldRow({ label, value, bold, urgent }: { label: string; value: string | null | undefined; bold?: boolean; urgent?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1 text-sm">
      <span className="text-muted-foreground font-medium min-w-[140px] shrink-0">{label}:</span>
      <span className={cn(
        "text-foreground",
        bold && "font-bold",
        urgent && "text-urgent font-bold"
      )}>{value}</span>
    </div>
  );
}

export function ProcessSheet({ processNumber, legalData, processLinked }: ProcessSheetProps) {
  const hasData = processNumber || legalData?.poloAtivo || legalData?.classeJudicial || legalData?.decisionType;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Scale className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground font-medium">Nenhum dado processual identificado</p>
        <p className="text-xs text-muted-foreground mt-1">
          Este email não contém informações de processo judicial detectáveis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header do Processo */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="bg-muted/50 border-b px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Ficha Processual
            </span>
          </div>
          <Badge variant="outline" className={cn(
            "text-[10px]",
            processLinked
              ? "bg-success/10 text-success border-success/30"
              : "bg-muted text-muted-foreground"
          )}>
            {processLinked ? "VINCULADO" : "NÃO VINCULADO"}
          </Badge>
        </div>

        <div className="p-4 space-y-1">
          {processNumber && (
            <div className="flex gap-2 py-1.5 text-sm">
              <span className="text-muted-foreground font-medium min-w-[140px] shrink-0">Nº Processo:</span>
              <span className="text-primary font-bold font-mono">{processNumber}</span>
            </div>
          )}
          <FieldRow label="Classe" value={legalData?.classeJudicial} bold />
          <FieldRow label="Assunto" value={legalData?.assunto} />
          <FieldRow label="Órgão / Vara" value={legalData?.orgao} />
          <FieldRow label="Data Autuação" value={legalData?.dataAutuacao} />
        </div>
      </div>

      {/* Partes */}
      {(legalData?.poloAtivo || legalData?.poloPassivo) && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="bg-muted/50 border-b px-4 py-2.5 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Partes Envolvidas
            </span>
          </div>
          <div className="p-4 space-y-2">
            {legalData?.poloAtivo && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-success shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Polo Ativo (Autor / Agravante)</p>
                  <p className="text-sm font-semibold text-foreground">{legalData.poloAtivo}</p>
                </div>
              </div>
            )}
            {legalData?.poloPassivo && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-urgent shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Polo Passivo (Réu / Agravado)</p>
                  <p className="text-sm font-semibold text-foreground">{legalData.poloPassivo}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decisão */}
      {legalData?.decisionType && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="bg-muted/50 border-b px-4 py-2.5 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Decisão / Movimentação
            </span>
          </div>
          <div className="p-4">
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              legalData.decisionType.includes("Concedida") || legalData.decisionType === "Sentença Proferida"
                ? "bg-urgent/10 border-urgent/20"
                : legalData.decisionType.includes("Mero Expediente")
                  ? "bg-muted border-border"
                  : "bg-warning/10 border-warning/20"
            )}>
              <AlertTriangle className={cn("h-5 w-5 shrink-0",
                legalData.decisionType.includes("Concedida") || legalData.decisionType === "Sentença Proferida"
                  ? "text-urgent"
                  : legalData.decisionType.includes("Mero Expediente")
                    ? "text-muted-foreground"
                    : "text-warning"
              )} />
              <div>
                <p className="text-sm font-bold text-foreground">{legalData.decisionType}</p>
                {legalData.whatWasDone && legalData.whatWasDone !== legalData.decisionType && (
                  <p className="text-xs text-muted-foreground mt-0.5">{legalData.whatWasDone}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movimentações */}
      {legalData && legalData.movimentos.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="bg-muted/50 border-b px-4 py-2.5 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Última(s) Movimentação(ões)
            </span>
          </div>
          <div className="p-4 space-y-2">
            {legalData.movimentos.map((mov, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground font-mono text-xs min-w-[120px] shrink-0 mt-0.5">{mov.date}</span>
                <span className="text-foreground">{mov.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* O que fazer */}
      {legalData && legalData.whatToDo.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="bg-muted/50 border-b px-4 py-2.5 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Providências Necessárias
            </span>
          </div>
          <div className="p-4 space-y-1.5">
            {legalData.whatToDo.map((action, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmailSummaryLevels } from "@/components/EmailSummaryLevels";
import { cn } from "@/lib/utils";
import {
  Mail, Calendar, DollarSign, Scale, User, FileText, Clock,
  AlertTriangle, CheckCircle, Building2, Hash, Gavel, Users,
  ArrowRight, ExternalLink, Copy
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface EmailDetail {
  id: string;
  gmail_id: string;
  subject: string | null;
  sender: string | null;
  snippet: string | null;
  received_at: string | null;
  category: string;
  ai_summary: string | null;
  extracted_deadline: string | null;
  extracted_value: number | null;
  task_created: boolean;
  account_email: string | null;
  domain: string;
  summary_short: string | null;
  summary_medium: string | null;
  summary_full: string | null;
  requires_action: boolean;
  requires_response: boolean;
  is_informational: boolean;
  process_id: string | null;
}

interface EmailDetailSheetProps {
  email: EmailDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabels: Record<string, string> = {
  pagamentos: "Pagamentos",
  boletos: "Boletos",
  prazos: "Prazos",
  promocoes: "Promoções",
  contatos: "Contatos",
  processos: "Processos",
  sinistros: "Sinistros",
  intimacoes: "Intimações",
  outros: "Outros",
};

const categoryColors: Record<string, string> = {
  pagamentos: "bg-success/10 text-success border-success/20",
  boletos: "bg-warning/10 text-warning border-warning/20",
  prazos: "bg-urgent/10 text-urgent border-urgent/20",
  promocoes: "bg-primary/10 text-primary border-primary/20",
  contatos: "bg-accent text-accent-foreground border-border",
  processos: "bg-primary/10 text-primary border-primary/20",
  sinistros: "bg-warning/10 text-warning border-warning/20",
  intimacoes: "bg-urgent/10 text-urgent border-urgent/20",
  outros: "bg-muted text-muted-foreground border-border",
};

function InfoRow({ icon: Icon, label, value, className }: { icon: typeof Mail; label: string; value: string | null | undefined; className?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium text-foreground", className)}>{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: typeof Mail }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

export function EmailDetailSheet({ email, open, onOpenChange }: EmailDetailSheetProps) {
  if (!email) return null;

  const cat = email.category || "outros";
  const isLegal = email.domain === "juridico" || ["processos", "intimacoes", "prazos"].includes(cat);
  const isFinancial = ["pagamentos", "boletos"].includes(cat);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Texto copiado para a área de transferência." });
  };

  // Extract structured info from AI summary for display
  const extractProcessNumber = () => {
    const summary = email.ai_summary || email.summary_full || email.snippet || "";
    const match = summary.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
    return match ? match[1] : null;
  };

  const processNumber = extractProcessNumber();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            {isLegal && <Scale className="h-5 w-5 text-primary" />}
            {isFinancial && <DollarSign className="h-5 w-5 text-success" />}
            {!isLegal && !isFinancial && <Mail className="h-5 w-5 text-primary" />}
            <SheetTitle className="text-left text-base leading-tight">
              {email.subject || "(sem assunto)"}
            </SheetTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={categoryColors[cat]}>
              {categoryLabels[cat] || cat}
            </Badge>
            {email.requires_action && (
              <Badge variant="outline" className="bg-urgent/10 text-urgent border-urgent/30 text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Ação necessária
              </Badge>
            )}
            {email.requires_response && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                <ArrowRight className="h-3 w-3 mr-1" />
                Requer resposta
              </Badge>
            )}
            {email.task_created && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">
                <CheckCircle className="h-3 w-3 mr-1" />
                Tarefa criada
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {/* Resumo IA em 3 níveis */}
        <div className="py-4">
          <SectionHeader title="Análise da IA" icon={FileText} />
          <EmailSummaryLevels
            summaryShort={email.summary_short}
            summaryMedium={email.summary_medium}
            summaryFull={email.summary_full}
            aiSummary={email.ai_summary}
            requiresAction={email.requires_action}
            requiresResponse={email.requires_response}
            isInformational={email.is_informational}
          />
        </div>

        <Separator />

        {/* Dados do Email */}
        <div>
          <SectionHeader title="Dados do Email" icon={Mail} />
          <InfoRow icon={User} label="Remetente" value={email.sender} />
          <InfoRow icon={Mail} label="Conta" value={email.account_email} />
          <InfoRow
            icon={Calendar}
            label="Recebido em"
            value={email.received_at ? format(new Date(email.received_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR }) : null}
          />
        </div>

        <Separator />

        {/* Dados do Processo (se jurídico) */}
        {isLegal && (
          <>
            <div>
              <SectionHeader title="Dados do Processo" icon={Gavel} />
              {processNumber ? (
                <div className="flex items-start gap-3 py-2">
                  <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Número do Processo</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-primary">{processNumber}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(processNumber)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <InfoRow icon={Hash} label="Número do Processo" value="Não identificado no email" className="text-muted-foreground italic" />
              )}

              {email.process_id && (
                <InfoRow icon={Scale} label="Processo Vinculado" value="Sim — vinculado ao sistema" className="text-success" />
              )}

              {/* Campos típicos de processo jurídico */}
              <InfoRow icon={Building2} label="Classe" value={extractField("classe")} />
              <InfoRow icon={FileText} label="Assunto" value={extractField("assunto")} />
              <InfoRow icon={Users} label="Partes" value={extractField("partes")} />
              <InfoRow icon={Gavel} label="Vara / Câmara" value={extractField("vara")} />
              <InfoRow icon={Clock} label="Última Movimentação" value={extractField("movimentacao")} />
            </div>
            <Separator />
          </>
        )}

        {/* Dados Financeiros (se financeiro) */}
        {isFinancial && (
          <>
            <div>
              <SectionHeader title="Dados Financeiros" icon={DollarSign} />
              {email.extracted_value && (
                <InfoRow
                  icon={DollarSign}
                  label="Valor Identificado"
                  value={`R$ ${email.extracted_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  className="text-success font-bold"
                />
              )}
              <InfoRow icon={Calendar} label="Vencimento" value={
                email.extracted_deadline ? format(new Date(email.extracted_deadline), "dd/MM/yyyy") : null
              } className="text-urgent font-semibold" />
            </div>
            <Separator />
          </>
        )}

        {/* Prazos e Valores (sempre visível se existir) */}
        {(email.extracted_deadline || email.extracted_value) && !isFinancial && (
          <>
            <div>
              <SectionHeader title="Prazos e Valores" icon={Calendar} />
              {email.extracted_deadline && (
                <InfoRow
                  icon={AlertTriangle}
                  label="Prazo Extraído"
                  value={format(new Date(email.extracted_deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  className="text-urgent font-semibold"
                />
              )}
              {email.extracted_value && (
                <InfoRow
                  icon={DollarSign}
                  label="Valor Identificado"
                  value={`R$ ${email.extracted_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  className="text-success"
                />
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Trecho original */}
        {email.snippet && (
          <div className="pb-6">
            <SectionHeader title="Trecho Original" icon={FileText} />
            <div className="rounded-lg border bg-muted/50 p-3 mt-1">
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{email.snippet}</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Helper to try extracting structured fields from AI summary text
function extractField(field: string): string | null {
  // These fields would ideally come from dedicated DB columns.
  // For now, returns null — they'll be populated when the AI extraction is enhanced.
  return null;
}

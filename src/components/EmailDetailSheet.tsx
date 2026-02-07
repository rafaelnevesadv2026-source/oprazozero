import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Mail, Calendar, DollarSign, Scale, User, FileText, Clock,
  AlertTriangle, CheckCircle, Building2, Hash, Gavel, Users,
  ArrowRight, Copy, Zap, Info, Shield, TrendingUp,
  CircleDot, ChevronRight, ExternalLink, Flag
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import type { GmailEmail } from "@/hooks/useGmail";

interface EmailDetailSheetProps {
  email: GmailEmail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabels: Record<string, string> = {
  pagamentos: "Pagamentos", boletos: "Boletos", prazos: "Prazos",
  promocoes: "Promoções", contatos: "Contatos", processos: "Processos",
  sinistros: "Sinistros", intimacoes: "Intimações", outros: "Outros",
};

const categoryColors: Record<string, string> = {
  pagamentos: "bg-success/10 text-success border-success/20",
  boletos: "bg-warning/10 text-warning border-warning/20",
  prazos: "bg-urgent/10 text-urgent border-urgent/20",
  processos: "bg-primary/10 text-primary border-primary/20",
  intimacoes: "bg-urgent/10 text-urgent border-urgent/20",
  sinistros: "bg-warning/10 text-warning border-warning/20",
  contatos: "bg-accent text-accent-foreground border-border",
  promocoes: "bg-primary/10 text-primary border-primary/20",
  outros: "bg-muted text-muted-foreground border-border",
};

const domainConfig: Record<string, { label: string; icon: typeof Scale; color: string }> = {
  juridico: { label: "Jurídico", icon: Scale, color: "text-primary" },
  pessoal: { label: "Pessoal", icon: User, color: "text-muted-foreground" },
};

function InfoRow({ icon: Icon, label, value, className, copyable }: {
  icon: typeof Mail; label: string; value: string | null | undefined; className?: string; copyable?: boolean;
}) {
  if (!value) return null;
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast({ title: "Copiado!", description: "Texto copiado." });
  };
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-1">
          <p className={cn("text-sm font-medium text-foreground", className)}>{value}</p>
          {copyable && (
            <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground p-0.5">
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: typeof Mail }) {
  return (
    <div className="flex items-center gap-2 pt-3 pb-1">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function TimelineItem({ date, event, status }: { date: string; event: string; status: "done" | "pending" | "alert" }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className={cn(
        "mt-1 h-2 w-2 rounded-full shrink-0",
        status === "done" && "bg-success",
        status === "pending" && "bg-warning",
        status === "alert" && "bg-urgent"
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{date}</p>
        <p className="text-sm text-foreground">{event}</p>
      </div>
    </div>
  );
}

// Extract process number from text
function extractProcessNumber(text: string): string | null {
  const match = text.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
  return match ? match[1] : null;
}

// Extract monetary values from text
function extractValues(text: string): string[] {
  const matches = text.match(/R\$\s*[\d.,]+/g);
  return matches || [];
}

// Extract dates from text
function extractDates(text: string): string[] {
  const matches = text.match(/\d{2}\/\d{2}\/\d{4}/g);
  return matches || [];
}

// Extract CPF/CNPJ
function extractDocuments(text: string): string[] {
  const cpf = text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/g) || [];
  const cnpj = text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || [];
  return [...cpf, ...cnpj];
}

export function EmailDetailSheet({ email, open, onOpenChange }: EmailDetailSheetProps) {
  if (!email) return null;

  const cat = email.category || "outros";
  const isLegal = email.domain === "juridico" || ["processos", "intimacoes", "prazos"].includes(cat);
  const isFinancial = ["pagamentos", "boletos"].includes(cat);
  const domainInfo = domainConfig[email.domain] || domainConfig.pessoal;
  const DomainIcon = domainInfo.icon;

  const fullText = [email.ai_summary, email.summary_full, email.snippet].filter(Boolean).join(" ");
  const processNumber = extractProcessNumber(fullText);
  const values = extractValues(fullText);
  const dates = extractDates(fullText);
  const documents = extractDocuments(fullText);

  // Build timeline events
  const timeline: { date: string; event: string; status: "done" | "pending" | "alert" }[] = [];
  if (email.received_at) {
    timeline.push({
      date: format(new Date(email.received_at), "dd/MM/yyyy HH:mm"),
      event: "Email recebido e analisado pela IA",
      status: "done",
    });
  }
  if (email.task_created) {
    timeline.push({ date: "Automático", event: "Tarefa criada no sistema", status: "done" });
  }
  if (email.requires_action) {
    timeline.push({ date: "Pendente", event: "Ação necessária — aguardando tratamento", status: "alert" });
  }
  if (email.requires_response) {
    timeline.push({ date: "Pendente", event: "Resposta pendente", status: "pending" });
  }
  if (email.extracted_deadline) {
    const dl = new Date(email.extracted_deadline);
    const isPast = dl < new Date();
    timeline.push({
      date: format(dl, "dd/MM/yyyy"),
      event: isPast ? "⚠️ Prazo vencido!" : "Prazo limite",
      status: isPast ? "alert" : "pending",
    });
  }

  // Determine urgency
  const getUrgencyLevel = () => {
    if (email.extracted_deadline) {
      const days = Math.ceil((new Date(email.extracted_deadline).getTime() - Date.now()) / (86400000));
      if (days < 0) return { label: "VENCIDO", color: "bg-urgent text-urgent-foreground" };
      if (days <= 3) return { label: "URGENTE", color: "bg-warning text-warning-foreground" };
    }
    if (email.requires_action) return { label: "AÇÃO NECESSÁRIA", color: "bg-urgent/10 text-urgent" };
    if (email.requires_response) return { label: "AGUARDA RESPOSTA", color: "bg-warning/10 text-warning" };
    return { label: "INFORMATIVO", color: "bg-muted text-muted-foreground" };
  };
  const urgency = getUrgencyLevel();

  // Build action recommendations
  const actions: string[] = [];
  if (email.requires_action) actions.push("Analisar conteúdo e tomar providências");
  if (email.requires_response) actions.push("Elaborar e enviar resposta");
  if (isLegal && processNumber) actions.push("Verificar prazos no sistema processual");
  if (isFinancial && email.extracted_value) actions.push("Conferir valor e registrar no financeiro");
  if (email.extracted_deadline) actions.push("Verificar prazo e agendar ação");
  if (email.task_created) actions.push("✅ Tarefa já criada automaticamente");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* HEADER */}
        <div className="p-4 pb-3 border-b bg-card">
          <SheetHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DomainIcon className={cn("h-5 w-5 shrink-0", domainInfo.color)} />
              <SheetTitle className="text-left text-base leading-tight flex-1">
                {email.subject || "(sem assunto)"}
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={cn("text-[10px] font-bold", urgency.color)}>
              {urgency.label}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", categoryColors[cat])}>
              {domainInfo.label} • {categoryLabels[cat] || cat}
            </Badge>
            {email.task_created && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">
                <CheckCircle className="h-3 w-3 mr-1" /> Tarefa
              </Badge>
            )}
          </div>

          {/* Quick info row */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="truncate">{email.sender}</span>
            {email.received_at && (
              <span className="shrink-0">{format(new Date(email.received_at), "dd/MM/yyyy HH:mm")}</span>
            )}
            {email.account_email && (
              <span className="shrink-0 text-primary">{email.account_email}</span>
            )}
          </div>
        </div>

        {/* TABS - 3 CAMADAS */}
        <Tabs defaultValue="analysis" className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
            <TabsTrigger value="analysis" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs px-4 py-2.5">
              Análise
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs px-4 py-2.5">
              Dados Extraídos
            </TabsTrigger>
            <TabsTrigger value="original" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs px-4 py-2.5">
              Email Original
            </TabsTrigger>
          </TabsList>

          {/* CAMADA 2 — ANÁLISE DETALHADA */}
          <TabsContent value="analysis" className="p-4 space-y-4 mt-0">
            {/* Resumo Executivo */}
            <div>
              <SectionHeader title="Resumo Executivo" icon={FileText} />
              <div className="rounded-lg border bg-muted/30 p-3 mt-1">
                <p className="text-sm text-foreground leading-relaxed">
                  {email.summary_full || email.summary_medium || email.ai_summary || email.snippet || "Sem resumo disponível."}
                </p>
              </div>
              {email.summary_short && (
                <p className="text-xs text-muted-foreground mt-1.5 italic">
                  TL;DR: {email.summary_short}
                </p>
              )}
            </div>

            <Separator />

            {/* Análise Inteligente */}
            <div>
              <SectionHeader title="Análise Inteligente" icon={TrendingUp} />
              <div className="space-y-2 mt-1">
                {/* Risk/Impact indicators */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Urgência</p>
                    <p className={cn("text-xs font-bold mt-0.5",
                      email.requires_action ? "text-urgent" : email.requires_response ? "text-warning" : "text-success"
                    )}>
                      {email.requires_action ? "Alta" : email.requires_response ? "Média" : "Baixa"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Impacto</p>
                    <p className={cn("text-xs font-bold mt-0.5",
                      isLegal || isFinancial ? "text-warning" : "text-muted-foreground"
                    )}>
                      {isLegal ? "Jurídico" : isFinancial ? "Financeiro" : "Informativo"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Classificação</p>
                    <p className="text-xs font-bold mt-0.5 text-foreground">
                      {email.is_informational ? "Informativo" : "Operacional"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Ações Recomendadas */}
            {actions.length > 0 && (
              <div>
                <SectionHeader title="Ações Recomendadas" icon={Zap} />
                <div className="space-y-1 mt-1">
                  {actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Linha do Tempo */}
            {timeline.length > 0 && (
              <div>
                <SectionHeader title="Linha do Tempo" icon={Clock} />
                <div className="mt-1 border-l-2 border-border ml-1 pl-3 space-y-0">
                  {timeline.map((item, i) => (
                    <TimelineItem key={i} {...item} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* CAMADA 2B — DADOS EXTRAÍDOS */}
          <TabsContent value="data" className="p-4 space-y-4 mt-0">
            {/* Dados do Email */}
            <div>
              <SectionHeader title="Metadados" icon={Mail} />
              <InfoRow icon={User} label="Remetente" value={email.sender} copyable />
              <InfoRow icon={Mail} label="Conta receptora" value={email.account_email} />
              <InfoRow
                icon={Calendar}
                label="Recebido em"
                value={email.received_at ? format(new Date(email.received_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR }) : null}
              />
              <InfoRow icon={Scale} label="Domínio" value={domainInfo.label} />
              <InfoRow icon={Flag} label="Categoria" value={categoryLabels[cat] || cat} />
            </div>

            <Separator />

            {/* Dados Jurídicos */}
            {isLegal && (
              <>
                <div>
                  <SectionHeader title="Dados Jurídicos" icon={Gavel} />
                  <InfoRow icon={Hash} label="Nº do Processo" value={processNumber} className="text-primary font-bold" copyable />
                  {!processNumber && (
                    <InfoRow icon={Hash} label="Nº do Processo" value="Não identificado no email" className="text-muted-foreground italic" />
                  )}
                  {email.process_id && (
                    <InfoRow icon={Scale} label="Vinculação" value="Vinculado ao sistema processual" className="text-success" />
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Dados Financeiros */}
            {(isFinancial || email.extracted_value) && (
              <>
                <div>
                  <SectionHeader title="Dados Financeiros" icon={DollarSign} />
                  {email.extracted_value && (
                    <InfoRow
                      icon={DollarSign}
                      label="Valor Identificado"
                      value={`R$ ${email.extracted_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      className="text-success font-bold"
                      copyable
                    />
                  )}
                  {values.length > 0 && !email.extracted_value && (
                    <InfoRow icon={DollarSign} label="Valores mencionados" value={values.join(", ")} />
                  )}
                  {email.extracted_deadline && (
                    <InfoRow
                      icon={Calendar}
                      label="Vencimento / Prazo"
                      value={format(new Date(email.extracted_deadline), "dd/MM/yyyy")}
                      className="text-urgent font-semibold"
                    />
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Prazos */}
            {email.extracted_deadline && !isFinancial && (
              <>
                <div>
                  <SectionHeader title="Prazos" icon={AlertTriangle} />
                  <InfoRow
                    icon={Calendar}
                    label="Prazo Extraído"
                    value={format(new Date(email.extracted_deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    className="text-urgent font-semibold"
                  />
                  {(() => {
                    const days = Math.ceil((new Date(email.extracted_deadline).getTime() - Date.now()) / 86400000);
                    return (
                      <div className={cn(
                        "flex items-center gap-2 mt-1.5 p-2 rounded-md border",
                        days < 0 ? "bg-urgent/10 border-urgent/20" : days <= 3 ? "bg-warning/10 border-warning/20" : "bg-success/10 border-success/20"
                      )}>
                        <AlertTriangle className={cn("h-4 w-4 shrink-0",
                          days < 0 ? "text-urgent" : days <= 3 ? "text-warning" : "text-success"
                        )} />
                        <p className={cn("text-xs font-medium",
                          days < 0 ? "text-urgent" : days <= 3 ? "text-warning" : "text-success"
                        )}>
                          {days < 0 ? `🚨 Vencido há ${Math.abs(days)} dia(s)!` :
                            days === 0 ? "⚠️ Vence hoje!" :
                              days === 1 ? "⚠️ Vence amanhã!" :
                                `${days} dias restantes`}
                        </p>
                      </div>
                    );
                  })()}
                </div>
                <Separator />
              </>
            )}

            {/* Dados extraídos automaticamente */}
            {(documents.length > 0 || dates.length > 0) && (
              <div>
                <SectionHeader title="Dados Detectados Automaticamente" icon={Info} />
                {documents.map((doc, i) => (
                  <InfoRow key={`doc-${i}`} icon={Hash} label="CPF/CNPJ" value={doc} copyable />
                ))}
                {dates.map((d, i) => (
                  <InfoRow key={`date-${i}`} icon={Calendar} label="Data mencionada" value={d} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* CAMADA 3 — EMAIL ORIGINAL */}
          <TabsContent value="original" className="p-4 space-y-4 mt-0">
            <div>
              <SectionHeader title="Email Original Completo" icon={FileText} />
              <p className="text-[10px] text-muted-foreground mb-2">
                Conteúdo preservado sem modificação. Todo dado resumido é rastreável até este conteúdo.
              </p>
              <div className="rounded-lg border bg-muted/30 p-4 mt-1">
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assunto</p>
                    <p className="text-sm font-medium text-foreground">{email.subject || "(sem assunto)"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">De</p>
                    <p className="text-sm text-foreground">{email.sender || "Desconhecido"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Para</p>
                    <p className="text-sm text-foreground">{email.account_email || "—"}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Corpo do Email</p>
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                      {email.snippet || "Conteúdo não disponível. O trecho do email não foi capturado na sincronização."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    const text = `Assunto: ${email.subject}\nDe: ${email.sender}\nData: ${email.received_at}\n\n${email.snippet}`;
                    navigator.clipboard.writeText(text);
                    toast({ title: "Copiado!", description: "Email copiado." });
                  }}
                >
                  <Copy className="h-3 w-3" /> Copiar tudo
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer with identity */}
        <div className="border-t p-3 bg-muted/20">
          <p className="text-[10px] text-muted-foreground text-center italic">
            "Não simplifico a complexidade do seu dia. Eu organizo para você agir com precisão."
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useState, useMemo, useCallback } from "react"; 
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGmail, GmailEmail } from "@/hooks/useGmail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmailDetailSheet } from "@/components/EmailDetailSheet";
import { EmailFilters, EmailCategoryFilter, EmailDomainFilter, EmailStatusFilter } from "@/components/emails/EmailFilters";
import { EmailBulkBar } from "@/components/emails/EmailBulkBar";
import { EmailStatsBar } from "@/components/emails/EmailStatsBar";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Mail, RefreshCw, Link as LinkIcon, Calendar, DollarSign,
  Plus, Trash2, CheckCircle, Scale, User, AlertTriangle, ArrowRight,
  Clock, Info, Target, Sparkles
} from "lucide-react";
import logo from "@/assets/logo.png";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

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

const categoryLabels: Record<string, string> = {
  pagamentos: "Pagamentos", boletos: "Boletos", prazos: "Prazos",
  promocoes: "Promoções", contatos: "Contatos", processos: "Processos",
  sinistros: "Sinistros", intimacoes: "Intimações", outros: "Outros",
};

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  status: string;
  created_at: string;
}

function EmailListItem({
  email, selected, onSelect, onClick,
}: {
  email: GmailEmail; selected: boolean; onSelect: () => void; onClick: () => void;
}) {
  const cat = email.category || "outros";
  const isLegal = email.domain === "juridico" || ["processos", "intimacoes", "prazos"].includes(cat);
  const isFinancial = ["pagamentos", "boletos"].includes(cat);

  // Extract process number for display
  const fullText = [email.ai_summary, email.summary_full, email.snippet].filter(Boolean).join(" ");
  const processMatch = fullText.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card p-3 transition-all cursor-pointer hover:border-primary/40 hover:shadow-md",
        selected && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="pt-1" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <Checkbox checked={selected} className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0" onClick={onClick}>
        {/* Row 1: Labels + Subject */}
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={cn("text-[9px] shrink-0 px-1.5 py-0", categoryColors[cat])}>
            {email.domain === "juridico" ? "Jurídico" : "Pessoal"} • {categoryLabels[cat] || cat}
          </Badge>
          {email.requires_action && (
            <Badge variant="outline" className="text-[9px] bg-urgent/10 text-urgent border-urgent/30 px-1.5 py-0">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Ação
            </Badge>
          )}
          {email.requires_response && !email.requires_action && (
            <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/30 px-1.5 py-0">
              <ArrowRight className="h-2.5 w-2.5 mr-0.5" /> Resposta
            </Badge>
          )}
          {email.task_created && (
            <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/30 px-1.5 py-0">
              <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Tarefa
            </Badge>
          )}
        </div>

        {/* Row 2: Subject */}
        <p className="font-semibold text-sm text-foreground truncate">{email.subject || "(sem assunto)"}</p>

        {/* Row 3: Summary */}
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {email.summary_short || email.ai_summary || email.snippet || ""}
        </p>

        {/* Row 4: Metadata */}
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
          <span className="truncate max-w-[140px]">{email.sender}</span>
          {processMatch && (
            <span className="flex items-center gap-1 text-primary font-medium">
              <Scale className="h-3 w-3" /> {processMatch[1].slice(0, 15)}…
            </span>
          )}
          {email.extracted_deadline && (
            <span className="flex items-center gap-1 text-urgent font-medium">
              <Calendar className="h-3 w-3" />
              Prazo: {format(new Date(email.extracted_deadline), "dd/MM")}
            </span>
          )}
          {email.extracted_value && (
            <span className="flex items-center gap-1 text-success font-medium">
              <DollarSign className="h-3 w-3" />
              R$ {email.extracted_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          )}
          {email.received_at && (
            <span className="ml-auto shrink-0">{format(new Date(email.received_at), "dd MMM, HH:mm", { locale: ptBR })}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountCard({ account, onDisconnect }: { account: EmailAccount; onDisconnect: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{account.email}</span>
        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">Ativo</Badge>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDisconnect(account.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

const Emails = () => {
  const { user, session, loading: authLoading } = useAuth();
  const { connected, accounts, emails, loading, syncing, connectGmail, disconnectAccount, syncEmails, refetch } = useGmail();
  const [selectedEmail, setSelectedEmail] = useState<GmailEmail | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<EmailCategoryFilter>("all");
  const [domainFilter, setDomainFilter] = useState<EmailDomainFilter>("all");
  const [statusFilter, setStatusFilter] = useState<EmailStatusFilter>("all");
  const [reanalyzingAll, setReanalyzingAll] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState("");

  const handleReanalyzeAll = useCallback(async () => {
    if (!session) return;
    setReanalyzingAll(true);
    let totalProcessed = 0;
    try {
      let hasMore = true;
      while (hasMore) {
        setReanalyzeProgress(`Analisando... ${totalProcessed} emails processados`);
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reanalyze-emails`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ batchSize: 20 }),
          }
        );
        const json = await res.json();
        if (!json.success || json.processed === 0) {
          hasMore = false;
        } else {
          totalProcessed += json.processed;
          if ((json.remaining || 0) === 0) hasMore = false;
        }
        await refetch();
      }
      toast({ title: "Re-análise completa!", description: `${totalProcessed} email(s) re-analisados com IA avançada.` });
    } catch {
      toast({ title: "Erro na re-análise", variant: "destructive" });
    } finally {
      setReanalyzingAll(false);
      setReanalyzeProgress("");
    }
  }, [session, refetch]);

  // Compute filter counts
  const filterCounts = useMemo(() => ({
    total: emails.length,
    action: emails.filter(e => e.requires_action).length,
    response: emails.filter(e => e.requires_response).length,
    informational: emails.filter(e => e.is_informational && !e.requires_action && !e.requires_response).length,
    juridico: emails.filter(e => e.domain === "juridico").length,
    pessoal: emails.filter(e => e.domain === "pessoal").length,
  }), [emails]);

  // Stats
  const stats = useMemo(() => ({
    total: emails.length,
    urgent: emails.filter(e => e.requires_action).length,
    pending: emails.filter(e => e.requires_response).length,
    withDeadline: emails.filter(e => e.extracted_deadline).length,
    withValue: emails.filter(e => e.extracted_value).length,
    taskCreated: emails.filter(e => e.task_created).length,
  }), [emails]);

  // Apply filters
  const filteredEmails = useMemo(() => {
    let result = [...emails];
    if (domainFilter !== "all") result = result.filter(e => e.domain === domainFilter);
    if (categoryFilter !== "all") result = result.filter(e => e.category === categoryFilter);
    if (statusFilter === "action") result = result.filter(e => e.requires_action);
    if (statusFilter === "response") result = result.filter(e => e.requires_response);
    if (statusFilter === "informational") result = result.filter(e => e.is_informational && !e.requires_action && !e.requires_response);
    return result;
  }, [emails, domainFilter, categoryFilter, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredEmails.map(e => e.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleBulkAction = (action: string) => {
    toast({ title: `${action} — ${selectedIds.size} email(s)`, description: "Funcionalidade em desenvolvimento." });
    deselectAll();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <img src={logo} alt="O Prazo é Zero" className="h-10 w-auto" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Central de Emails</h1>
              <p className="text-sm text-muted-foreground">IA lê, classifica, estrutura e organiza tudo para você agir</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <>
                <Button onClick={handleReanalyzeAll} disabled={reanalyzingAll || syncing} variant="outline" size="sm" className="gap-2">
                  <Sparkles className={cn("h-4 w-4", reanalyzingAll && "animate-spin")} />
                  {reanalyzingAll ? reanalyzeProgress || "Analisando..." : "Re-analisar IA"}
                </Button>
                <Button onClick={syncEmails} disabled={syncing || reanalyzingAll} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                  {syncing ? "Sincronizando..." : "Sincronizar"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Connected accounts */}
        {connected && accounts.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Contas conectadas</h2>
              <Button onClick={connectGmail} variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Adicionar conta
              </Button>
            </div>
            <div className="space-y-2">
              {accounts.map((acc) => (
                <AccountCard key={acc.id} account={acc} onDisconnect={disconnectAccount} />
              ))}
            </div>
          </div>
        )}

        {!connected ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <LinkIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Conecte seu Gmail</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Conecte suas contas do Google para sincronizar emails automaticamente.
                A IA vai classificar, extrair dados e criar tarefas sem intervenção manual.
              </p>
              <Button onClick={connectGmail} className="gap-2"><Mail className="h-4 w-4" />Conectar Gmail</Button>
            </CardContent>
          </Card>
        ) : emails.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground mb-4">Nenhum email sincronizado ainda.</p>
              <Button onClick={syncEmails} disabled={syncing} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} /> Sincronizar agora
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <EmailStatsBar {...stats} />

            {/* Filters */}
            <EmailFilters
              category={categoryFilter}
              domain={domainFilter}
              status={statusFilter}
              onCategoryChange={setCategoryFilter}
              onDomainChange={setDomainFilter}
              onStatusChange={setStatusFilter}
              counts={filterCounts}
            />

            {/* Bulk actions bar */}
            <EmailBulkBar
              selectedCount={selectedIds.size}
              totalCount={filteredEmails.length}
              allSelected={selectedIds.size === filteredEmails.length && filteredEmails.length > 0}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              onArchive={() => handleBulkAction("Arquivar")}
              onDelete={() => handleBulkAction("Excluir")}
              onMarkRead={() => handleBulkAction("Marcar como lido")}
            />

            {/* Email list */}
            <div className="space-y-2">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Target className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum email encontrado com os filtros atuais.</p>
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    selected={selectedIds.has(email.id)}
                    onSelect={() => toggleSelect(email.id)}
                    onClick={() => setSelectedEmail(email)}
                  />
                ))
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center py-2">
              Exibindo {filteredEmails.length} de {emails.length} email{emails.length !== 1 ? "s" : ""} analisado{emails.length !== 1 ? "s" : ""}
            </p>

            {/* Detail Sheet */}
            <EmailDetailSheet
              email={selectedEmail}
              open={!!selectedEmail}
              onOpenChange={(open) => { if (!open) setSelectedEmail(null); }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Emails;

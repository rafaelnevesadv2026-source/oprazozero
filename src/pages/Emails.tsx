import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGmail, GmailEmail } from "@/hooks/useGmail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, ArrowLeft, Mail, RefreshCw, Link as LinkIcon, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const categoryColors: Record<string, string> = {
  pagamentos: "bg-green-500/10 text-green-700 border-green-500/20",
  boletos: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  prazos: "bg-red-500/10 text-red-700 border-red-500/20",
  promocoes: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  contatos: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  outros: "bg-muted text-muted-foreground border-border",
};

const categoryLabels: Record<string, string> = {
  pagamentos: "Pagamentos",
  boletos: "Boletos",
  prazos: "Prazos",
  promocoes: "Promoções",
  contatos: "Contatos",
  outros: "Outros",
};

function EmailCard({ email }: { email: GmailEmail }) {
  const cat = email.category || "outros";
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{email.subject || "(sem assunto)"}</p>
            <p className="text-xs text-muted-foreground truncate">{email.sender}</p>
          </div>
          <Badge variant="outline" className={categoryColors[cat]}>
            {categoryLabels[cat] || cat}
          </Badge>
        </div>
        {email.ai_summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">{email.ai_summary}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {email.received_at && (
            <span>{format(new Date(email.received_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}</span>
          )}
          {email.extracted_deadline && (
            <span className="flex items-center gap-1 text-destructive">
              <Calendar className="h-3 w-3" />
              Prazo: {format(new Date(email.extracted_deadline), "dd/MM/yyyy")}
            </span>
          )}
          {email.extracted_value && (
            <span className="flex items-center gap-1 text-green-600">
              <DollarSign className="h-3 w-3" />
              R$ {email.extracted_value.toFixed(2)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const Emails = () => {
  const { user, loading: authLoading } = useAuth();
  const { connected, emails, loading, syncing, connectGmail, syncEmails } = useGmail();

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
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Emails Analisados</h1>
              <p className="text-sm text-muted-foreground">Integração Gmail + IA</p>
            </div>
          </div>
        </div>

        {!connected ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <LinkIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Conecte seu Gmail</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Conecte sua conta do Google para sincronizar emails automaticamente.
                A IA vai classificar cada mensagem e extrair prazos, valores e ações.
              </p>
              <Button onClick={connectGmail} className="gap-2">
                <Mail className="h-4 w-4" />
                Conectar Gmail
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {emails.length} email{emails.length !== 1 ? "s" : ""} analisado{emails.length !== 1 ? "s" : ""}
              </p>
              <Button onClick={syncEmails} disabled={syncing} variant="outline" size="sm" className="gap-2">
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
            </div>

            {emails.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-muted-foreground mb-4">Nenhum email sincronizado ainda.</p>
                  <Button onClick={syncEmails} disabled={syncing} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                    Sincronizar agora
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => (
                  <EmailCard key={email.id} email={email} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Emails;

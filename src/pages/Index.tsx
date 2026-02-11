import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Send, 
  Bot, 
  Scale, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Search
} from "lucide-react";

// Componente de Chat Flutuante
const AIChat = () => {
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
      const { data, error } = await supabase.functions.invoke('chat-with-gpt', {
        body: { message, history: chatHistory }
      });
      
      if (error) throw error;
      setChatHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Vaso de Deus, tive um problema na conexão. Verifique sua chave da OpenAI." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-80 h-96 flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-5">
          <div className="p-3 bg-primary text-primary-foreground flex justify-between items-center rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <span className="font-bold text-sm">Assistente PRAZO ZERO</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20">X</Button>
          </div>
          <ScrollArea className="flex-1 p-4 space-y-4">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`max-w-[80%] p-2 rounded-lg text-xs ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-xs text-muted-foreground animate-pulse">Analisando...</div>}
          </ScrollArea>
          <div className="p-3 border-t flex gap-2">
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
        <Button onClick={() => setIsOpen(true)} className="rounded-full w-14 h-14 shadow-lg glow-primary">
          <MessageSquare size={24} />
        </Button>
      )}
    </div>
  );
};

const Index = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Simulação de processos (substituir pela query real do seu banco)
  const processes = [
    { id: 1, numero: "0001234-56.2024.8.26.0000", cliente: "João Silva", prazo: "12/02/2026", status: "Urgente" },
    { id: 2, numero: "0009876-12.2023.8.26.0100", cliente: "Maria Oliveira", prazo: "20/02/2026", status: "No Prazo" },
  ];

  const handleAudit = async (process: any) => {
    toast({
      title: "Auditoria Iniciada",
      description: `O GPT-4o está analisando o processo ${process.numero}...`,
    });
    
    // Aqui chamaria a função de auditoria via Supabase Edge Function
    setTimeout(() => {
      toast({
        title: "Análise Concluída",
        description: "Sugestão: Protocolar manifestação de urgência devido ao prazo de 48h.",
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo_prazo_zero.png" alt="Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">PRAZO ZERO</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Gestão Jurídica de Alta Performance</p>
            </div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar processo..." 
              className="pl-8 bg-slate-100 border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {processes.map((proc) => (
            <Card key={proc.id} className="p-5 hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Processo</p>
                  <h3 className="font-mono text-sm font-semibold">{proc.numero}</h3>
                  <p className="text-sm text-slate-600 mt-1">Cliente: {proc.cliente}</p>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${proc.status === 'Urgente' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {proc.status}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>Prazo: {proc.prazo}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Scale size={14} />
                  <span>Cível</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs">Ver Detalhes</Button>
                <Button 
                  size="sm" 
                  className="flex-1 text-xs bg-orange-600 hover:bg-orange-700"
                  onClick={() => handleAudit(proc)}
                >
                  <Bot size={14} className="mr-2" /> Auditoria IA
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <AIChat />
    </div>
  );
};

export default Index;

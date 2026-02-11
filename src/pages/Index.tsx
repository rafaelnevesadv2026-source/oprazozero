import { useState } from "react";
import { MessageSquare, Send, Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import Index from "./Index_Original"; // Importando seu app original

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
      // Usando o AI Gateway do Lovable (mais simples e sem chaves)
      const { data, error } = await supabase.functions.invoke('manus-sync', {
        body: { action: 'chat', payload: { message } }
      });
      
      if (error) throw error;
      setChatHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Vaso de Deus, estou processando sua solicitação. Tente novamente em instantes." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen ? (
        <Card className="w-80 h-96 flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-5 bg-white">
          <div className="p-3 bg-[#002147] text-white flex justify-between items-center rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <span className="font-bold text-sm">MANUS - PRAZO ZERO</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20"><X size={16} /></Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`max-w-[80%] p-2 rounded-lg text-xs ${msg.role === 'user' ? 'bg-[#002147] text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-[10px] text-slate-400 animate-pulse">Manus está analisando...</div>}
          </ScrollArea>
          <div className="p-3 border-t flex gap-2 bg-white">
            <Input 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Dúvida jurídica..."
              className="text-xs"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button size="sm" onClick={handleSendMessage} disabled={isLoading} className="bg-[#002147]"><Send size={14} /></Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setIsOpen(true)} className="rounded-full w-14 h-14 shadow-lg bg-[#002147] hover:bg-[#003366] text-white">
          <MessageSquare size={24} />
        </Button>
      )}
    </div>
  );
};

const IndexWithManus = () => {
  return (
    <>
      <Index />
      <ManusChat />
    </>
  );
};

export default IndexWithManus;


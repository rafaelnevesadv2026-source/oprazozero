import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderPlus } from "lucide-react";

interface AddProcessDialogProps {
  onAdd: (data: { processNumber: string; clientName: string; adversary?: string; domain?: string; notes?: string }) => void;
}

export function AddProcessDialog({ onAdd }: AddProcessDialogProps) {
  const [open, setOpen] = useState(false);
  const [processNumber, setProcessNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [adversary, setAdversary] = useState("");
  const [domain, setDomain] = useState("juridico");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processNumber.trim() || !clientName.trim()) return;
    onAdd({ processNumber: processNumber.trim(), clientName: clientName.trim(), adversary: adversary.trim(), domain, notes: notes.trim() });
    setProcessNumber(""); setClientName(""); setAdversary(""); setDomain("juridico"); setNotes("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-semibold">
          <FolderPlus className="h-4 w-4" />
          Novo Processo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Novo Processo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="processNumber">Número do Processo</Label>
            <Input id="processNumber" placeholder="0001234-56.2024.8.26.0001" value={processNumber} onChange={(e) => setProcessNumber(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientName">Cliente</Label>
            <Input id="clientName" placeholder="Nome do cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adversary">Parte Adversa (opcional)</Label>
            <Input id="adversary" placeholder="Nome da parte adversa" value={adversary} onChange={(e) => setAdversary(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Domínio</Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="juridico">⚖️ Jurídico</SelectItem>
                <SelectItem value="pessoal">👤 Pessoal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações Internas</Label>
            <Textarea id="notes" placeholder="Notas internas sobre o processo..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <Button type="submit" className="w-full font-semibold">Criar Processo</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Label as LabelType } from "@/hooks/useLabels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Tag } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#64748b",
];

interface LabelManagerProps {
  labels: LabelType[];
  onAdd: (name: string, color: string) => void;
  onDelete: (id: string) => void;
}

export function LabelManager({ labels, onAdd, onDelete }: LabelManagerProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), color);
    setName("");
    setColor(COLORS[0]);
    setOpen(false);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-card-foreground">Etiquetas</h3>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3">
            <Input
              placeholder="Nome da etiqueta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-6 w-6 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "var(--foreground)" : "transparent",
                    transform: color === c ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <Button size="sm" onClick={handleAdd} className="w-full">
              Criar
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-wrap gap-2">
        {labels.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma etiqueta criada.</p>
        ) : (
          labels.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: l.color }}
            >
              {l.name}
              <button onClick={() => onDelete(l.id)} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { Label as LabelType } from "@/hooks/useLabels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tag, Plus, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#64748b",
];

interface TaskLabelPickerProps {
  taskId: string;
  allLabels: LabelType[];
  onLabelsChanged?: () => void;
}

export function TaskLabelPicker({ taskId, allLabels, onLabelsChanged }: TaskLabelPickerProps) {
  const { user } = useAuth();
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [creating, setCreating] = useState(false);

  const fetchAssigned = useCallback(async () => {
    const { data } = await supabase
      .from("task_labels")
      .select("label_id")
      .eq("task_id", taskId);
    if (data) setAssignedIds(new Set(data.map((r) => r.label_id)));
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  const toggle = async (labelId: string) => {
    if (assignedIds.has(labelId)) {
      await supabase
        .from("task_labels")
        .delete()
        .eq("task_id", taskId)
        .eq("label_id", labelId);
      setAssignedIds((prev) => {
        const next = new Set(prev);
        next.delete(labelId);
        return next;
      });
    } else {
      await supabase
        .from("task_labels")
        .insert({ task_id: taskId, label_id: labelId });
      setAssignedIds((prev) => new Set(prev).add(labelId));
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    const { data } = await supabase
      .from("labels")
      .insert({ user_id: user.id, name: newName.trim(), color: newColor })
      .select("id")
      .single();
    if (data) {
      // Auto-assign to this task
      await supabase.from("task_labels").insert({ task_id: taskId, label_id: data.id });
      setAssignedIds((prev) => new Set(prev).add(data.id));
      onLabelsChanged?.();
    }
    setNewName("");
    setNewColor(COLORS[0]);
    setCreating(false);
  };

  const assignedLabels = allLabels.filter((l) => assignedIds.has(l.id));

  if (loading) return null;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Etiquetas</h3>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Selecionar etiquetas</p>
            {allLabels.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto mb-2">
                {allLabels.map((label) => {
                  const isAssigned = assignedIds.has(label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggle(label.id)}
                      className={cn(
                        "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                        isAssigned && "bg-muted"
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-left text-foreground truncate">{label.name}</span>
                      {isAssigned && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            <Separator className="my-2" />
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Criar nova etiqueta</p>
            <div className="space-y-2 px-1">
              <Input
                placeholder="Nome da etiqueta"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="h-8 text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="h-5 w-5 rounded-full border-2 transition-transform"
                    style={{
                      backgroundColor: c,
                      borderColor: newColor === c ? "var(--foreground)" : "transparent",
                      transform: newColor === c ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || creating} className="w-full h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Criar e atribuir
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {assignedLabels.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem etiquetas atribuídas.</p>
        ) : (
          assignedLabels.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: l.color }}
            >
              {l.name}
              <button onClick={() => toggle(l.id)} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

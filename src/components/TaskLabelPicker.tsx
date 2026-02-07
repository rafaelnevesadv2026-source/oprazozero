import { useState, useEffect, useCallback } from "react";
import { Label as LabelType } from "@/hooks/useLabels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, Plus, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TaskLabelPickerProps {
  taskId: string;
  allLabels: LabelType[];
}

export function TaskLabelPicker({ taskId, allLabels }: TaskLabelPickerProps) {
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
          <PopoverContent className="w-56 p-2" align="end">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Selecionar etiquetas</p>
            {allLabels.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-2">Nenhuma etiqueta criada ainda.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
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

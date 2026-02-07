import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Archive, Trash2, CheckCheck, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EmailBulkBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onMarkRead: () => void;
}

export function EmailBulkBar({
  selectedCount, totalCount, allSelected,
  onSelectAll, onDeselectAll,
  onArchive, onDelete, onMarkRead,
}: EmailBulkBarProps) {
  if (selectedCount === 0) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Checkbox
          checked={false}
          onCheckedChange={() => onSelectAll()}
          className="h-4 w-4"
        />
        <span className="text-xs text-muted-foreground">
          Selecionar emails para ações em lote
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-primary/5 border border-primary/20 animate-slide-in">
      <Checkbox
        checked={allSelected}
        onCheckedChange={() => allSelected ? onDeselectAll() : onSelectAll()}
        className="h-4 w-4"
      />
      <span className="text-xs font-medium text-foreground">
        {selectedCount} de {totalCount} selecionado{selectedCount !== 1 ? "s" : ""}
      </span>

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={onMarkRead}>
          <CheckCheck className="h-3.5 w-3.5" /> Marcar lido
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={onArchive}>
          <Archive className="h-3.5 w-3.5" /> Arquivar
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-urgent hover:text-urgent" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
      </div>
    </div>
  );
}

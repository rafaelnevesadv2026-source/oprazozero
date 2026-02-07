import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface EmailSummaryLevelsProps {
  summaryShort: string | null;
  summaryMedium: string | null;
  summaryFull: string | null;
  aiSummary: string | null;
  requiresAction: boolean;
  requiresResponse: boolean;
  isInformational: boolean;
}

export function EmailSummaryLevels({ summaryShort, summaryMedium, summaryFull, aiSummary, requiresAction, requiresResponse, isInformational }: EmailSummaryLevelsProps) {
  const [level, setLevel] = useState<1 | 2 | 3>(1);

  const hasLevels = summaryShort || summaryMedium || summaryFull;

  if (!hasLevels && !aiSummary) return null;

  return (
    <div className="space-y-2">
      {/* Level selector */}
      {hasLevels && (
        <div className="flex items-center gap-1">
          {([1, 2, 3] as const).map((l) => (
            <Button key={l} variant={level === l ? "default" : "ghost"} size="sm"
              className="h-5 text-[10px] px-1.5" onClick={() => setLevel(l)}>
              {l === 1 ? "Rápido" : l === 2 ? "Resumo" : "Completo"}
            </Button>
          ))}
        </div>
      )}

      {/* Summary content */}
      <div className="text-sm text-muted-foreground">
        {hasLevels ? (
          <>
            {level === 1 && <p className="font-medium">{summaryShort || aiSummary}</p>}
            {level === 2 && <p className="whitespace-pre-line">{summaryMedium || aiSummary}</p>}
            {level === 3 && <p className="whitespace-pre-line">{summaryFull || aiSummary}</p>}
          </>
        ) : (
          <p className="line-clamp-2">{aiSummary}</p>
        )}
      </div>

      {/* Action badges */}
      <div className="flex items-center gap-1.5">
        {requiresAction && <Badge variant="outline" className="text-[10px] bg-urgent/10 text-urgent border-urgent/30">Ação necessária</Badge>}
        {requiresResponse && <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">Requer resposta</Badge>}
        {isInformational && !requiresAction && !requiresResponse && <Badge variant="outline" className="text-[10px]">Informativo</Badge>}
      </div>
    </div>
  );
}

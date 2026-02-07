// Extracts structured legal data from email body text (PJe Push format and similar)

export interface LegalData {
  poloAtivo: string | null;
  poloPassivo: string | null;
  classeJudicial: string | null;
  orgao: string | null;
  assunto: string | null;
  dataAutuacao: string | null;
  movimentos: { date: string; description: string }[];
  decisionType: string | null;
  whatWasDone: string | null;
  whatToDo: string[];
}

// Simple field extraction: find "Label: Value" where value goes until next known label or end
function extractField(text: string, ...labels: string[]): string | null {
  // All possible next-field labels to stop at
  const stopLabels = [
    "Polo Ativo", "Polo Passivo", "Classe Judicial", "Classe judicial",
    "Órgão", "Orgão", "ÃrgÃ£o", "Ãrg", "Data de Autuação", "Data de AutuaÃ§Ã£o",
    "Assunto", "Data -", "Data - Movimento", "Caso n", "ATENÇÃO", "ATENÃÃO",
    "Número do Processo", "NÃºmero do Processo",
    "Prezado", "Informamos"
  ];

  for (const label of labels) {
    // Build a stop pattern from all labels except the current one
    const otherLabels = stopLabels
      .filter(l => l.toLowerCase() !== label.toLowerCase())
      .map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join("|");

    const regex = new RegExp(
      label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 
      "[:\\s]+(.+?)(?=\\s*(?:" + otherLabels + ")[:\\s]|$)",
      "is"
    );
    const match = text.match(regex);
    if (match && match[1].trim()) {
      // Clean up the value
      let val = match[1].trim();
      // Remove trailing "Diário." or similar noise
      val = val.replace(/\s*DiÃ¡rio\.?\s*$/, "").replace(/\s*Diário\.?\s*$/, "").trim();
      if (val.length > 0 && val.length < 500) return val;
    }
  }
  return null;
}

const DECISION_KEYWORDS: { pattern: RegExp; label: string; severity: "high" | "medium" | "low" }[] = [
  { pattern: /sent[eê]n[cç]a/i, label: "Sentença Proferida", severity: "high" },
  { pattern: /SentenÃ§a/i, label: "Sentença Proferida", severity: "high" },
  { pattern: /tutela.*urg[eê]ncia.*concedida/i, label: "Tutela de Urgência Concedida", severity: "high" },
  { pattern: /tutela.*urg[eê]ncia.*indeferida/i, label: "Tutela de Urgência Indeferida", severity: "high" },
  { pattern: /tutela.*urg[eê]ncia/i, label: "Tutela de Urgência", severity: "high" },
  { pattern: /liminar.*concedida/i, label: "Liminar Concedida", severity: "high" },
  { pattern: /liminar.*indeferida/i, label: "Liminar Indeferida", severity: "high" },
  { pattern: /julgamento.*antecipado/i, label: "Julgamento Antecipado", severity: "high" },
  { pattern: /ac[oó]rd[aã]o/i, label: "Acórdão", severity: "high" },
  { pattern: /AcÃ³rdÃ£o/i, label: "Acórdão", severity: "high" },
  { pattern: /decis[aã]o.*interlocut/i, label: "Decisão Interlocutória", severity: "high" },
  { pattern: /DecisÃ£o/i, label: "Decisão Interlocutória", severity: "high" },
  { pattern: /Proferido despacho de mero expediente/i, label: "Despacho de Mero Expediente", severity: "low" },
  { pattern: /despacho.*mero.*expediente/i, label: "Despacho de Mero Expediente", severity: "low" },
  { pattern: /ExpediÃ§Ã£o de IntimaÃ§Ã£o/i, label: "Expedição de Intimação", severity: "medium" },
  { pattern: /expedi[cç][aã]o.*intima[cç][aã]o/i, label: "Expedição de Intimação", severity: "medium" },
  { pattern: /IntimaÃ§Ã£o/i, label: "Intimação", severity: "medium" },
  { pattern: /intima[cç][aã]o/i, label: "Intimação", severity: "medium" },
  { pattern: /CitaÃ§Ã£o/i, label: "Citação", severity: "medium" },
  { pattern: /cita[cç][aã]o/i, label: "Citação", severity: "medium" },
  { pattern: /despacho/i, label: "Despacho", severity: "medium" },
  { pattern: /AudiÃªncia/i, label: "Audiência", severity: "high" },
  { pattern: /audi[eê]ncia.*designada/i, label: "Audiência Designada", severity: "high" },
  { pattern: /audi[eê]ncia/i, label: "Audiência", severity: "high" },
  { pattern: /mandado/i, label: "Mandado Expedido", severity: "medium" },
  { pattern: /penhora/i, label: "Penhora", severity: "high" },
  { pattern: /embargo/i, label: "Embargos", severity: "medium" },
  { pattern: /recurso/i, label: "Recurso", severity: "medium" },
  { pattern: /tr[aâ]nsito.*julgado/i, label: "Trânsito em Julgado", severity: "high" },
  { pattern: /cumprimento.*sent/i, label: "Cumprimento de Sentença", severity: "high" },
  { pattern: /arquivamento/i, label: "Arquivamento", severity: "medium" },
];

const ACTION_MAP: Record<string, string[]> = {
  "Sentença Proferida": ["Ler sentença completa no PJe", "Verificar se houve condenação", "Avaliar necessidade de recurso", "Informar cliente sobre resultado"],
  "Tutela de Urgência Concedida": ["Verificar termos da tutela", "Cumprir determinações judiciais", "Informar cliente sobre decisão favorável"],
  "Tutela de Urgência Indeferida": ["Avaliar cabimento de agravo de instrumento", "Informar cliente sobre indeferimento"],
  "Tutela de Urgência": ["Verificar teor da decisão sobre tutela", "Avaliar próximos passos"],
  "Liminar Concedida": ["Cumprir determinações da liminar", "Informar cliente"],
  "Liminar Indeferida": ["Avaliar cabimento de recurso", "Informar cliente"],
  "Expedição de Intimação": ["Aguardar publicação no Diário", "Verificar teor da intimação no PJe", "Controlar prazo a partir da publicação"],
  "Intimação": ["Verificar teor da intimação", "Controlar prazo processual", "Tomar providências necessárias"],
  "Citação": ["Preparar contestação", "Controlar prazo de 15 dias úteis"],
  "Despacho de Mero Expediente": ["Acompanhar — sem ação imediata necessária"],
  "Despacho": ["Verificar conteúdo do despacho no PJe", "Cumprir determinação se houver"],
  "Audiência Designada": ["Anotar data da audiência", "Preparar cliente e documentos", "Confirmar pauta"],
  "Audiência": ["Verificar data e pauta", "Preparar-se para audiência"],
  "Mandado Expedido": ["Verificar conteúdo do mandado", "Acompanhar cumprimento"],
  "Acórdão": ["Ler inteiro teor do acórdão", "Avaliar cabimento de recurso especial/extraordinário"],
  "Decisão Interlocutória": ["Verificar teor da decisão", "Avaliar necessidade de recurso"],
  "Trânsito em Julgado": ["Verificar se houve condenação", "Iniciar cumprimento de sentença se favorável"],
  "Cumprimento de Sentença": ["Verificar valores e termos", "Tomar providências para cumprimento"],
};

export function extractLegalData(bodyText: string | null | undefined, summaryFull: string | null | undefined): LegalData {
  const text = [bodyText, summaryFull].filter(Boolean).join("\n\n");
  
  // Extract parties
  const poloAtivo = extractField(text, "Polo Ativo");
  const poloPassivo = extractField(text, "Polo Passivo");
  const classeJudicial = extractField(text, "Classe Judicial", "Classe judicial");
  const orgao = extractField(text, "Órgão", "Orgão", "ÃrgÃ£o");
  const assunto = extractField(text, "Assunto");
  const dataAutuacao = extractField(text, "Data de Autuação", "Data de AutuaÃ§Ã£o");

  // Also try to extract from summary_full which is clean text
  const poloAtivoClean = poloAtivo || extractFromSummary(summaryFull, /(?:autor|polo ativo|agravante)[^:]*?(?:é|:)\s*([^,.]+)/i);
  const poloPassivoClean = poloPassivo || extractFromSummary(summaryFull, /(?:réu|polo passivo|agravado)[^:]*?(?:é|:)\s*([^,.]+)/i);
  const classeClean = classeJudicial || extractFromSummary(summaryFull, /(?:classificad[oa]|classe)[^:]*?(?:como|:)\s*([^,.]+)/i);

  // Extract movements: "DD/MM/YYYY HH:MM - Description"
  const movimentos: { date: string; description: string }[] = [];
  const movRegex = /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})\s*-\s*(.+?)(?=\s*(?:Caso|ATEN|Diário|\d{2}\/\d{2}\/\d{4}|$))/gi;
  let match;
  while ((match = movRegex.exec(text)) !== null) {
    movimentos.push({ date: match[1].trim(), description: match[2].trim() });
  }

  // Identify decision type
  let decisionType: string | null = null;
  let whatWasDone: string | null = null;
  
  const searchText = movimentos.map(m => m.description).join(" ") + " " + text;
  
  for (const kw of DECISION_KEYWORDS) {
    if (kw.pattern.test(searchText)) {
      decisionType = kw.label;
      const relevantMov = movimentos.find(m => kw.pattern.test(m.description));
      whatWasDone = relevantMov ? `${relevantMov.date} — ${relevantMov.description}` : kw.label;
      break;
    }
  }

  // Determine what to do
  const whatToDo = decisionType ? (ACTION_MAP[decisionType] || ["Verificar detalhes no sistema processual"]) : [];

  return {
    poloAtivo: poloAtivoClean,
    poloPassivo: poloPassivoClean,
    classeJudicial: classeClean,
    orgao,
    assunto,
    dataAutuacao,
    movimentos,
    decisionType,
    whatWasDone,
    whatToDo,
  };
}

function extractFromSummary(summary: string | null | undefined, regex: RegExp): string | null {
  if (!summary) return null;
  const match = summary.match(regex);
  if (match && match[1]) {
    const val = match[1].trim();
    if (val.length > 2 && val.length < 200) return val;
  }
  return null;
}

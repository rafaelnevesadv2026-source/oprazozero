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

// All possible field labels (used as stop boundaries)
const ALL_LABELS = [
  "Polo Ativo", "Polo Passivo", "Classe Judicial", "Classe judicial",
  "Órgão", "Orgão", "ÃrgÃ£o",
  "Data de Autuação", "Data de AutuaÃ§Ã£o",
  "Assunto", "Data - Movimento", "Data -",
  "Caso n", "ATENÇÃO", "ATENÃÃO",
  "Número do Processo", "NÃºmero do Processo",
  "Prezado", "Informamos",
];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Extract field by label, stopping at the next known label
function extractField(text: string, ...labels: string[]): string | null {
  for (const label of labels) {
    const otherLabels = ALL_LABELS
      .filter(l => l.toLowerCase() !== label.toLowerCase())
      .map(escapeRegex)
      .join("|");

    const regex = new RegExp(
      escapeRegex(label) + "[:\\s]+(.+?)(?=\\s*(?:" + otherLabels + ")[:\\s]|$)",
      "is"
    );
    const match = text.match(regex);
    if (match && match[1].trim().length > 0 && match[1].trim().length < 500) {
      let val = match[1].trim();
      val = val.replace(/\s*DiÃ¡rio\.?\s*$/i, "").replace(/\s*Diário\.?\s*$/i, "").trim();
      if (val.length > 0) return val;
    }
  }
  return null;
}

// Extract data from clean summary text using flexible patterns
function extractFromSummary(text: string | null | undefined, patterns: RegExp[]): string | null {
  if (!text) return null;
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = match[1].trim();
      if (val.length > 2 && val.length < 200) return val;
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
  { pattern: /Juntada de Peti[cç][aã]o/i, label: "Juntada de Petição", severity: "low" },
  { pattern: /Juntada de PetiÃ§Ã£o/i, label: "Juntada de Petição", severity: "low" },
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
  { pattern: /movimenta[cç][aã]o/i, label: "Movimentação Processual", severity: "low" },
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
  "Juntada de Petição": ["Verificar teor da petição juntada no PJe", "Avaliar se necessita resposta"],
  "Movimentação Processual": ["Acessar o PJe para verificar detalhes da movimentação", "Acompanhar andamento"],
};

export function extractLegalData(
  bodyText: string | null | undefined,
  summaryFull: string | null | undefined,
  snippet?: string | null | undefined,
  aiSummary?: string | null | undefined,
): LegalData {
  // Combine all available text sources
  const text = [bodyText, snippet, summaryFull, aiSummary].filter(Boolean).join("\n\n");
  
  // Extract from structured PJe format (body_text or snippet)
  const rawText = [bodyText, snippet].filter(Boolean).join("\n\n");
  
  const poloAtivo = extractField(rawText, "Polo Ativo");
  const poloPassivo = extractField(rawText, "Polo Passivo");
  const classeJudicial = extractField(rawText, "Classe Judicial", "Classe judicial");
  const orgao = extractField(rawText, "Órgão", "Orgão", "ÃrgÃ£o");
  const assunto = extractField(rawText, "Assunto");
  const dataAutuacao = extractField(rawText, "Data de Autuação", "Data de AutuaÃ§Ã£o");

  // Fallback: extract from clean summary text (AI-generated, no mojibake)
  const cleanText = [summaryFull, aiSummary].filter(Boolean).join("\n\n");
  
  const poloAtivoFinal = poloAtivo || extractFromSummary(cleanText, [
    /(?:polo ativo|autor|requerente|agravante|reclamante|exequente)\s*(?:é|:)\s*([^,.;\n]+)/i,
    /(?:autor|requerente|agravante|reclamante|exequente)\s+(?:do processo\s+)?(?:é|:)?\s*([A-Z][A-Z\s]+(?:S\.?A\.?|LTDA|ME|EPP|EIRELI)?)/,
    /partes envolvidas[^.]*?(?:autor|polo ativo|agravante|requerente)\s*(?:é|:)?\s*([^,.;\n]+)/i,
  ]);
  
  const poloPassivoFinal = poloPassivo || extractFromSummary(cleanText, [
    /(?:polo passivo|réu|requerido|agravado|reclamado|executado)\s*(?:é|:)\s*([^,.;\n]+)/i,
    /(?:réu|requerido|agravado|reclamado|executado)\s+(?:é|:)?\s*([A-Z][A-Z\s]+(?:S\.?A\.?|LTDA|ME|EPP|EIRELI)?)/,
    /partes envolvidas[^.]*?(?:réu|polo passivo|agravado|requerido)\s*(?:é|:)?\s*([^,.;\n]+)/i,
  ]);
  
  const classeJudicialFinal = classeJudicial || extractFromSummary(cleanText, [
    /(?:classificad[oa]|classe|tipo)\s*(?:como|judicial|:)\s*([^,.;\n]+)/i,
    /(?:procedimento\s+\w+\s+\w+)/i,
  ]);

  const orgaoFinal = orgao || extractFromSummary(cleanText, [
    /(?:vara|câmara|turma|juízo|órgão|tribunal)\s*(?:de|:)?\s*([^,.;\n]+)/i,
    /(?:\d+[ªº]?\s*(?:Vara|Câmara|Turma)[^,.;\n]*)/i,
  ]);

  // Extract movements: "DD/MM/YYYY HH:MM - Description"
  const movimentos: { date: string; description: string }[] = [];
  const movRegex = /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})\s*-\s*(.+?)(?=\s*(?:Caso|ATEN|Diário|DiÃ¡rio|\d{2}\/\d{2}\/\d{4}|$))/gi;
  let match;
  while ((match = movRegex.exec(text)) !== null) {
    movimentos.push({ date: match[1].trim(), description: match[2].trim() });
  }

  // Identify decision type from all text
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

  const whatToDo = decisionType ? (ACTION_MAP[decisionType] || ["Verificar detalhes no sistema processual"]) : [];

  return {
    poloAtivo: poloAtivoFinal,
    poloPassivo: poloPassivoFinal,
    classeJudicial: classeJudicialFinal,
    orgao: orgaoFinal,
    assunto,
    dataAutuacao,
    movimentos,
    decisionType,
    whatWasDone,
    whatToDo,
  };
}

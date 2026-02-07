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

// Normalize encoding issues (Ã§ -> ç, etc)
function normalize(text: string): string {
  return text
    .replace(/Ã§/g, "ç").replace(/Ã£/g, "ã").replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í").replace(/Ãª/g, "ê").replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú").replace(/Ã¡/g, "á").replace(/Ã/g, "Á")
    .replace(/Ã‰/g, "É").replace(/Ã"/g, "Ó").replace(/Ãš/g, "Ú")
    .replace(/Ã‰/g, "É").replace(/Â/g, "").replace(/Ã¢/g, "â")
    .replace(/Ãµ/g, "õ").replace(/Ã¼/g, "ü").replace(/Ã¤/g, "ä");
}

function extractField(text: string, label: string): string | null {
  // Match "Label: value" until the next known label or newline
  const regex = new RegExp(`${label}:\\s*(.+?)(?=\\s*(?:Polo|Classe|Órgão|Orgão|Data de|Assunto|Data -|Caso não|ATENÇÃO|$))`, "is");
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

const DECISION_KEYWORDS: { pattern: RegExp; label: string; severity: "high" | "medium" | "low" }[] = [
  { pattern: /sentença/i, label: "Sentença Proferida", severity: "high" },
  { pattern: /tutela.*urg[eê]ncia.*concedida/i, label: "Tutela de Urgência Concedida", severity: "high" },
  { pattern: /tutela.*urg[eê]ncia.*indeferida/i, label: "Tutela de Urgência Indeferida", severity: "high" },
  { pattern: /tutela.*urg[eê]ncia/i, label: "Tutela de Urgência", severity: "high" },
  { pattern: /liminar.*concedida/i, label: "Liminar Concedida", severity: "high" },
  { pattern: /liminar.*indeferida/i, label: "Liminar Indeferida", severity: "high" },
  { pattern: /julgamento.*antecipado/i, label: "Julgamento Antecipado", severity: "high" },
  { pattern: /acórdão/i, label: "Acórdão", severity: "high" },
  { pattern: /decisão.*interlocut/i, label: "Decisão Interlocutória", severity: "high" },
  { pattern: /expedição.*intimação/i, label: "Expedição de Intimação", severity: "medium" },
  { pattern: /intimação/i, label: "Intimação", severity: "medium" },
  { pattern: /citação/i, label: "Citação", severity: "medium" },
  { pattern: /despacho.*mero.*expediente/i, label: "Despacho de Mero Expediente", severity: "low" },
  { pattern: /despacho/i, label: "Despacho", severity: "medium" },
  { pattern: /audiência.*designada/i, label: "Audiência Designada", severity: "high" },
  { pattern: /audiência/i, label: "Audiência", severity: "high" },
  { pattern: /mandado/i, label: "Mandado Expedido", severity: "medium" },
  { pattern: /penhora/i, label: "Penhora", severity: "high" },
  { pattern: /embargo/i, label: "Embargos", severity: "medium" },
  { pattern: /recurso/i, label: "Recurso", severity: "medium" },
  { pattern: /trânsito.*julgado/i, label: "Trânsito em Julgado", severity: "high" },
  { pattern: /cumprimento.*sentença/i, label: "Cumprimento de Sentença", severity: "high" },
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
  const raw = normalize([bodyText, summaryFull].filter(Boolean).join("\n\n"));
  
  const poloAtivo = extractField(raw, "Polo Ativo");
  const poloPassivo = extractField(raw, "Polo Passivo");
  const classeJudicial = extractField(raw, "Classe Judicial");
  const orgao = extractField(raw, "(?:Órgão|Orgão)");
  const assunto = extractField(raw, "Assunto");
  const dataAutuacao = extractField(raw, "Data de Autuação");

  // Extract movements: "Date - Description"
  const movimentos: { date: string; description: string }[] = [];
  const movRegex = /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})\s*-\s*(.+?)(?=\s*(?:Caso não|ATENÇÃO|$|\d{2}\/\d{2}\/\d{4}))/gi;
  let match;
  while ((match = movRegex.exec(raw)) !== null) {
    movimentos.push({ date: match[1].trim(), description: match[2].trim() });
  }

  // Identify decision type from movements and full text
  let decisionType: string | null = null;
  let whatWasDone: string | null = null;
  
  const searchText = movimentos.map(m => m.description).join(" ") + " " + raw;
  
  for (const kw of DECISION_KEYWORDS) {
    if (kw.pattern.test(searchText)) {
      decisionType = kw.label;
      // Use the movement description as "what was done"
      const relevantMov = movimentos.find(m => kw.pattern.test(m.description));
      whatWasDone = relevantMov ? `${relevantMov.date} — ${relevantMov.description}` : decisionType;
      break;
    }
  }

  // Determine what to do based on decision type
  const whatToDo = decisionType ? (ACTION_MAP[decisionType] || ["Verificar detalhes no sistema processual"]) : [];

  return {
    poloAtivo,
    poloPassivo,
    classeJudicial,
    orgao,
    assunto,
    dataAutuacao,
    movimentos,
    decisionType,
    whatWasDone,
    whatToDo,
  };
}

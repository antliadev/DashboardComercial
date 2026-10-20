export const prospectingStatuses = [
  "Não abordado",
  "Convite enviado",
  "Conectado",
  "Mensagem enviada",
  "Em conversa",
  "Reunião agendada",
  "Reunião realizada",
  "Encerrado / fora da prospecção",
] as const;

export type ProspectingStatus = (typeof prospectingStatuses)[number];

const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function canonicalProspectingStatus(raw: string | null | undefined): ProspectingStatus {
  const status = normalized(raw?.trim() || "");

  if (status.includes("reuniao realizada")) return "Reunião realizada";
  if (status.includes("reuniao") && status.includes("agendada")) return "Reunião agendada";
  if (
    status.includes("retirado") ||
    status.includes("fora da fila") ||
    status.includes("sem oportunidade") ||
    status.includes("sem demanda") ||
    status.includes("encerrad") ||
    status.includes("encerramento") ||
    status.includes("recusa") ||
    status.includes("descartad") ||
    status.includes("suspens") ||
    status.includes("pausa") ||
    status.includes("cliente / relacionamento")
  ) {
    return "Encerrado / fora da prospecção";
  }
  if (!status || status.includes("prospectar") || status.includes("pesquisad") || status.includes("mapeado") || status.includes("nao abord")) {
    return "Não abordado";
  }
  if (status.includes("respondeu") || status.includes("em conversa")) return "Em conversa";
  if (status.includes("mensagem") || status.includes("follow-up") || status.includes("follow up") || status.includes("primeira mensagem") || status.includes("segunda mensagem")) {
    return "Mensagem enviada";
  }
  if (status.includes("convite") && (status.includes("enviado") || status.includes("pendente") || status.includes("aceito"))) {
    return status.includes("aceito") ? "Conectado" : "Convite enviado";
  }
  if (status.includes("conectado")) return "Conectado";
  return "Não abordado";
}

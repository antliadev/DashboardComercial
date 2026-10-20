const structuredMetadataLabels = [
  "id local:",
  "responsável original:",
  "frente:",
  "fonte:",
  "data de verificação:",
  "último contato:",
  "prazo da próxima ação:",
  "regra de abordagem:",
  "confiança:",
];

export function cleanLeadObservation(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const normalized = raw.toLocaleLowerCase("pt-BR");
  const isStructuredRecord = normalized.includes("id local:") || normalized.includes("responsável original:");
  if (!isStructuredRecord) return raw;

  const narrative = raw
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter((part) => part && !structuredMetadataLabels.some((label) => part.toLocaleLowerCase("pt-BR").startsWith(label)));

  return narrative.join(" ").trim() || null;
}

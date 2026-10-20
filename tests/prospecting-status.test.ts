import { describe, expect, it } from "vitest";
import { canonicalProspectingStatus } from "../lib/prospecting-status";

describe("canonicalProspectingStatus", () => {
  it("consolida variações de convite pendente em um único status", () => {
    expect(canonicalProspectingStatus("Convite enviado; aguardando aceite")).toBe("Convite enviado");
    expect(canonicalProspectingStatus("Convite pendente de aceite")).toBe("Convite enviado");
  });

  it("consolida as etapas posteriores da cadência", () => {
    expect(canonicalProspectingStatus("Convite aceito")).toBe("Conectado");
    expect(canonicalProspectingStatus("Nova mensagem enviada; aguardando resposta")).toBe("Mensagem enviada");
    expect(canonicalProspectingStatus("Respondeu; qualificação em andamento")).toBe("Em conversa");
    expect(canonicalProspectingStatus("Reunião exploratória agendada")).toBe("Reunião agendada");
    expect(canonicalProspectingStatus("Reunião realizada; follow-up programado")).toBe("Reunião realizada");
  });

  it("preserva o caráter terminal de registros suspensos ou descartados", () => {
    expect(canonicalProspectingStatus("Convite pendente; abordagem suspensa")).toBe("Encerrado / fora da prospecção");
    expect(canonicalProspectingStatus("Mensagem de encerramento enviada; cadência em pausa")).toBe("Encerrado / fora da prospecção");
    expect(canonicalProspectingStatus("Não abordado; descartado")).toBe("Encerrado / fora da prospecção");
  });
});

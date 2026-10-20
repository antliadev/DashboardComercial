import { describe, expect, it } from "vitest";
import { cleanLeadObservation } from "../lib/lead-observation";

describe("cleanLeadObservation", () => {
  it("removes technical metadata from structured lead notes", () => {
    expect(cleanLeadObservation("ID local: CT-0787 | Responsável original: Fábio | Frente: New Logo | Fonte: Fábio Tavares, informação fornecida pelo usuário em 15/10/2026 | Data de verificação: 2026-10-15 12:00:00 | Último contato: 2026-10-14 12:00:00 | Prazo da próxima ação: 2026-10-21 12:00:00 | Regra de abordagem: Em acompanhamento | Confiança: Média | Conexão aceita em 14/10/2026. Segunda mensagem enviada em 14/10/2026 pedindo reunião e cadastro.")).toBe("Conexão aceita em 14/10/2026. Segunda mensagem enviada em 14/10/2026 pedindo reunião e cadastro.");
  });

  it("keeps ordinary commercial observations intact", () => {
    expect(cleanLeadObservation("Indicação interna; aguardar retorno do time de compras.")).toBe("Indicação interna; aguardar retorno do time de compras.");
    expect(cleanLeadObservation(null)).toBeNull();
  });
});

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OperatorName } from "@/lib/ingest-validation";

export function IngestionScreen() {
  const router = useRouter();
  const [operator, setOperator] = useState<OperatorName>("Leandro");
  const [formType, setFormType] = useState<"activity" | "contact" | "opportunity" | "homologation">("activity");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Estados do formulário de Atividade
  const [actDate, setActDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [actChannel, setActChannel] = useState("LinkedIn");
  const [actContacts, setActContacts] = useState("0");
  const [actInvites, setActInvites] = useState("0");
  const [actMessages, setActMessages] = useState("0");
  const [actReplies, setActReplies] = useState("0");
  const [actConversations, setActConversations] = useState("0");
  const [actMeetings, setActMeetings] = useState("0");
  const [actOpportunities, setActOpportunities] = useState("0");
  const [actNote, setActNote] = useState("");

  // Estados do formulário de Contato
  const [ctName, setCtName] = useState("");
  const [ctCompany, setCtCompany] = useState("");
  const [ctRole, setCtRole] = useState("");
  const [ctLinkedin, setCtLinkedin] = useState("");
  const [ctStatus, setCtStatus] = useState("Convite enviado");
  const [ctNextAction, setCtNextAction] = useState("Aguardar aceite e revisar a cadência");
  const [ctDue, setCtDue] = useState("");
  const [ctNotes, setCtNotes] = useState("");

  // Estados do formulário de Oportunidade
  const [oppTitle, setOppTitle] = useState("");
  const [oppCompany, setOppCompany] = useState("");
  const [oppValue, setOppValue] = useState("0");
  const [oppProbability, setOppProbability] = useState("20");
  const [oppStage, setOppStage] = useState("Discovery");
  const [oppNextAction, setOppNextAction] = useState("");
  const [oppDue, setOppDue] = useState("");

  // Estados de Homologação
  const [homCompany, setHomCompany] = useState("");
  const [homStatus, setHomStatus] = useState("a_validar");
  const [homPortal, setHomPortal] = useState("");
  const [homBuyer, setHomBuyer] = useState("");
  const [homLastAction, setHomLastAction] = useState("");
  const [homNextAction, setHomNextAction] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    let payload: Record<string, unknown> = {};

    if (formType === "activity") {
      payload = {
        type: "activity",
        payload: {
          operator,
          date: actDate,
          channel: actChannel,
          contacts: Number(actContacts) || 0,
          invites: Number(actInvites) || 0,
          messages: Number(actMessages) || 0,
          replies: Number(actReplies) || 0,
          conversations: Number(actConversations) || 0,
          meetings: Number(actMeetings) || 0,
          opportunities: Number(actOpportunities) || 0,
          note: actNote,
        },
      };
    } else if (formType === "contact") {
      payload = {
        type: "contact",
        payload: {
          operator,
          name: ctName,
          company: ctCompany,
          role: ctRole,
          linkedin: ctLinkedin,
          status: ctStatus,
          nextAction: ctNextAction,
          due: ctDue,
          notes: ctNotes,
        },
      };
    } else if (formType === "opportunity") {
      payload = {
        type: "opportunity",
        payload: {
          operator,
          title: oppTitle,
          company: oppCompany,
          value: Number(oppValue) || 0,
          probability: Number(oppProbability) || 0,
          stage: oppStage,
          nextAction: oppNextAction,
          nextActionDueOn: oppDue,
        },
      };
    } else if (formType === "homologation") {
      payload = {
        type: "homologation",
        payload: {
          operator,
          companyName: homCompany,
          status: homStatus,
          supplierPortalUrl: homPortal,
          buyerAreaContact: homBuyer,
          lastAction: homLastAction,
          nextAction: homNextAction,
        },
      };
    }

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Erro ao salvar dados");
      }

      setStatusMessage({ text: resData.message || "Dados enviados com sucesso!" });
      // Limpeza de campos específicos
      if (formType === "contact") {
        setCtName("");
        setCtCompany("");
        setCtRole("");
        setCtLinkedin("");
      } else if (formType === "activity") {
        setActNote("");
      } else if (formType === "opportunity") {
        setOppTitle("");
        setOppCompany("");
      } else if (formType === "homologation") {
        setHomCompany("");
      }
      router.refresh();
    } catch (err) {
      setStatusMessage({ text: err instanceof Error ? err.message : "Erro desconhecido", isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ingestContainer">
      <div className="hero" style={{ marginBottom: "24px" }}>
        <small>ENTRADA DE DADOS COMERCIAL</small>
        <h2>Lançamento Rápido de Atividades, Contatos e Oportunidades</h2>
        <p>
          Utilize esta tela para lançar informações manualmente ou delegue para o seu <strong>ChatGPT Desktop</strong> enviando
          as instruções e formato desta tela. Os dados são atribuídos ao responsável selecionado e integrados ao cockpit em tempo real.
        </p>
      </div>

      <div className="card panel" style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
        {statusMessage && (
          <div
            className="alert"
            style={{
              background: statusMessage.isError ? "#fff0f1" : "#e8f7ed",
              borderColor: statusMessage.isError ? "#f3c4cb" : "#b7ebc7",
              color: statusMessage.isError ? "#8d2435" : "#14733c",
              marginBottom: "20px",
            }}
          >
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "18px" }}>
          {/* Seletor do Responsável Operador */}
          <div style={{ background: "#f3f6f9", padding: "16px", borderRadius: "10px", border: "1px solid #dfe5eb" }}>
            <label style={{ display: "block", fontWeight: 800, marginBottom: "8px", fontSize: "13px" }}>
              QUEM ESTÁ SUBINDO ESTAS INFORMAÇÕES?
            </label>
            <div style={{ display: "flex", gap: "14px" }}>
              <button
                type="button"
                className={`button ${operator === "Leandro" ? "primary" : ""}`}
                style={{ flex: 1, border: "1px solid #dfe5eb" }}
                onClick={() => setOperator("Leandro")}
              >
                👤 Leandro
              </button>
              <button
                type="button"
                className={`button ${operator === "Fábio" ? "primary" : ""}`}
                style={{ flex: 1, border: "1px solid #dfe5eb" }}
                onClick={() => setOperator("Fábio")}
              >
                👤 Fábio
              </button>
            </div>
            <span style={{ display: "block", color: "var(--muted)", fontSize: "12px", marginTop: "6px" }}>
              Responsável selecionado atualmente: <strong>{operator}</strong>
            </span>
          </div>

          {/* Tipo de Ingestão */}
          <div>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "6px", fontSize: "13px" }}>
              O que você deseja registrar?
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`button ${formType === "activity" ? "primary" : ""}`}
                style={{ border: "1px solid #dfe5eb" }}
                onClick={() => setFormType("activity")}
              >
                📊 Lote de Atividades
              </button>
              <button
                type="button"
                className={`button ${formType === "contact" ? "primary" : ""}`}
                style={{ border: "1px solid #dfe5eb" }}
                onClick={() => setFormType("contact")}
              >
                📇 Novo Contato
              </button>
              <button
                type="button"
                className={`button ${formType === "opportunity" ? "primary" : ""}`}
                style={{ border: "1px solid #dfe5eb" }}
                onClick={() => setFormType("opportunity")}
              >
                💼 Oportunidade
              </button>
              <button
                type="button"
                className={`button ${formType === "homologation" ? "primary" : ""}`}
                style={{ border: "1px solid #dfe5eb" }}
                onClick={() => setFormType("homologation")}
              >
                🏢 Homologação
              </button>
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid #edf1f5", margin: "8px 0" }} />

          {/* Form: Atividades */}
          {formType === "activity" && (
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Data da Atividade</label>
                  <input
                    type="date"
                    required
                    value={actDate}
                    onChange={(e) => setActDate(e.target.value)}
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Canal</label>
                  <select
                    value={actChannel}
                    onChange={(e) => setActChannel(e.target.value)}
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Telefone">Telefone</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700 }}>Contatos</label>
                  <input
                    type="number"
                    min="0"
                    value={actContacts}
                    onChange={(e) => setActContacts(e.target.value)}
                    style={{ width: "100%", padding: "7px", border: "1px solid #dfe5eb", borderRadius: "6px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700 }}>Convites</label>
                  <input
                    type="number"
                    min="0"
                    value={actInvites}
                    onChange={(e) => setActInvites(e.target.value)}
                    style={{ width: "100%", padding: "7px", border: "1px solid #dfe5eb", borderRadius: "6px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700 }}>Mensagens</label>
                  <input
                    type="number"
                    min="0"
                    value={actMessages}
                    onChange={(e) => setActMessages(e.target.value)}
                    style={{ width: "100%", padding: "7px", border: "1px solid #dfe5eb", borderRadius: "6px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700 }}>Respostas</label>
                  <input
                    type="number"
                    min="0"
                    value={actReplies}
                    onChange={(e) => setActReplies(e.target.value)}
                    style={{ width: "100%", padding: "7px", border: "1px solid #dfe5eb", borderRadius: "6px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700 }}>Conversas</label>
                  <input
                    type="number"
                    min="0"
                    value={actConversations}
                    onChange={(e) => setActConversations(e.target.value)}
                    style={{ width: "100%", padding: "7px", border: "1px solid #dfe5eb", borderRadius: "6px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700 }}>Reuniões</label>
                  <input
                    type="number"
                    min="0"
                    value={actMeetings}
                    onChange={(e) => setActMeetings(e.target.value)}
                    style={{ width: "100%", padding: "7px", border: "1px solid #dfe5eb", borderRadius: "6px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700 }}>Oportunidades</label>
                  <input
                    type="number"
                    min="0"
                    value={actOpportunities}
                    onChange={(e) => setActOpportunities(e.target.value)}
                    style={{ width: "100%", padding: "7px", border: "1px solid #dfe5eb", borderRadius: "6px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Observações / Notas</label>
                <textarea
                  rows={3}
                  value={actNote}
                  onChange={(e) => setActNote(e.target.value)}
                  placeholder="Ex: Contatos abordados no Bradesco para a frente de dados..."
                  style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                />
              </div>
            </div>
          )}

          {/* Form: Contato */}
          {formType === "contact" && (
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Nome do Contato *</label>
                  <input
                    type="text"
                    required
                    value={ctName}
                    onChange={(e) => setCtName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silva"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Empresa *</label>
                  <input
                    type="text"
                    required
                    value={ctCompany}
                    onChange={(e) => setCtCompany(e.target.value)}
                    placeholder="Ex: Bradesco, Itaú, Ambev..."
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Cargo / Área</label>
                  <input
                    type="text"
                    value={ctRole}
                    onChange={(e) => setCtRole(e.target.value)}
                    placeholder="Ex: Gerente de Engenharia / Cloud"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>URL do LinkedIn</label>
                  <input
                    type="url"
                    value={ctLinkedin}
                    onChange={(e) => setCtLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/perfil"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Status Atual</label>
                  <select
                    value={ctStatus}
                    onChange={(e) => setCtStatus(e.target.value)}
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  >
                    <option value="Convite enviado">Convite enviado</option>
                    <option value="Conectado">Conectado</option>
                    <option value="Mensagem enviada">Mensagem enviada</option>
                    <option value="Em conversa">Em conversa</option>
                    <option value="Reunião agendada">Reunião agendada</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Prazo da Próxima Ação</label>
                  <input
                    type="date"
                    value={ctDue}
                    onChange={(e) => setCtDue(e.target.value)}
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Próxima Ação</label>
                <input
                  type="text"
                  value={ctNextAction}
                  onChange={(e) => setCtNextAction(e.target.value)}
                  placeholder="Ex: Follow-up sobre arquitetura cloud após 2 dias"
                  style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Observações</label>
                <textarea
                  rows={2}
                  value={ctNotes}
                  onChange={(e) => setCtNotes(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                />
              </div>
            </div>
          )}

          {/* Form: Oportunidade */}
          {formType === "opportunity" && (
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Título da Oportunidade *</label>
                  <input
                    type="text"
                    required
                    value={oppTitle}
                    onChange={(e) => setOppTitle(e.target.value)}
                    placeholder="Ex: Squad de Engenharia de Dados"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Empresa *</label>
                  <input
                    type="text"
                    required
                    value={oppCompany}
                    onChange={(e) => setOppCompany(e.target.value)}
                    placeholder="Ex: Bradesco"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Valor Previsto (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={oppValue}
                    onChange={(e) => setOppValue(e.target.value)}
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Probabilidade (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={oppProbability}
                    onChange={(e) => setOppProbability(e.target.value)}
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Estágio</label>
                  <select
                    value={oppStage}
                    onChange={(e) => setOppStage(e.target.value)}
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  >
                    <option value="Identificada">Identificada</option>
                    <option value="Discovery">Discovery</option>
                    <option value="Qualificada">Qualificada</option>
                    <option value="Proposta">Proposta</option>
                    <option value="Negociação">Negociação</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Próxima Ação *</label>
                  <input
                    type="text"
                    required
                    value={oppNextAction}
                    onChange={(e) => setOppNextAction(e.target.value)}
                    placeholder="Ex: Apresentação técnica do escopo"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Prazo da Próxima Ação</label>
                  <input
                    type="date"
                    value={oppDue}
                    onChange={(e) => setOppDue(e.target.value)}
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form: Homologação */}
          {formType === "homologation" && (
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Empresa para Homologação *</label>
                  <input
                    type="text"
                    required
                    value={homCompany}
                    onChange={(e) => setHomCompany(e.target.value)}
                    placeholder="Ex: Santander"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Status da Homologação</label>
                  <select
                    value={homStatus}
                    onChange={(e) => setHomStatus(e.target.value)}
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  >
                    <option value="a_validar">A validar</option>
                    <option value="pre_cadastro">Pré-cadastro</option>
                    <option value="email_compras">E-mail para compras</option>
                    <option value="reuniao_compras">Reunião com compras</option>
                    <option value="em_homologacao">Em homologação</option>
                    <option value="homologada">Homologada</option>
                    <option value="bloqueada">Bloqueada</option>
                    <option value="sem_avanco">Sem avanço</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Portal do Fornecedor (URL)</label>
                  <input
                    type="url"
                    value={homPortal}
                    onChange={(e) => setHomPortal(e.target.value)}
                    placeholder="https://fornecedores.empresa.com.br"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Contato de Compras</label>
                  <input
                    type="text"
                    value={homBuyer}
                    onChange={(e) => setHomBuyer(e.target.value)}
                    placeholder="Nome / E-mail de compras"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Última Ação</label>
                  <input
                    type="text"
                    value={homLastAction}
                    onChange={(e) => setHomLastAction(e.target.value)}
                    placeholder="Ex: Documentação CND enviada"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Próxima Ação</label>
                  <input
                    type="text"
                    value={homNextAction}
                    onChange={(e) => setHomNextAction(e.target.value)}
                    placeholder="Ex: Aguardar retorno do compliance"
                    style={{ width: "100%", padding: "9px", border: "1px solid #dfe5eb", borderRadius: "8px" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="button primary" disabled={loading} style={{ minWidth: "160px" }}>
              {loading ? "Salvando..." : "Gravar Dados"}
            </button>
          </div>
        </form>
      </div>

      {/* Guia para ChatGPT Desktop */}
      <div className="card panel" style={{ marginTop: "24px", padding: "20px", background: "#f8fafc" }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: "15px" }}>🤖 Integração com ChatGPT Desktop</h3>
        <p style={{ margin: "0 0 10px 0", color: "var(--muted)", fontSize: "13px" }}>
          Para que o <strong>ChatGPT Desktop</strong> suba informações automaticamente sem intervenção manual, envie o seguinte comando no chat:
        </p>
        <pre
          style={{
            background: "var(--ink)",
            color: "#fff",
            padding: "14px",
            borderRadius: "8px",
            fontSize: "12px",
            overflowX: "auto",
          }}
        >
{`Envie uma requisição HTTP POST para o endpoint do Cockpit:
URL: https://dashboard-comercial-orcin.vercel.app/api/ingest
Header: Content-Type: application/json

Corpo (Exemplo para Fábio registrar atividades):
{
  "type": "activity",
  "payload": {
    "operator": "Fábio",
    "date": "${new Date().toISOString().slice(0, 10)}",
    "channel": "LinkedIn",
    "contacts": 15,
    "invites": 15,
    "messages": 5,
    "replies": 2,
    "conversations": 1,
    "meetings": 0,
    "opportunities": 0,
    "note": "Prospecção em contas prioritárias realizada hoje."
  }
}`}
        </pre>
      </div>
    </div>
  );
}

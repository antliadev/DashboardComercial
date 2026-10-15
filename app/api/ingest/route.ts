import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  newContactInputSchema,
  newActivityInputSchema,
  newOpportunityInputSchema,
  newHomologationInputSchema,
} from "@/lib/ingest-validation";
import type { ContactRow, ActivityRow, OpportunityRow, HomologationRow } from "@/lib/database.types";

const ingestRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("contact"),
    payload: newContactInputSchema,
  }),
  z.object({
    type: z.literal("activity"),
    payload: newActivityInputSchema,
  }),
  z.object({
    type: z.literal("opportunity"),
    payload: newOpportunityInputSchema,
  }),
  z.object({
    type: z.literal("homologation"),
    payload: newHomologationInputSchema,
  }),
]);

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parsed = ingestRequestSchema.parse(rawBody);
    const orgSlug = process.env.ORGANIZATION_SLUG ?? "antlia";

    const db = getAdminDb();
    const orgRef = db.collection("organizations").doc(orgSlug);

    const now = new Date().toISOString();

    if (parsed.type === "contact") {
      const data = parsed.payload;
      const contactId = `CT-${Date.now().toString().slice(-4)}`;
      const docRef = orgRef.collection("contacts").doc(contactId);

      const contactRecord: ContactRow = {
        id: contactId,
        name: data.name,
        role_title: data.role || null,
        status_raw: data.status,
        linkedin_url: data.linkedin || null,
        last_contact_at: data.lastDate ? new Date(data.lastDate).toISOString() : now,
        owner_name: data.operator,
        account: {
          id: data.company,
          canonical_name: data.company,
        },
      };

      await docRef.set({
        ...contactRecord,
        next_action: data.nextAction || null,
        next_action_due_on: data.due || null,
        notes: data.notes || null,
        front: data.front,
        channel: data.channel,
        confidence_raw: data.confidence,
        approach_rule_raw: data.rule,
        priority_rank: data.priority,
        source: data.source,
        created_at: now,
        updated_at: now,
      });

      // Salva conta associada
      const accDoc = orgRef.collection("accounts").doc(data.company.replace(/[^a-z0-9_-]/gi, "_").toLowerCase());
      await accDoc.set(
        {
          canonical_name: data.company,
          updated_at: now,
        },
        { merge: true }
      );

      return NextResponse.json({ success: true, message: `Contato ${data.name} salvo com sucesso!`, data: contactRecord }, { status: 201 });
    }

    if (parsed.type === "activity") {
      const data = parsed.payload;
      const actId = `ACT-${Date.now().toString().slice(-4)}`;
      const docRef = orgRef.collection("activities").doc(actId);

      const actRecord: ActivityRow = {
        id: actId,
        effective_on: data.date,
        owner_name: data.operator,
        channel: { name: data.channel },
        contacts_count: data.contacts,
        invites_count: data.invites,
        messages_count: data.messages,
        replies_count: data.replies,
        conversations_count: data.conversations,
        meetings_count: data.meetings,
        opportunities_count: data.opportunities,
      };

      await docRef.set({
        ...actRecord,
        notes: data.note || null,
        created_at: now,
        updated_at: now,
      });

      return NextResponse.json({ success: true, message: `Lote de atividades de ${data.operator} registrado com sucesso!`, data: actRecord }, { status: 201 });
    }

    if (parsed.type === "opportunity") {
      const data = parsed.payload;
      const oppId = `OPP-${Date.now().toString().slice(-4)}`;
      const docRef = orgRef.collection("opportunities").doc(oppId);

      const oppRecord: OpportunityRow = {
        id: oppId,
        title: data.title,
        value_amount: data.value,
        probability: data.probability,
        expected_close_on: data.expectedCloseOn || null,
        next_action: data.nextAction,
        next_action_due_on: data.nextActionDueOn || null,
        owner_name: data.operator,
        account: {
          id: data.company,
          canonical_name: data.company,
        },
        stage: {
          name: data.stage,
          is_closed: false,
        },
      };

      await docRef.set({
        ...oppRecord,
        problem: data.problem || null,
        created_at: now,
        updated_at: now,
      });

      return NextResponse.json({ success: true, message: `Oportunidade "${data.title}" registrada com sucesso!`, data: oppRecord }, { status: 201 });
    }

    if (parsed.type === "homologation") {
      const data = parsed.payload;
      const homId = `HOM-${Date.now().toString().slice(-4)}`;
      const docRef = orgRef.collection("homologations").doc(homId);

      const homRecord: HomologationRow = {
        id: homId,
        company_name: data.companyName,
        status: data.status,
        owner_name: data.operator,
        supplier_portal_url: data.supplierPortalUrl || null,
        buyer_area_contact: data.buyerAreaContact || null,
        last_action: data.lastAction || null,
        last_action_at: data.lastActionAt || null,
        next_action: data.nextAction || null,
        next_action_due_on: data.nextActionDueOn || null,
        notes: data.notes || null,
        evidence_level: "confirmed",
        updated_at: now,
        account: {
          id: data.companyName,
          canonical_name: data.companyName,
        },
      };

      await docRef.set({
        ...homRecord,
        created_at: now,
      });

      return NextResponse.json({ success: true, message: `Homologação para ${data.companyName} registrada com sucesso!`, data: homRecord }, { status: 201 });
    }

    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[api/ingest] error:", message);
    return NextResponse.json({ error: "Falha interna ao processar registro", message }, { status: 500 });
  }
}

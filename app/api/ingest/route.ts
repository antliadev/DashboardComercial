import { NextResponse } from "next/server";
import { z } from "zod";
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

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAsTxkZJmchyj6u51QY4PPdjC3GiBnnAWw";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dashboard-comercial-a1e49";
const ORG_SLUG = process.env.ORGANIZATION_SLUG || "antlia";

async function saveToFirestoreRest(collection: string, docId: string, fields: Record<string, unknown>) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/organizations/${ORG_SLUG}/${collection}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
  
  const firestoreFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) {
      firestoreFields[k] = { nullValue: null };
    } else if (typeof v === "string") {
      firestoreFields[k] = { stringValue: v };
    } else if (typeof v === "number") {
      firestoreFields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    } else if (typeof v === "boolean") {
      firestoreFields[k] = { booleanValue: v };
    } else if (typeof v === "object") {
      firestoreFields[k] = { stringValue: JSON.stringify(v) };
    }
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: firestoreFields }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Firestore REST error ${res.status}: ${errorText}`);
  }

  return await res.json();
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parsed = ingestRequestSchema.parse(rawBody);
    const now = new Date().toISOString();

    if (parsed.type === "contact") {
      const data = parsed.payload;
      const contactId = `CT-${Date.now().toString().slice(-4)}`;

      const contactRecord: ContactRow = {
        id: contactId,
        name: data.name,
        role_title: data.role || null,
        status_raw: data.status,
        linkedin_url: data.linkedin || null,
        last_contact_at: data.lastDate ? new Date(data.lastDate).toISOString() : now,
        notes: data.notes || null,
        owner_name: data.operator,
        account: {
          id: data.company,
          canonical_name: data.company,
        },
      };

      await saveToFirestoreRest("contacts", contactId, {
        id: contactId,
        name: data.name,
        role_title: data.role || null,
        status_raw: data.status,
        linkedin_url: data.linkedin || null,
        last_contact_at: data.lastDate ? new Date(data.lastDate).toISOString() : now,
        owner_name: data.operator,
        account_name: data.company,
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

      return NextResponse.json(
        { success: true, message: `Contato ${data.name} cadastrado com sucesso sob responsabilidade de ${data.operator}!`, data: contactRecord },
        { status: 201 }
      );
    }

    if (parsed.type === "activity") {
      const data = parsed.payload;
      const actId = `ACT-${Date.now().toString().slice(-4)}`;

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

      await saveToFirestoreRest("activities", actId, {
        id: actId,
        effective_on: data.date,
        owner_name: data.operator,
        channel_name: data.channel,
        contacts_count: data.contacts,
        invites_count: data.invites,
        messages_count: data.messages,
        replies_count: data.replies,
        conversations_count: data.conversations,
        meetings_count: data.meetings,
        opportunities_count: data.opportunities,
        notes: data.note || null,
        created_at: now,
        updated_at: now,
      });

      return NextResponse.json(
        { success: true, message: `Lote de atividades lançado com sucesso por ${data.operator}!`, data: actRecord },
        { status: 201 }
      );
    }

    if (parsed.type === "opportunity") {
      const data = parsed.payload;
      const oppId = `OPP-${Date.now().toString().slice(-4)}`;

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

      await saveToFirestoreRest("opportunities", oppId, {
        id: oppId,
        title: data.title,
        value_amount: data.value,
        probability: data.probability,
        expected_close_on: data.expectedCloseOn || null,
        next_action: data.nextAction,
        next_action_due_on: data.nextActionDueOn || null,
        owner_name: data.operator,
        company_name: data.company,
        stage_name: data.stage,
        created_at: now,
        updated_at: now,
      });

      return NextResponse.json(
        { success: true, message: `Oportunidade "${data.title}" registrada com sucesso para ${data.operator}!`, data: oppRecord },
        { status: 201 }
      );
    }

    if (parsed.type === "homologation") {
      const data = parsed.payload;
      const homId = `HOM-${Date.now().toString().slice(-4)}`;

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

      await saveToFirestoreRest("homologations", homId, {
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
        created_at: now,
      });

      return NextResponse.json(
        { success: true, message: `Homologação para ${data.companyName} salva com sucesso por ${data.operator}!`, data: homRecord },
        { status: 201 }
      );
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const collection = searchParams.get("collection") || "contacts";

    if (id) {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/organizations/${ORG_SLUG}/${collection}/${encodeURIComponent(id)}?key=${FIREBASE_API_KEY}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        return NextResponse.json({ found: false, error: `Registro ${id} não encontrado na coleção ${collection}` }, { status: 404 });
      }
      const data = await res.json();
      return NextResponse.json({ found: true, id, data });
    }

    // Retorna status e metadados da rota
    return NextResponse.json({
      status: "operational",
      database: "Firestore (Google Cloud)",
      project: PROJECT_ID,
      collection,
      message: "Utilize POST para inserir dados ou passe ?id=<ID>&collection=contacts para consultar.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na leitura";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


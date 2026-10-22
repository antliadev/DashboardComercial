import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSql } from "@/lib/db";
import type { AccountRow, ActivityRow, ContactRow, HomologationRow, OpportunityRow } from "@/lib/database.types";

export interface DashboardData {
  contacts: ContactRow[];
  activities: ActivityRow[];
  opportunities: OpportunityRow[];
  accounts: AccountRow[];
  homologations: HomologationRow[];
  error: string | null;
  updatedAt: string;
}

const EMPTY: DashboardData = {
  contacts: [],
  activities: [],
  opportunities: [],
  accounts: [],
  homologations: [],
  error: null,
  updatedAt: new Date().toISOString(),
};

interface SeedContact {
  id: string;
  front?: string;
  company?: string;
  name?: string;
  role?: string;
  owner?: string;
  channel?: string;
  linkedin?: string;
  priority?: number;
  confidence?: string;
  status?: string;
  rule?: string;
  lastDate?: string;
  nextAction?: string;
  due?: string;
  source?: string;
  verifiedDate?: string;
  note?: string;
}

interface SeedActivity {
  id: string;
  date?: string;
  owner?: string;
  channel?: string;
  contacts?: number;
  invites?: number;
  messages?: number;
  replies?: number;
  conversations?: number;
  meetings?: number;
  opportunities?: number;
  note?: string;
}

let cachedSeedData: DashboardData | null = null;

function loadSeedData(): DashboardData {
  if (cachedSeedData) return cachedSeedData;
  try {
    const filePath = resolve(process.cwd(), "data/reconciled-commercial-data.json");
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    cachedSeedData = {
      contacts: parsed.contacts ?? [],
      activities: parsed.activities ?? [],
      opportunities: parsed.opportunities ?? [],
      accounts: parsed.accounts ?? [],
      homologations: parsed.homologations ?? [],
      error: null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
    return cachedSeedData;
  } catch (err) {
    console.warn("[dashboard] Could not load local reconciled seed file:", err instanceof Error ? err.message : err);
    return EMPTY;
  }
}

function parseFirestoreValue(val: Record<string, unknown> | undefined): unknown {
  if (!val) return null;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return parseInt(val.integerValue as string, 10);
  if ("doubleValue" in val) return parseFloat(val.doubleValue as string);
  if ("booleanValue" in val) return val.booleanValue;
  if ("nullValue" in val) return null;
  return null;
}

function parseFirestoreDoc(doc: { name: string; fields?: Record<string, Record<string, unknown>> }): Record<string, unknown> {
  const fields = doc.fields || {};
  const res: Record<string, unknown> = { id: doc.name.split("/").pop() };
  for (const [k, v] of Object.entries(fields)) {
    res[k] = parseFirestoreValue(v);
  }
  return res;
}

async function fetchFirestoreCollectionRest(collection: string, maxPages = 5): Promise<Record<string, unknown>[]> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAsTxkZJmchyj6u51QY4PPdjC3GiBnnAWw";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dashboard-comercial-a1e49";
  const orgSlug = process.env.ORGANIZATION_SLUG || "antlia";

  const allDocs: Record<string, unknown>[] = [];
  let pageToken = "";
  let pages = 0;

  do {
    pages++;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/organizations/${orgSlug}/${collection}?key=${apiKey}&pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) break;
    const data = (await res.json()) as { documents?: { name: string; fields?: Record<string, Record<string, unknown>> }[]; nextPageToken?: string };
    if (data.documents) {
      for (const d of data.documents) {
        allDocs.push(parseFirestoreDoc(d));
      }
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken && pages < maxPages);

  return allDocs;
}

async function getDashboardDataFromFirestore(orgSlug: string): Promise<DashboardData | null> {
  const [rawContacts, rawActivities, rawHomologations] = await Promise.all([
    fetchFirestoreCollectionRest("contacts"),
    fetchFirestoreCollectionRest("activities"),
    fetchFirestoreCollectionRest("homologations"),
  ]);

  if (rawContacts.length === 0 && rawActivities.length === 0 && rawHomologations.length === 0) {
    return null;
  }

  const contacts: ContactRow[] = rawContacts.map((raw) => ({
    id: String(raw.id || ""),
    name: String(raw.name || ""),
    role_title: raw.role_title ? String(raw.role_title) : null,
    status_raw: raw.status_raw ? String(raw.status_raw) : null,
    linkedin_url: raw.linkedin_url ? String(raw.linkedin_url) : null,
    last_contact_at: raw.last_contact_at ? String(raw.last_contact_at) : null,
    notes: raw.notes ? String(raw.notes) : null,
    owner_name: raw.owner_name ? String(raw.owner_name) : null,
    account: raw.account_name ? { id: String(raw.account_name), canonical_name: String(raw.account_name) } : null,
  }));

  const activities: ActivityRow[] = rawActivities.map((raw) => ({
    id: String(raw.id || ""),
    effective_on: String(raw.effective_on || ""),
    contacts_count: Number(raw.contacts_count || 0),
    invites_count: Number(raw.invites_count || 0),
    messages_count: Number(raw.messages_count || 0),
    replies_count: Number(raw.replies_count || 0),
    conversations_count: Number(raw.conversations_count || 0),
    meetings_count: Number(raw.meetings_count || 0),
    opportunities_count: Number(raw.opportunities_count || 0),
    owner_name: raw.owner_name ? String(raw.owner_name) : null,
    channel: { name: raw.channel_name ? String(raw.channel_name) : "LinkedIn" },
  }));

  const homologations: HomologationRow[] = rawHomologations.map((raw) => ({
    id: String(raw.id || ""),
    company_name: String(raw.company_name || ""),
    status: String(raw.status || "a_validar") as HomologationRow["status"],
    owner_name: raw.owner_name ? String(raw.owner_name) : null,
    supplier_portal_url: raw.supplier_portal_url ? String(raw.supplier_portal_url) : null,
    buyer_area_contact: raw.buyer_area_contact ? String(raw.buyer_area_contact) : null,
    last_action: raw.last_action ? String(raw.last_action) : null,
    last_action_at: raw.last_action_at ? String(raw.last_action_at) : null,
    next_action: raw.next_action ? String(raw.next_action) : null,
    next_action_due_on: raw.next_action_due_on ? String(raw.next_action_due_on) : null,
    notes: raw.notes ? String(raw.notes) : null,
    evidence_level: String(raw.evidence_level || "pending_validation") as HomologationRow["evidence_level"],
    updated_at: String(raw.updated_at || raw.created_at || new Date().toISOString()),
    account: raw.account_name ? { id: String(raw.account_name), canonical_name: String(raw.account_name) } : null,
  }));

  // Combinar com seed para oportunidades, contas e homologações caso ainda não populadas no Firestore
  const seed = loadSeedData();

  return {
    contacts,
    activities,
    opportunities: seed.opportunities,
    accounts: seed.accounts,
    homologations: homologations.length > 0 ? homologations : seed.homologations,
    error: null,
    updatedAt: new Date().toISOString(),
  };
}

async function getDashboardDataFromPostgres(orgSlug: string): Promise<DashboardData> {
  const sql = getSql();
  const orgRows = await sql`select id from public.organizations where slug=${orgSlug} limit 1`;
  const orgId = (orgRows[0] as { id?: string } | undefined)?.id;
  if (!orgId) {
    return { ...EMPTY, error: `Organização "${orgSlug}" não encontrada.`, updatedAt: new Date().toISOString() };
  }

  const [contacts, activities, opportunities, accounts, homologations] = await Promise.all([
    sql`select c.id,c.name,c.role_title,c.status_raw,c.linkedin_url,c.last_contact_at,c.notes,c.owner_name,jsonb_build_object('id',a.id,'canonical_name',a.canonical_name) account from public.contacts c join public.accounts a on a.id=c.account_id where c.deleted_at is null and c.organization_id=${orgId} order by c.updated_at desc limit 1000`,
    sql`select b.id,b.effective_on,b.contacts_count,b.invites_count,b.messages_count,b.replies_count,b.conversations_count,b.meetings_count,b.opportunities_count,b.owner_name,jsonb_build_object('name',coalesce(ch.name,'—')) channel from public.activity_batches b left join public.channels ch on ch.id=b.channel_id where b.organization_id=${orgId} order by b.effective_on desc limit 200`,
    sql`select o.id,o.title,o.value_amount,o.probability,o.expected_close_on,o.next_action,o.next_action_due_on,o.owner_name,jsonb_build_object('id',a.id,'canonical_name',a.canonical_name) account,jsonb_build_object('name',coalesce(s.name,'A validar'),'is_closed',coalesce(s.is_closed,false)) stage from public.opportunities o join public.accounts a on a.id=o.account_id left join public.opportunity_stages s on s.id=o.stage_id where o.deleted_at is null and o.organization_id=${orgId} order by o.updated_at desc limit 200`,
    sql`select id,canonical_name from public.accounts where deleted_at is null and organization_id=${orgId} order by canonical_name limit 1000`,
    sql`select h.id,h.company_name,h.status,h.owner_name,h.supplier_portal_url,h.buyer_area_contact,h.last_action,h.last_action_at,h.next_action,h.next_action_due_on,h.notes,h.evidence_level,h.updated_at,case when a.id is null then null else jsonb_build_object('id',a.id,'canonical_name',a.canonical_name) end account from public.supplier_homologations h left join public.accounts a on a.id=h.account_id where h.deleted_at is null and h.organization_id=${orgId} order by coalesce(h.next_action_due_on,h.last_action_at,h.updated_at::date) desc limit 500`,
  ]);

  return {
    contacts: contacts as unknown as ContactRow[],
    activities: activities as unknown as ActivityRow[],
    opportunities: opportunities as unknown as OpportunityRow[],
    accounts: accounts as unknown as AccountRow[],
    homologations: homologations as unknown as HomologationRow[],
    error: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function getDashboardData(orgSlug = process.env.ORGANIZATION_SLUG ?? "antlia"): Promise<DashboardData> {
  try {
    // 1. Tenta carregar do Firestore (caso credenciais administrativas e API estejam operacionais)
    try {
      const firestoreData = await getDashboardDataFromFirestore(orgSlug);
      if (firestoreData && (firestoreData.contacts.length > 0 || firestoreData.activities.length > 0)) {
        return firestoreData;
      }
    } catch {
      // Ignora erro de conexão remota ao Firestore se não configurado
    }

    // 2. Se houver DATABASE_URL válida e acessível (Supabase/Postgres)
    if (process.env.DATABASE_URL) {
      try {
        const pgData = await getDashboardDataFromPostgres(orgSlug);
        if (pgData.contacts.length > 0 || pgData.activities.length > 0) {
          return pgData;
        }
      } catch {
        // Ignora fallback postgres se inacessível
      }
    }

    // 3. Fonte canônica reconciliada incorporada (Base Oficial Reconciliada Antlia)
    const seedData = loadSeedData();
    if (seedData.contacts.length > 0 || seedData.activities.length > 0) {
      return seedData;
    }

    return { ...EMPTY, error: "Nenhum dado encontrado no banco de dados.", updatedAt: new Date().toISOString() };
  } catch (error) {
    const ref = crypto.randomUUID().slice(0, 8);
    console.error(`[dashboard] query failed ref=${ref}`, error instanceof Error ? error.message : error);
    return { ...EMPTY, error: `Falha ao consultar os dados (ref ${ref}). Tente novamente.`, updatedAt: new Date().toISOString() };
  }
}

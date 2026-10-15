import "server-only";
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

async function getDashboardDataFromFirestore(orgSlug: string): Promise<DashboardData | null> {
  const db = getAdminDb();
  const orgRef = db.collection("organizations").doc(orgSlug);
  const orgSnap = await orgRef.get();

  if (!orgSnap.exists) {
    return null;
  }

  const [contactsSnap, activitiesSnap, opportunitiesSnap, accountsSnap, homologationsSnap] = await Promise.all([
    orgRef.collection("contacts").orderBy("updated_at", "desc").limit(1000).get(),
    orgRef.collection("activities").orderBy("effective_on", "desc").limit(200).get(),
    orgRef.collection("opportunities").orderBy("updated_at", "desc").limit(200).get(),
    orgRef.collection("accounts").orderBy("canonical_name").limit(1000).get(),
    orgRef.collection("homologations").orderBy("updated_at", "desc").limit(500).get(),
  ]);

  const contacts = contactsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ContactRow));
  const activities = activitiesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityRow));
  const opportunities = opportunitiesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OpportunityRow));
  const accounts = accountsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AccountRow));
  const homologations = homologationsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as HomologationRow));

  return {
    contacts,
    activities,
    opportunities,
    accounts,
    homologations,
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
    sql`select c.id,c.name,c.role_title,c.status_raw,c.linkedin_url,c.last_contact_at,c.owner_name,jsonb_build_object('id',a.id,'canonical_name',a.canonical_name) account from public.contacts c join public.accounts a on a.id=c.account_id where c.deleted_at is null and c.organization_id=${orgId} order by c.updated_at desc limit 1000`,
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
    // 1. Tenta carregar do Firestore (Firebase padrão reconstruído)
    try {
      const firestoreData = await getDashboardDataFromFirestore(orgSlug);
      if (firestoreData && (firestoreData.contacts.length > 0 || firestoreData.activities.length > 0)) {
        return firestoreData;
      }
    } catch (fsErr) {
      console.warn("[dashboard] Firestore read attempt note:", fsErr instanceof Error ? fsErr.message : fsErr);
    }

    // 2. Fallback para Postgres/Supabase se configurado
    if (process.env.DATABASE_URL) {
      return await getDashboardDataFromPostgres(orgSlug);
    }

    return { ...EMPTY, error: "Nenhum dado encontrado no banco de dados.", updatedAt: new Date().toISOString() };
  } catch (error) {
    const ref = crypto.randomUUID().slice(0, 8);
    console.error(`[dashboard] query failed ref=${ref}`, error instanceof Error ? error.message : error);
    return { ...EMPTY, error: `Falha ao consultar o banco (ref ${ref}). Tente novamente.`, updatedAt: new Date().toISOString() };
  }
}

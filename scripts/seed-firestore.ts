import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = "dashboard-comercial-a1e49";
if (getApps().length === 0) {
  initializeApp({ projectId });
}
const db = getFirestore();

const sourcePath = resolve(process.cwd(), "REf/Dashboard_Comercial_Antlia_2026-10-06/Base_Comercial_Unica_Antlia.xlsx");
console.log(`Lendo arquivo: ${sourcePath}`);
const buffer = await readFile(sourcePath);
const sha256 = createHash("sha256").update(buffer).digest("hex");
const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

const rows = (sheet: string) =>
  XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, raw: true, defval: "" })
    .slice(4)
    .filter((r) => r.some(Boolean));

const text = (v: unknown) => String(v ?? "").trim();
const normalized = (v: unknown) => text(v).normalize("NFKC").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
const iso = (v: unknown, withTime = false) => {
  if (!v) return null;
  const d = v instanceof Date ? v : typeof v === "number" ? new Date(Date.UTC(1899, 11, 30) + v * 86400000) : new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return withTime ? d.toISOString() : d.toISOString().slice(0, 10);
};

const canonicalLinkedin = (v: unknown) => {
  try {
    const u = new URL(text(v));
    if (!u.hostname.endsWith("linkedin.com") || u.pathname.includes("/search/")) return null;
    return `https://${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
};

const priority = (v: unknown) =>
  typeof v === "number"
    ? { rank: Math.trunc(v), level: null }
    : /^\d+$/.test(text(v))
    ? { rank: Number(v), level: null }
    : { rank: null, level: text(v) || null };

const blockedIds = new Set(["CT-0012","CT-0101","CT-0148","CT-0201","CT-0203","CT-0257","CT-0258","CT-0277","CT-0314","CT-0339","CT-0340","CT-0341","CT-0355","CT-0356"]);

const contactRows = rows("Contatos");
console.log(`Total de contatos encontrados no Excel: ${contactRows.length}`);

const accountMap = new Map<string, string>();
for (const row of contactRows) {
  const name = text(row[2]);
  if (name && !accountMap.has(normalized(name))) accountMap.set(normalized(name), name);
}

const orgRef = db.collection("organizations").doc("antlia");
await orgRef.set({
  name: "Antlia Consultoria e Tecnologia",
  slug: "antlia",
  updated_at: new Date().toISOString(),
  source_hash: sha256,
});
console.log("Organização 'antlia' criada/atualizada no Firestore.");

// Batch helper for Firestore (max 500 writes per batch)
async function commitBatches(items: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }>) {
  for (let i = 0; i < items.length; i += 400) {
    const batch = db.batch();
    const slice = items.slice(i, i + 400);
    for (const item of slice) {
      batch.set(item.ref, item.data, { merge: true });
    }
    await batch.commit();
    console.log(`Salvos ${Math.min(i + 400, items.length)} de ${items.length}...`);
  }
}

// 1. Contas
const accountItems: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }> = [];
for (const [normName, canonName] of accountMap.entries()) {
  const docId = normName.replace(/[^a-z0-9_-]/g, "_").slice(0, 100) || "acc_" + Math.random().toString(36).slice(2);
  const ref = orgRef.collection("accounts").doc(docId);
  accountItems.push({
    ref,
    data: {
      canonical_name: canonName,
      normalized_name: normName,
      source: "Base_Comercial_Unica_Antlia.xlsx",
      evidence_level: "confirmed",
      updated_at: new Date().toISOString(),
    },
  });
}
console.log(`Populando ${accountItems.length} contas...`);
await commitBatches(accountItems);

// 2. Contatos
const contactItems: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }> = [];
for (const r of contactRows) {
  const p = priority(r[8]);
  const legacy = text(r[0]);
  const blocked = blockedIds.has(legacy);
  const company = text(r[2]);
  const normCompany = normalized(company);
  const accId = normCompany.replace(/[^a-z0-9_-]/g, "_").slice(0, 100) || "acc";
  const docId = legacy || "ct_" + Math.random().toString(36).slice(2);
  const ref = orgRef.collection("contacts").doc(docId);

  contactItems.push({
    ref,
    data: {
      legacy_id: legacy,
      front: text(r[1]),
      name: text(r[3]),
      normalized_name: normalized(r[3]),
      role_title: text(r[4]) || null,
      owner_name: text(r[5]) || null,
      channel: text(r[6]) || null,
      linkedin_url: text(r[7]) || null,
      linkedin_canonical: canonicalLinkedin(r[7]),
      priority_rank: p.rank,
      priority_level: p.level,
      confidence_raw: text(r[9]) || null,
      status_raw: text(r[10]) || null,
      approach_rule_raw: text(r[11]) || null,
      last_contact_at: iso(r[12], true),
      next_action: blocked ? null : text(r[13]) || null,
      next_action_due_on: blocked ? null : iso(r[14]),
      source: text(r[15]) || "Planilha oficial",
      verified_at: iso(r[16], true),
      notes: text(r[17]) || null,
      evidence_level: text(r[7]) && !canonicalLinkedin(r[7]) ? "pending_validation" : "confirmed",
      account: {
        id: accId,
        canonical_name: company,
      },
      updated_at: new Date().toISOString(),
    },
  });
}
console.log(`Populando ${contactItems.length} contatos...`);
await commitBatches(contactItems);

// 3. Atividades
const activityRows = rows("Atividades");
console.log(`Total de atividades: ${activityRows.length}`);
const activityItems: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }> = [];
for (const r of activityRows) {
  const legacyId = text(r[0]);
  const docId = legacyId || "act_" + Math.random().toString(36).slice(2);
  const ref = orgRef.collection("activities").doc(docId);
  activityItems.push({
    ref,
    data: {
      legacy_id: legacyId,
      effective_on: iso(r[1]),
      owner_name: text(r[2]) || null,
      channel: { name: text(r[3]) || "—" },
      contacts_count: Number(r[4] || 0),
      invites_count: Number(r[5] || 0),
      messages_count: Number(r[6] || 0),
      replies_count: Number(r[7] || 0),
      conversations_count: Number(r[8] || 0),
      meetings_count: Number(r[9] || 0),
      opportunities_count: Number(r[10] || 0),
      notes: text(r[11]) || null,
      updated_at: new Date().toISOString(),
    },
  });
}
console.log(`Populando ${activityItems.length} atividades...`);
await commitBatches(activityItems);

console.log("Reconstrução e carga no Firebase Firestore concluídas com sucesso!");

import { z } from "zod";

export const operatorNameSchema = z.enum(["Fábio", "Leandro", "Lucas"]);
export type OperatorName = z.infer<typeof operatorNameSchema>;

export const newContactInputSchema = z.object({
  operator: operatorNameSchema,
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres"),
  company: z.string().trim().min(2, "Empresa deve ter no mínimo 2 caracteres"),
  role: z.string().trim().optional().default(""),
  front: z.string().trim().optional().default("New Logo"),
  channel: z.string().trim().optional().default("LinkedIn"),
  linkedin: z.string().trim().optional().default(""),
  status: z.string().trim().optional().default("Convite enviado"),
  rule: z.string().trim().optional().default("Em acompanhamento"),
  priority: z.coerce.number().int().min(0).max(100).optional().default(0),
  confidence: z.string().trim().optional().default("Alta"),
  lastDate: z.string().trim().optional().default(""),
  nextAction: z.string().trim().optional().default("Aguardar aceite e revisar a cadência"),
  due: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
  source: z.string().trim().optional().default("Inserção Manual / ChatGPT"),
});

export const newActivityInputSchema = z.object({
  operator: operatorNameSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD"),
  channel: z.string().trim().optional().default("LinkedIn"),
  contacts: z.coerce.number().int().min(0).default(0),
  invites: z.coerce.number().int().min(0).default(0),
  messages: z.coerce.number().int().min(0).default(0),
  replies: z.coerce.number().int().min(0).default(0),
  conversations: z.coerce.number().int().min(0).default(0),
  meetings: z.coerce.number().int().min(0).default(0),
  opportunities: z.coerce.number().int().min(0).default(0),
  note: z.string().trim().optional().default(""),
});

export const newOpportunityInputSchema = z.object({
  operator: operatorNameSchema,
  title: z.string().trim().min(3, "Título deve ter no mínimo 3 caracteres"),
  company: z.string().trim().min(2, "Empresa é obrigatória"),
  value: z.coerce.number().min(0).default(0),
  probability: z.coerce.number().int().min(0).max(100).default(20),
  stage: z.string().trim().optional().default("Discovery"),
  expectedCloseOn: z.string().trim().optional().default(""),
  problem: z.string().trim().optional().default(""),
  nextAction: z.string().trim().min(2, "Próxima ação é obrigatória"),
  nextActionDueOn: z.string().trim().optional().default(""),
});

export const newHomologationInputSchema = z.object({
  operator: operatorNameSchema,
  companyName: z.string().trim().min(2, "Nome da empresa é obrigatório"),
  status: z.enum([
    "a_validar",
    "pre_cadastro",
    "email_compras",
    "reuniao_compras",
    "em_homologacao",
    "homologada",
    "bloqueada",
    "sem_avanco",
  ]).default("a_validar"),
  supplierPortalUrl: z.string().trim().optional().default(""),
  buyerAreaContact: z.string().trim().optional().default(""),
  lastAction: z.string().trim().optional().default(""),
  lastActionAt: z.string().trim().optional().default(""),
  nextAction: z.string().trim().optional().default(""),
  nextActionDueOn: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
});

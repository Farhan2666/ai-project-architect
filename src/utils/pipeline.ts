export interface PipelineContext {
  masterStructure: string;
  expandedSections: string[];
  compressedSummary: string;
  lore: Record<string, string[]>;
}

const DEFAULT_LORE: Record<string, string[]> = {
  app_name: [],
  core_concept: [],
  design_vibe: [],
  target_audience: [],
  tech_stack: [],
  unresolved_questions: [],
};

export function extractLore(text: string, existing: Record<string, string[]> = DEFAULT_LORE): Record<string, string[]> {
  const lore = { ...existing };
  const lines = text.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes("app name") || lower.includes("application name") || lower.includes("project name")) {
      const val = line.replace(/^.*?[::\-â€“]\s*/, "").trim();
      if (val && !lore.app_name.includes(val)) lore.app_name.push(val);
    }
    if (lower.includes("concept") || lower.includes("does") || lower.includes("solves")) {
      const val = line.replace(/^.*?[::\-â€“]\s*/, "").trim();
      if (val && val.length > 5 && !lore.core_concept.includes(val)) lore.core_concept.push(val);
    }
    if (lower.includes("vibe") || lower.includes("design") || lower.includes("ui") || lower.includes("style")) {
      const val = line.replace(/^.*?[::\-â€“]\s*/, "").trim();
      if (val && !lore.design_vibe.includes(val)) lore.design_vibe.push(val);
    }
    if (lower.includes("audience") || lower.includes("user") || lower.includes("customer")) {
      const val = line.replace(/^.*?[::\-â€“]\s*/, "").trim();
      if (val && !lore.target_audience.includes(val)) lore.target_audience.push(val);
    }
    if (lower.includes("tech") || lower.includes("stack") || lower.includes("react") || lower.includes("database") || lower.includes("api")) {
      const val = line.replace(/^.*?[::\-â€“]\s*/, "").trim();
      if (val && !lore.tech_stack.includes(val)) lore.tech_stack.push(val);
    }
  }

  return lore;
}

export function compressContext(text: string, maxTokens: number = 2000): string {
  const words = text.split(/\s+/);
  if (words.length <= maxTokens) return text;

  const sections = text.split(/(?=^###?\s)/m);
  const kept: string[] = [];
  let total = 0;

  for (const section of sections) {
    const sectionWords = section.split(/\s+/).length;
    if (total + sectionWords <= maxTokens) {
      kept.push(section);
      total += sectionWords;
    } else {
      const remaining = maxTokens - total;
      if (remaining > 50) {
        kept.push(section.split(/\s+/).slice(0, remaining).join(" ") + "\n\n[...truncated]");
      }
      break;
    }
  }

  return kept.join("\n");
}

export function getPipelineSystemPrompt(stage: number): string {
  const commonInstruction = "\n\nINSTRUKSI PENTING: \n1. Gunakan Bahasa Indonesia yang ramah dan profesional. \n2. Jadilah konsultan yang proaktif. Jangan langsung membuat dokumen final, tapi berikan masukan, ide kreatif, atau kritik membangun atas ide pengguna. \n3. Diskusikan secara bolak-balik sampai pengguna merasa idenya matang.\n4. JIKA pengguna secara spesifik meminta untuk dirangkum, difinalisasi, atau dibuatkan dokumen akhir, barulah hasilkan rangkuman terstruktur dalam format Markdown sesuai tahap ini (tanpa basa-basi).";
  const basePrompts: Record<number, string> = {
    0: "Kamu adalah Brand Strategist yang ahli. Tugasmu adalah mewawancarai pengguna dan menggali identitas brand mereka (Nama Aplikasi, Konsep Inti, Warna, Vibe UI, dan Konsep Logo)." + commonInstruction,
    1: "Kamu adalah Product Manager yang ahli. Tugasmu adalah mewawancarai pengguna dan mendefinisikan PRD (Core Problem, Target Audience, MVP Features, User Journey)." + commonInstruction,
    2: "Kamu adalah Systems Analyst yang ahli. Tugasmu adalah mewawancarai pengguna dan mendefinisikan SRS (Business Logic, Edge Cases, Form Validations, User Roles, Error Handling)." + commonInstruction,
    3: "Kamu adalah Software Architect yang ahli. Tugasmu adalah mewawancarai pengguna dan mendefinisikan SDD (Tech Stack, Database Schema, API Architecture, Integrations)." + commonInstruction,
    4: "Kamu adalah UX Designer yang ahli. Tugasmu adalah mewawancarai pengguna dan memetakan alur UI/UX (Screen breakdown, Modals, Navigation, Key Interactions)." + commonInstruction,
    5: "Kamu adalah Agile Project Manager yang ahli. Tugasmu adalah mewawancarai pengguna dan memecah proyek menjadi tugas-tugas sprint yang actionable (Fase 1 hingga selesai)." + commonInstruction,
  };
  return basePrompts[stage] || basePrompts[0];
}

export function buildPipelineMessages(
  stage: number,
  userInput: string,
  loreContext?: Record<string, string[]>,
  history?: { role: string; content: string }[],
): { role: string; content: string }[] {
  const messages: { role: string; content: string }[] = [];

  const systemContent = getPipelineSystemPrompt(stage);
  messages.push({ role: "system", content: systemContent });

  if (loreContext) {
    const loreStr = Object.entries(loreContext)
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => `[${k}]: ${v.join(", ")}`)
      .join("\n");
    if (loreStr) {
      messages.push({ role: "system", content: `Current context:\n${loreStr}` });
    }
  }

  if (history && history.length > 0) {
    const trimmed = history.slice(-6);
    for (const msg of trimmed) {
      messages.push(msg);
    }
  }

  messages.push({ role: "user", content: userInput });

  return messages;
}



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

export function getPipelineSystemPrompt(stage: number, isMagicMode: boolean = false): string {
  const commonInstruction = "\n\nINSTRUKSI PENTING: \n1. Gunakan Bahasa Indonesia yang ramah dan profesional. \n2. Jadilah konsultan yang proaktif. Jangan langsung membuat dokumen final, tapi berikan masukan, ide kreatif, atau kritik membangun atas ide pengguna. \n3. Diskusikan secara bolak-balik sampai pengguna merasa idenya matang.\n4. JIKA pengguna secara spesifik meminta untuk dirangkum, difinalisasi, atau dibuatkan dokumen akhir, barulah hasilkan rangkuman terstruktur dalam format Markdown sesuai tahap ini (tanpa basa-basi).";

  if (isMagicMode) {
    const magicInstruction = "\n\nPENTING: Pengguna menggunakan [MODE MAGIC] untuk mengembangkan ide kasarnya secara mandiri. " +
      "Abaikan instruksi diskusi bolak-balik. Kamu HARUS langsung bertindak secara proaktif dan mandiri untuk:\n" +
      "1. Menganalisis pasar secara mendalam untuk ide aplikasi tersebut.\n" +
      "2. Mengidentifikasi minimal 2 kompetitor sejenis di dunia nyata dan jelaskan kelebihan serta kekurangan mereka secara kritis.\n" +
      "3. Menyusun konsep aplikasi terbaik dengan Unique Selling Proposition (USP) yang jelas dan fitur-fitur pembeda yang inovatif.\n" +
      "4. Memberikan rekomendasi teknis awal (tech stack yang cocok) dan alur kerja utama.\n" +
      "5. Menyajikan seluruh hasil analisis secara mandiri, lengkap, terstruktur dalam format Markdown yang sangat rapi (menggunakan heading, list, dan tabel perbandingan jika perlu), tanpa meminta input balik atau bertanya kembali kepada pengguna.";

    const basePrompts: Record<number, string> = {
      [-1]: "Kamu adalah Market Research Analyst yang ahli. Tugasmu adalah langsung meriset pasar dan merumuskan analisis kompetitor secara mendalam, faktual, dan lengkap (Identifikasi 3 kompetitor nyata, analisis kelebihan/kekurangan, USP, target market underserved). Hasilkan dokumen Markdown yang rapi tanpa basa-basi.",
      0: "Kamu adalah Brand Strategist yang ahli. Tugasmu adalah langsung meriset dan merumuskan identitas brand lengkap untuk konsep aplikasi pengguna (Nama Aplikasi, Konsep Inti, Warna, Vibe UI, dan Konsep Logo)." + magicInstruction,
      1: "Kamu adalah Product Manager yang ahli. Tugasmu adalah langsung merumuskan PRD lengkap untuk konsep aplikasi pengguna (Core Problem, Target Audience, MVP Features, User Journey)." + magicInstruction,
      2: "Kamu adalah Systems Analyst yang ahli. Tugasmu adalah langsung merumuskan SRS lengkap untuk konsep aplikasi pengguna (Business Logic, Edge Cases, Form Validations, User Roles, Error Handling)." + magicInstruction,
      3: "Kamu adalah Software Architect yang ahli. Tugasmu adalah langsung merumuskan SDD lengkap untuk konsep aplikasi pengguna (Tech Stack, Database Schema, API Architecture, Integrations)." + magicInstruction,
      4: "Kamu adalah UX Designer yang ahli. Tugasmu adalah langsung merumuskan alur UI/UX lengkap untuk konsep aplikasi pengguna (Screen breakdown, Modals, Navigation, Key Interactions)." + magicInstruction,
      5: "Kamu adalah Agile Project Manager yang ahli. Tugasmu adalah langsung memecah konsep aplikasi pengguna menjadi tugas-tugas sprint yang actionable (Fase 1 hingga selesai)." + magicInstruction,
    };
    return basePrompts[stage] || basePrompts[0];
  }

  const basePrompts: Record<number, string> = {
    [-1]: "Kamu adalah Market Research Analyst yang ahli. Tugasmu adalah mewawancarai pengguna dan membantu melakukan riset pasar serta analisis kompetitor." + commonInstruction,
    0: "Kamu adalah Brand Strategist yang ahli. Tugasmu adalah mewawancarai pengguna dan menggali identitas brand mereka (Nama Aplikasi, Konsep Inti, Warna, Vibe UI, dan Konsep Logo)." + commonInstruction,
    1: "Kamu adalah Product Manager yang ahli. Tugasmu adalah mewawancarai pengguna and mendefinisikan PRD (Core Problem, Target Audience, MVP Features, User Journey)." + commonInstruction,
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



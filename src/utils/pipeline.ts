"use client";

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
      const val = line.replace(/^.*?[::\-–]\s*/, "").trim();
      if (val && !lore.app_name.includes(val)) lore.app_name.push(val);
    }
    if (lower.includes("concept") || lower.includes("does") || lower.includes("solves")) {
      const val = line.replace(/^.*?[::\-–]\s*/, "").trim();
      if (val && val.length > 5 && !lore.core_concept.includes(val)) lore.core_concept.push(val);
    }
    if (lower.includes("vibe") || lower.includes("design") || lower.includes("ui") || lower.includes("style")) {
      const val = line.replace(/^.*?[::\-–]\s*/, "").trim();
      if (val && !lore.design_vibe.includes(val)) lore.design_vibe.push(val);
    }
    if (lower.includes("audience") || lower.includes("user") || lower.includes("customer")) {
      const val = line.replace(/^.*?[::\-–]\s*/, "").trim();
      if (val && !lore.target_audience.includes(val)) lore.target_audience.push(val);
    }
    if (lower.includes("tech") || lower.includes("stack") || lower.includes("react") || lower.includes("database") || lower.includes("api")) {
      const val = line.replace(/^.*?[::\-–]\s*/, "").trim();
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
  const basePrompts: Record<number, string> = {
    0: `You are a Brand Strategist generating a structured brand brief.

Follow this pipeline:
1. MASTER STRUCTURE: First outline the brand identity document sections (app name, concept, colors, vibe, logo).
2. SEGMENTED EXPANSION: Expand each section with concrete examples using "Therefore/But" logic.
3. CONTEXT COMPRESSION: Summarize key decisions into a concise brand brief.

Output format: Plain markdown with clear section headings.`,
    1: `You are a Product Manager generating a PRD.

Follow this pipeline:
1. MASTER STRUCTURE: Outline the PRD sections (problem, audience, features, user journey).
2. SEGMENTED EXPANSION: Expand each section with user stories and acceptance criteria.
3. CONTEXT COMPRESSION: Summarize into MVP scope.

Output format: Plain markdown with clear section headings.`,
    2: `You are a Systems Analyst generating an SRS.

Follow this pipeline:
1. MASTER STRUCTURE: Outline SRS sections (business logic, edge cases, validations, roles).
2. SEGMENTED EXPANSION: Detail each rule with specific examples and error flows.
3. CONTEXT COMPRESSION: Summarize core requirements.

Output format: Plain markdown.`,
    3: `You are a Software Architect generating an SDD.

Follow this pipeline:
1. MASTER STRUCTURE: Outline system design sections (tech stack, schema, API, integrations).
2. SEGMENTED EXPANSION: Detail architecture decisions and trade-offs.
3. CONTEXT COMPRESSION: Summarize architecture overview.

Output format: Plain markdown.`,
    4: `You are a UX Designer mapping UI/UX flow.

Follow this pipeline:
1. MASTER STRUCTURE: Outline all screens and flows.
2. SEGMENTED EXPANSION: Detail interactions per screen with user intent.
3. CONTEXT COMPRESSION: Summarize key UX patterns.

Output format: Plain markdown.`,
    5: `You are an Agile PM breaking down tasks.

Follow this pipeline:
1. MASTER STRUCTURE: Outline phases and epics.
2. SEGMENTED EXPANSION: Break each epic into specific tickets.
3. CONTEXT COMPRESSION: Summarize sprint plan.

Output format: Plain markdown.`,
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

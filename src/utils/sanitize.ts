"use client";

export function sanitizeJSONResponse(raw: string): string {
  let cleaned = raw.trim();

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let start = -1;
  if (firstBrace >= 0 && firstBracket >= 0) {
    start = Math.min(firstBrace, firstBracket);
  } else if (firstBrace >= 0) {
    start = firstBrace;
  } else if (firstBracket >= 0) {
    start = firstBracket;
  }

  if (start > 0) {
    cleaned = cleaned.slice(start);
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") depth++;
    if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }

  if (end > 0) {
    cleaned = cleaned.slice(0, end);
  }

  return cleaned.trim();
}

export function safeParseJSON<T>(raw: string): { data: T | null; error: string | null } {
  try {
    const sanitized = sanitizeJSONResponse(raw);
    const data = JSON.parse(sanitized) as T;
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

export function compileToTXT(stages: Record<string, Record<string, string>>, appName: string, docContent: string = ""): string {
  const title = appName || "Project Brief";
  const labels = ["Brand & Identity", "PRD", "SRS", "SDD", "UI/UX Flow", "Task Breakdown"];
  const keys = ["brand", "prd", "srs", "sdd", "ux", "tasks"];
  let out = `${title}\n${"=".repeat(title.length)}\n\n`;

  keys.forEach((key, i) => {
    const data = stages[key];
    const entries = Object.entries(data);
    if (entries.length > 0) {
      out += `${labels[i]}\n${"-".repeat(labels[i].length)}\n`;
      entries.forEach(([k, v]) => {
        out += `  ${k}: ${v}\n`;
      });
      out += "\n";
    }
  });

  const caSection = extractCompetitiveAnalysis(docContent);
  if (caSection) {
    out += `Competitive Analysis\n${"=".repeat(20)}\n\n${caSection.replace(/^## 🔍 Competitive Analysis\s*/, "")}\n`;
  }

  return out;
}

export function extractCompetitiveAnalysis(docContent: string): string {
  if (!docContent) return "";
  const match = docContent.match(/## 🔍 Competitive Analysis[\s\S]*/);
  return match ? match[0] : "";
}

export function compileToHTML(stages: Record<string, Record<string, string>>, appName: string, docContent: string = ""): string {
  const title = appName || "Project Brief";
  const labels = ["Brand & Identity", "PRD", "SRS", "SDD", "UI/UX Flow", "Task Breakdown"];
  const keys = ["brand", "prd", "srs", "sdd", "ux", "tasks"];

  let body = "";
  keys.forEach((key, i) => {
    const data = stages[key];
    const entries = Object.entries(data);
    if (entries.length > 0) {
      body += `<section style="margin-bottom:2rem"><h2 style="color:#e2e8f0;border-bottom:1px solid #334155;padding-bottom:0.5rem">${labels[i]}</h2><dl>`;
      entries.forEach(([k, v]) => {
        body += `<dt style="color:#94a3b8;font-weight:600;margin-top:0.75rem">${k}</dt><dd style="color:#cbd5e1;margin-left:1rem">${v}</dd>`;
      });
      body += "</dl></section>";
    }
  });

  const caSection = extractCompetitiveAnalysis(docContent);
  if (caSection) {
    body += `<section style="margin-bottom:2rem"><h2 style="color:#e2e8f0;border-bottom:1px solid #334155;padding-bottom:0.5rem">Competitive Analysis</h2><pre style="background:#1e293b;padding:1rem;border-radius:0.5rem;color:#cbd5e1;white-space:pre-wrap;font-size:0.875rem">${caSection.replace(/^## 🔍 Competitive Analysis\s*/, "")}</pre></section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0f172a; color:#e2e8f0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:800px; margin:2rem auto; padding:0 1.5rem; line-height:1.7; }
  h1 { font-size:1.75rem; margin-bottom:0.5rem; color:#f1f5f9; }
  .meta { color:#64748b; font-size:0.875rem; margin-bottom:2rem; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Generated: ${new Date().toISOString().split("T")[0]}</p>
  ${body}
</body>
</html>`;
}

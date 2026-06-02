"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProjectStore, STAGES } from "@/store/project";
import { useApiKeyStore } from "@/store/api-key";
import { FileText, Download, Loader2 } from "lucide-react";

export default function DocumentPanel() {
  const { activeStage, document, stages, appName } = useProjectStore();
  const { apiKey } = useApiKeyStore();
  const stageInfo = STAGES[activeStage];

  const hasData = Object.values(stages).some((s) => Object.keys(s).length > 0) || document.length > 0;

  const stageDataEntries = useMemo(() => {
    const keys = ["brand", "prd", "srs", "sdd", "ux", "tasks"] as const;
    return keys.map((key, i) => ({
      stage: STAGES[i],
      data: stages[key],
      hasData: Object.keys(stages[key]).length > 0,
    }));
  }, [stages]);

  const handleExport = async (format: "md" | "cursorrules") => {
    const fullDoc = generateFullDocument(stages as unknown as Record<string, Record<string, string>>, appName);
    const ext = format === "cursorrules" ? ".cursorrules" : ".md";
    const filename = appName
      ? `${appName.toLowerCase().replace(/\s+/g, "-")}-brief${ext}`
      : `project-brief${ext}`;

    const blob = new Blob([fullDoc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Live Document
          </h2>
          <p className="text-xs text-muted-foreground">
            Stage {activeStage + 1}/6: {stageInfo.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasData && (
            <>
              <button onClick={() => handleExport("md")} className="text-xs px-2.5 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground flex items-center gap-1.5 transition-colors">
                <Download className="w-3 h-3" />
                .md
              </button>
              <button onClick={() => handleExport("cursorrules")} className="text-xs px-2.5 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground flex items-center gap-1.5 transition-colors">
                <Download className="w-3 h-3" />
                .cursorrules
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        {STAGES.map((s) => {
          const entry = stageDataEntries[s.id];
          const isComplete = entry?.hasData;
          return (
            <div
              key={s.id}
              className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                s.id === activeStage
                  ? "bg-primary text-primary-foreground ring-2 ring-ring"
                  : isComplete
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
              title={s.label}
            >
              {s.id + 1}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!apiKey ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Set your API Key to begin.</p>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Start a conversation in the chat panel. Your project document will appear here.
              </p>
            </div>
          </div>
        ) : (
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{document}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}

function generateFullDocument(
  stages: Record<string, Record<string, string>>,
  appName: string
): string {
  const title = appName || "AI Project Architect Brief";
  const now = new Date().toISOString().split("T")[0];
  const stageLabels = ["Brand & Identity", "PRD", "SRS", "SDD", "UI/UX Flow", "Task Breakdown"];
  const keys = ["brand", "prd", "srs", "sdd", "ux", "tasks"];
  let doc = `# ${title}\n\n**Generated:** ${now}\n\n---\n\n`;

  keys.forEach((key, i) => {
    const data = stages[key];
    const summary = data["summary"];
    if (summary) {
      doc += `## ${stageLabels[i]}\n\n${summary}\n\n---\n\n`;
    } else {
      const entries = Object.entries(data);
      if (entries.length > 0) {
        doc += `## ${stageLabels[i]}\n\n`;
        entries.forEach(([k, v]) => {
          doc += `- **${k}:** ${v}\n`;
        });
        doc += `\n---\n\n`;
      }
    }
  });

  return doc;
}

"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProjectStore, STAGES } from "@/store/project";
import { useApiKeyStore } from "@/store/api-key";
import { useToast } from "@/components/toast";
import { FileText, Download, Edit3, Eye, Trash2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DocumentPanel() {
  const { activeStage, document: docContent, stages, appName, setDocument, setActiveStage } = useProjectStore();
  const { apiKey } = useApiKeyStore();
  const { show } = useToast();
  const stageInfo = STAGES[activeStage];
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const hasData = Object.values(stages).some((s) => Object.keys(s).length > 0) || docContent.length > 0;

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
    show(`Exported as ${ext}`);
  };

  const handleEdit = () => {
    setEditText(docContent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setDocument(editText);
    setIsEditing(false);
    show("Document updated");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText("");
  };

  const handleClear = () => {
    setDocument("");
    show("Document cleared");
  };

  return (
    <div className="flex flex-col h-full max-md:pb-14">
      {/* Header */}
      <header className="border-b border-white/10 p-4 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white/90 flex items-center gap-2">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Live Document</span>
          </h2>
          <p className="text-[11px] text-white/40 truncate">
            Stage {activeStage + 1}/6: {stageInfo.label}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {hasData && (
            <>
              {isEditing ? (
                <>
                  <button onClick={handleSaveEdit} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-purple-600/50 hover:bg-purple-600/70 text-white/90 flex items-center gap-1 transition-colors">
                    <Eye className="w-3 h-3" />
                    Save
                  </button>
                  <button onClick={handleCancelEdit} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 flex items-center gap-1 transition-colors">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleEdit} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors">
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </button>
                  <button onClick={handleClear} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleExport("md")} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors">
                    <Download className="w-3 h-3" />
                    .md
                  </button>
                  <button onClick={() => handleExport("cursorrules")} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors">
                    .cursor
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </header>

      {/* Stage indicators */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 overflow-x-auto">
        {STAGES.map((s) => {
          const entry = stageDataEntries[s.id];
          const isComplete = entry?.hasData;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (isComplete) setActiveStage(s.id);
              }}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-all shrink-0",
                s.id === activeStage
                  ? "bg-purple-600/60 text-white ring-2 ring-purple-400/30"
                  : isComplete
                  ? "bg-purple-600/20 text-purple-300/70 hover:bg-purple-600/30 cursor-pointer"
                  : "bg-white/5 text-white/30"
              )}
              title={s.label}
            >
              {s.id + 1}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-5">
        {!apiKey ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-white/40">Set your API Key to begin.</p>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <FileText className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/40">
                Start a conversation. Your document will appear here.
              </p>
            </div>
          </div>
        ) : isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full h-full min-h-[300px] bg-transparent text-sm text-white/80 font-mono leading-relaxed outline-none resize-none"
          />
        ) : (
          <article className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{docContent}</ReactMarkdown>
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

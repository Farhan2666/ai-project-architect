"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProjectStore, STAGES, type StageData, type StageId } from "@/store/project";
import { useApiKeyStore } from "@/store/api-key";
import { useToast } from "@/components/toast";
import { ErrorBoundary } from "@/components/error-boundary";
import { FileText, Download, Edit3, Eye, Trash2, Upload, FileJson, FileArchive, RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { compileToTXT, compileToHTML } from "@/utils/sanitize";

const BACKUP_KEY = "ai-project-architect-backup";
const BACKUP_INTERVAL = 60000;

function autoBackup() {
  try {
    const state = useProjectStore.getState();
    const payload = JSON.stringify({
      appName: state.appName,
      stages: state.stages,
      document: state.document,
      completedStages: state.completedStages,
      activeStage: state.activeStage,
      backedUpAt: new Date().toISOString(),
    });
    localStorage.setItem(BACKUP_KEY, payload);
  } catch {
    // silent
  }
}

function restoreFromAutoBackup(): boolean {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return false;
    if (!data.stages || typeof data.stages !== "object") return false;
    useProjectStore.setState({
      appName: data.appName || "",
      stages: data.stages as unknown as StageData,
      document: data.document || "",
      completedStages: (data.completedStages || []) as unknown as StageId[],
      activeStage: (data.activeStage ?? 0) as StageId,
    });
    return true;
  } catch {
    return false;
  }
}

function validateBackupSchema(data: unknown): data is {
  appName: string;
  stages: Record<string, Record<string, string>>;
  document: string;
  completedStages: number[];
  activeStage: number;
} {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.appName !== "string") return false;
  if (!obj.stages || typeof obj.stages !== "object") return false;
  if (typeof obj.document !== "string") return false;
  if (!Array.isArray(obj.completedStages)) return false;
  if (typeof obj.activeStage !== "number") return false;
  return true;
}

export default function DocumentPanel() {
  const { activeStage, document: docContent, stages, appName, setDocument, setActiveStage, reset } = useProjectStore();
  const { apiKey } = useApiKeyStore();
  const { show } = useToast();
  const stageInfo = STAGES[activeStage];
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLIFrameElement>(null);

  const hasData = Object.values(stages).some((s) => Object.keys(s).length > 0) || docContent.length > 0;

  const stageDataEntries = useMemo(() => {
    const keys = ["brand", "prd", "srs", "sdd", "ux", "tasks"] as const;
    return keys.map((key, i) => ({
      stage: STAGES[i],
      data: stages[key],
      hasData: Object.keys(stages[key]).length > 0,
    }));
  }, [stages]);

  const startAutoBackup = useCallback(() => {
    autoBackup();
    const interval = setInterval(autoBackup, BACKUP_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cleanup = startAutoBackup();
    const savedBackup = localStorage.getItem(BACKUP_KEY);
    if (savedBackup) {
      try {
        const parsed = JSON.parse(savedBackup);
        setLastBackup(parsed.backedUpAt || null);
      } catch {
        // ignore
      }
    }
    return cleanup;
  }, [startAutoBackup]);

  const handleExport = async (format: "md" | "cursorrules" | "txt" | "html" | "pdf") => {
    const fullDoc = generateFullDocument(stages as unknown as Record<string, Record<string, string>>, appName);

    if (format === "txt") {
      const txt = compileToTXT(stages as unknown as Record<string, Record<string, string>>, appName);
      downloadBlob(txt, "text/plain", appName ? `${appName.toLowerCase().replace(/\s+/g, "-")}-brief.txt` : "project-brief.txt");
      show("Exported as .txt");
      return;
    }
    if (format === "html") {
      const html = compileToHTML(stages as unknown as Record<string, Record<string, string>>, appName);
      downloadBlob(html, "text/html", appName ? `${appName.toLowerCase().replace(/\s+/g, "-")}-brief.html` : "project-brief.html");
      show("Exported as .html");
      return;
    }
    if (format === "pdf") {
      try {
        const { default: jsPDF } = await import("jspdf");
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const title = appName || "AI Project Architect Brief";
        doc.setFontSize(18);
        doc.text(title, 20, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toISOString().split("T")[0]}`, 20, 28);

        const keys = ["brand", "prd", "srs", "sdd", "ux", "tasks"];
        const stageLabels = ["Brand & Identity", "PRD", "SRS", "SDD", "UI/UX Flow", "Task Breakdown"];
        let yOffset = 36;

        for (let i = 0; i < keys.length; i++) {
          const data = stages[keys[i] as keyof StageData];
          const summary = data["summary"];
          const entries = Object.entries(data);
          if (entries.length > 0) {
            if (yOffset > 270) {
              doc.addPage();
              yOffset = 20;
            }
            doc.setFontSize(14);
            doc.text(stageLabels[i], 20, yOffset);
            yOffset += 8;
            doc.setFontSize(10);
            if (summary) {
              const lines = doc.splitTextToSize(summary, 170);
              doc.text(lines, 20, yOffset);
              yOffset += lines.length * 5;
            } else {
              for (const [k, v] of entries) {
                if (yOffset > 270) {
                  doc.addPage();
                  yOffset = 20;
                }
                const line = `${k}: ${v}`;
                const lines = doc.splitTextToSize(line, 170);
                doc.text(lines, 20, yOffset);
                yOffset += lines.length * 5;
              }
            }
            yOffset += 6;
          }
        }

        doc.save(appName ? `${appName.toLowerCase().replace(/\s+/g, "-")}-brief.pdf` : "project-brief.pdf");
        show("Exported as .pdf");
      } catch {
        show("PDF export gagal.", "error");
      }
      return;
    }

    const ext = format === "cursorrules" ? ".cursorrules" : ".md";
    const filename = appName
      ? `${appName.toLowerCase().replace(/\s+/g, "-")}-brief${ext}`
      : `project-brief${ext}`;

    downloadBlob(fullDoc, "text/plain", filename);
    show(`Exported as ${ext}`);
  };

  const handleBackup = () => {
    const { completedStages } = useProjectStore.getState();
    const payload = JSON.stringify(
      { appName, stages, document: docContent, completedStages, activeStage, exportedAt: new Date().toISOString() },
      null,
      2,
    );
    downloadBlob(
      payload,
      "application/json",
      appName
        ? `${appName.toLowerCase().replace(/\s+/g, "-")}.fictify`
        : "project.fictify",
    );
    show("Backup saved (.fictify)");
  };

  const handleImport = () => {
    importRef.current?.click();
  };

  const handleRestoreAutoBackup = () => {
    const success = restoreFromAutoBackup();
    if (success) {
      show("Auto-backup restored!");
      setTimeout(() => window.location.reload(), 500);
    } else {
      show("No auto-backup found", "error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const data = JSON.parse(text);
        if (!validateBackupSchema(data)) {
          show("Invalid backup file format", "error");
          return;
        }
        useProjectStore.setState({
          appName: data.appName || "",
          stages: data.stages as unknown as StageData,
          document: data.document || "",
          completedStages: (data.completedStages || []) as unknown as StageId[],
          activeStage: (data.activeStage ?? 0) as StageId,
        });
        show("Backup restored! Reloading...");
        setTimeout(() => window.location.reload(), 800);
      } catch {
        show("Failed to parse backup file", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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

  const handleReset = () => {
    if (!confirm("Reset seluruh project? Semua stage dan dokumen akan hilang.")) return;
    localStorage.removeItem(BACKUP_KEY);
    reset();
    show("Project reset");
  };

  function downloadBlob(content: string, mime: string, filename: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full max-md:pb-14">
        <header className="border-b border-white/10 p-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white/90 flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">Live Document</span>
            </h2>
            <p className="text-[11px] text-white/40 truncate">
              Stage {activeStage + 1}/6: {stageInfo.label}
              {lastBackup && <span className="ml-2 opacity-50">Auto-saved</span>}
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
                    <button onClick={handleEdit} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors" title="Edit document">
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                    <button onClick={handleClear} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors" title="Clear document">
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button onClick={handleReset} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-950/70 text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors" title="Reset seluruh project">
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                    <button onClick={handleBackup} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors" title="Backup (.fictify)">
                      <Download className="w-3 h-3" />
                      Backup
                    </button>
                    <button onClick={handleImport} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors" title="Restore from backup">
                      <Upload className="w-3 h-3" />
                      Restore
                    </button>
                    <button onClick={handleRestoreAutoBackup} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors" title="Restore auto-backup">
                      <RefreshCw className="w-3 h-3" />
                      Auto
                    </button>
                    <button onClick={() => handleExport("md")} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors">
                      .md
                    </button>
                    <button onClick={() => handleExport("txt")} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors">
                      .txt
                    </button>
                    <button onClick={() => handleExport("html")} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors">
                      .html
                    </button>
                    <button onClick={() => handleExport("pdf")} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors">
                      .pdf
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

        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 overflow-x-auto">
          {STAGES.map((s) => {
            const entry = stageDataEntries[s.id];
            const isComplete = entry?.hasData;
            return (
                <button
                  key={s.id}
                  onClick={() => setActiveStage(s.id)}
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

        <input ref={importRef} type="file" accept=".fictify,.json" onChange={handleFileChange} className="hidden" />

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
    </ErrorBoundary>
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

"use client";

import { useMemo, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProjectStore, STAGES, type StageData } from "@/store/project";
import { useApiKeyStore } from "@/store/api-key";
import { useToast } from "@/components/toast";
import { FileText, Download, Edit3, Eye, Trash2, Upload, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import { compileToTXT, compileToHTML } from "@/utils/sanitize";

export default function DocumentPanel() {
  const { activeStage, documents, getMergedDocument, stages, appName, setDocument, setActiveStage, reset } = useProjectStore();
  const [showMaster, setShowMaster] = useState(false);
  const docContent = showMaster ? getMergedDocument() : (documents[activeStage] || "");
  const { apiKey } = useApiKeyStore();
  const { show } = useToast();
  const stageInfo = STAGES[activeStage];
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const hasData = Object.values(documents).some((d) => d && d.trim().length > 0);

  const stageDataEntries = useMemo(() => {
    const keys = ["brand", "prd", "srs", "sdd", "ux", "tasks"] as const;
    return keys.map((key, i) => ({
      stage: STAGES[i],
      data: stages[key],
      hasData: Object.keys(stages[key]).length > 0 || !!(documents[i] && documents[i].trim().length > 0),
    }));
  }, [stages, documents]);

  const handleExport = async (format: "md" | "cursorrules" | "txt" | "html") => {
    const docToExport = showMaster ? getMergedDocument() : (documents[activeStage] || "");

    if (!docToExport.trim()) {
      show("Tidak ada data untuk diekspor");
      return;
    }

    let fileContent = docToExport;
    let mimeType = "text/plain";
    let ext = "";

    if (format === "txt") {
      mimeType = "text/plain";
      ext = ".txt";
    } else if (format === "html") {
      mimeType = "text/html";
      ext = ".html";
      fileContent = wrapMarkdownInHTML(docToExport, appName || "Project Brief");
    } else {
      mimeType = "text/plain";
      ext = format === "cursorrules" ? ".cursorrules" : ".md";
    }

    const modeName = showMaster ? "master" : STAGES[activeStage].short.toLowerCase();
    const filename = appName
      ? `${appName.toLowerCase().replace(/\s+/g, "-")}-${modeName}-brief${ext}`
      : `project-${modeName}-brief${ext}`;

    downloadBlob(fileContent, mimeType, filename);
    show(`Exported as ${ext}`);
  };

  const handleBackup = () => {
    const payload = JSON.stringify(
      { appName, stages, document: docContent, documents, exportedAt: new Date().toISOString() },
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const data = JSON.parse(text);
        if (!data || typeof data !== "object") {
          show("Invalid backup file");
          return;
        }
        if (data.stages && typeof data.stages === "object") {
          useProjectStore.setState({
            appName: data.appName || "",
            stages: data.stages,
            document: data.document || "",
            documents: data.documents || {},
            completedStages: [],
            activeStage: 0,
          });
          show("Backup restored! Reloading...");
          setTimeout(() => window.location.reload(), 800);
        } else {
          show("Invalid backup schema");
        }
      } catch {
        show("Failed to parse backup file");
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
    <div className="flex flex-col h-full max-md:pb-14">
      {/* Header */}
      <header className="border-b border-white/10 p-4 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white/90 flex items-center gap-2">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{showMaster ? "Master Document" : "Live Document"}</span>
          </h2>
          <p className="text-[11px] text-white/40 truncate">
            {showMaster ? "Semua tahapan proyek digabungkan" : `Stage ${activeStage + 1}/6: ${stageInfo.label}`}
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
                  {!showMaster && (
                    <button
                      onClick={() => setShowMaster(true)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white flex items-center gap-1 transition-colors font-medium"
                    >
                      🚀 Selesaikan Proyek
                    </button>
                  )}
                  {!showMaster && (
                    <button onClick={handleEdit} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors">
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                  {!showMaster && (
                    <button onClick={handleClear} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={handleBackup} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors" title="Backup (.fictify)">
                    <Download className="w-3 h-3" />
                    Backup
                  </button>
                  <button onClick={handleImport} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors" title="Restore from backup">
                    <Upload className="w-3 h-3" />
                    Restore
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
                setShowMaster(false);
                if (isComplete) setActiveStage(s.id);
              }}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-all shrink-0",
                !showMaster && s.id === activeStage
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
        {hasData && (
          <button
            onClick={() => setShowMaster(true)}
            className={cn(
              "h-7 px-3 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all shrink-0 border ml-auto",
              showMaster
                ? "bg-indigo-600/70 text-white ring-2 ring-indigo-400/30 border-indigo-500/20"
                : "bg-indigo-950/40 text-indigo-300 hover:bg-indigo-950/60 cursor-pointer border-indigo-500/20"
            )}
            title="Master Document (Selesaikan Proyek)"
          >
            🚀 Master
          </button>
        )}
      </div>

      {/* Hidden file input for restore */}
      <input ref={importRef} type="file" accept=".fictify,.json" onChange={handleFileChange} className="hidden" />

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

function wrapMarkdownInHTML(md: string, title: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n/g, '<br />');

  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { background:#0f172a; color:#e2e8f0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:800px; margin:2rem auto; padding:0 1.5rem; line-height:1.7; }
  h1 { font-size:1.75rem; margin-top:2rem; margin-bottom:1rem; color:#f1f5f9; border-bottom:1px solid #334155; padding-bottom:0.5rem; }
  h2 { font-size:1.4rem; margin-top:1.5rem; margin-bottom:0.75rem; color:#f1f5f9; border-bottom:1px solid #1e293b; padding-bottom:0.25rem; }
  h3 { font-size:1.2rem; margin-top:1.25rem; margin-bottom:0.5rem; color:#cbd5e1; }
  strong { color:#f8fafc; }
  ul { margin-left:1.5rem; margin-bottom:1rem; }
  li { margin-bottom:0.25rem; }
  hr { border: 0; border-top: 1px solid #334155; margin: 2rem 0; }
</style>
</head>
<body>
  ${html}
</body>
</html>`;
}

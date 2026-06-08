"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { useApiKeyStore } from "@/store/api-key";
import { useProjectStore, STAGES, type StageId } from "@/store/project";
import { Send, Loader2, Key, ChevronRight, Mic, MicOff, Sparkles, Zap } from "lucide-react";
import { useToast } from "@/components/toast";

function getMessageDisplayContent(m: any): string {
  const rawText = m.parts && m.parts.length > 0
    ? m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("")
    : m.content || "";

  if (rawText.startsWith('[MODE MAGIC] Ide kasarku: "')) {
    const match = rawText.match(/^\[MODE MAGIC\] Ide kasarku: "([\s\S]*?)"\n\nTugasmu:/);
    if (match && match[1]) {
      return "✨ **Magic Expand** _" + match[1] + "_";
    }
  }
  return rawText;
}

const STAGE_SUGGESTIONS: Record<StageId, string[]> = {
  0: ["Minimalist & Clean", "Dark Mode & Premium", "Playful & Colorful", "Corporate & Professional"],
  1: ["MVP Features Only", "User-Centric Flow", "Focus on Performance", "Mobile-First Approach"],
  2: ["Handle Edge Cases", "Strong Validation Rules", "Role-Based Access", "Error Recovery Flow"],
  3: ["REST API Design", "PostgreSQL + Prisma", "Microservices Split", "Monorepo Structure"],
  4: ["Screen-by-Screen Flow", "Navigation Flow", "Key Interactions", "Modal & Overlays"],
  5: ["Create Sprints", "Kanban Board Structure", "Setup Database First", "Prioritize Auth Logic"],
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Helper: baca streaming response dari Vercel AI SDK dan kembalikan full text
async function readStreamText(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    // Vercel AI SDK stream format: '0:"text chunk"\n'
    for (const line of chunk.split("\n")) {
      // text delta
      const textMatch = line.match(/^0:"((?:[^"\\]|\\.)*)"/);
      if (textMatch) {
        try { fullText += JSON.parse(`"${textMatch[1]}"`); } catch { /* skip */ }
        continue;
      }
      // finish_message delta (type 'd')
    }
  }
  return fullText;
}

export default function ChatPanel() {
  const { apiKey, provider, baseURL, model, openModal } = useApiKeyStore();
  const store = useProjectStore();
  const { activeStage, markStageComplete, nextStage, appName, setAppName, updateStageData, appendDocument, isStageComplete, setActiveStage } = store;
  const { show } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isGeneratingDocRef = useRef(false);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [hasMicSupport, setHasMicSupport] = useState(true);
  // State untuk fitur Auto Generate All
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoProgress, setAutoProgress] = useState<{ current: number; label: string } | null>(null);
  const stageInfo = STAGES[activeStage];
  const suggestions = STAGE_SUGGESTIONS[activeStage];

  const stageRef = useRef(activeStage);
  const isLoadingRef = useRef(false);
  const stageInfoRef = useRef(stageInfo);
  stageRef.current = activeStage;
  stageInfoRef.current = stageInfo;

  // BUG FIX #1: kirim `stage` di body agar server pakai system prompt yang benar
  const { messages, sendMessage, regenerate, status, error } = useChat({
    id: `stage-${activeStage}`,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: () => {
        const s = useApiKeyStore.getState();
        return {
          "x-api-key": s.apiKey,
          "x-provider": s.provider,
          "x-base-url": s.baseURL,
          "x-model": s.model,
        };
      },
      body: () => {
        const currentStage = stageRef.current;
        const body: Record<string, unknown> = { stage: currentStage };
        // Kirim summary stage sebelumnya saat di stage 5 (Task Breakdown)
        if (currentStage === 5) {
          const { stages } = useProjectStore.getState();
          const summaries: Record<string, string> = {};
          for (const key of ["brand", "prd", "srs", "sdd", "ux"] as const) {
            const s = stages[key]?.summary;
            if (s) summaries[key] = s;
          }
          if (Object.keys(summaries).length > 0) body.previousStageSummaries = summaries;
        }
        return body;
      },
    }),
    onFinish: (result: any) => {
      const s = stageRef.current;
      const info = stageInfoRef.current;
      const stageKey = ["brand", "prd", "srs", "sdd", "ux", "tasks"][s];
      const text = result.message.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("")
        .trim();

      if (!text) return;

      if (s === 0) {
        const lines = text.split("\n");
        for (const line of lines) {
          const match = line.match(/(?:app|application|project)\s*(?:name)?[:\-–]\s*(.+)/i);
          if (match) setAppName(match[1].trim());
        }
      }

      if (isGeneratingDocRef.current) {
        const { document: currentDoc } = useProjectStore.getState();
        const stageHeading = `\n\n## ${info.label}`;
        if (!currentDoc.includes(stageHeading)) {
          appendDocument(`${stageHeading}\n\n${text}`);
        } else {
          appendDocument(`\n\n${text}`);
        }
        updateStageData(stageKey as "brand" | "prd" | "srs" | "sdd" | "ux" | "tasks", "summary", text);
        markStageComplete(s);
        // BUG FIX #2: reset flag setelah doc selesai agar pesan berikutnya tidak auto-append
        isGeneratingDocRef.current = false;
      } else {
        updateStageData(stageKey as "brand" | "prd" | "srs" | "sdd" | "ux" | "tasks", "summary", text);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  isLoadingRef.current = isLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) { openModal(); return; }
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput("");
    sendMessage({ text: msg });
  };

  const handleChipClick = useCallback(
    (text: string) => {
      if (!apiKey) { openModal(); return; }
      if (isLoadingRef.current) return;
      sendMessage({ text });
    },
    [apiKey, sendMessage, openModal],
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== "undefined" ? (navigator.language || "en-US") : "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      for (let i = event.results.length - 1; i >= 0; i--) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript = result[0].transcript + " " + finalTranscript;
      }
      if (finalTranscript) setInput((prev) => prev + finalTranscript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasMicSupport(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    }
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const handleGenerateDoc = () => {
    isGeneratingDocRef.current = true;
    sendMessage({ text: "Tolong rangkum semua hasil diskusi kita di atas ke dalam format dokumen final untuk tahap ini. Jangan tambahkan basa-basi, langsung berikan format markdown." });
  };

  const handleMagicExpand = () => {
    if (!input.trim()) return;
    const prompt = '[MODE MAGIC] Ide kasarku: "' + input + '"\n\nTugasmu: Kembangkan ide kasar ini secara mandiri! Analisis pasar, cari tahu aplikasi kompetitor sejenis, temukan kelebihan dan kekurangan mereka, lalu kembangkan ide kasarku ini menjadi konsep aplikasi yang jauh lebih baik dengan fitur-fitur pembeda (Unique Selling Proposition) yang inovatif.';
    sendMessage({ text: prompt });
    setInput("");
  };

  const handleAutoGenerateAll = useCallback(async () => {
    const ideaText = input.trim();
    if (!ideaText || !apiKey || isAutoRunning) return;

    setIsAutoRunning(true);
    setInput("");

    const stageKeys = ["brand", "prd", "srs", "sdd", "ux", "tasks"] as const;
    const { apiKey: key, provider: prov, baseURL: burl, model: mdl } = useApiKeyStore.getState();

    // ─── PHASE 0: Competitive Analysis ───────────────────────────────────────
    setAutoProgress({ current: 0, label: "🔍 Riset Kompetitor & Pasar" });

    let competitiveContext = "";
    try {
      const compRes = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "x-provider": prov,
          "x-base-url": burl || "",
          "x-model": mdl,
        },
        body: JSON.stringify({
          stage: 0,
          messages: [{
            role: "user",
            content: `Kamu adalah Market Research Analyst ahli. Lakukan riset mendalam untuk ide aplikasi berikut: "${ideaText}"

Tugasmu (langsung, tanpa basa-basi):
1. **Identifikasi 3 kompetitor nyata** yang sudah ada di pasar (sebutkan nama aslinya, bukan contoh fiktif)
2. Untuk tiap kompetitor analisis:
   - ✅ Kelebihan utama mereka
   - ❌ Kelemahan / celah yang belum mereka isi dengan baik
3. **Unique Selling Proposition (USP)** yang bisa membuat aplikasi ini jauh lebih unggul
4. **Target market underserved** yang paling potensial

Format output dalam Markdown yang rapi dengan heading jelas. Jadilah spesifik dan faktual berdasarkan pengetahuanmu tentang aplikasi-aplikasi yang benar-benar ada.`,
          }],
        }),
      });

      if (compRes.ok) {
        competitiveContext = await readStreamText(compRes);
        if (competitiveContext.trim()) {
          appendDocument(`\n\n## 🔍 Competitive Analysis\n\n${competitiveContext.trim()}`);
        }
      }
    } catch {
      // Lanjut meskipun competitive analysis gagal
    }

    // ─── PHASE 1–6: Generate 6 Stage Documents ───────────────────────────────
    const competitiveCtxBlock = competitiveContext.trim()
      ? `\n\n---\n## KONTEKS RISET KOMPETITOR (gunakan sebagai landasan):\n${competitiveContext.trim()}\n---\n\nBerdasarkan riset di atas, pastikan solusi yang kamu buat secara spesifik mengatasi kelemahan kompetitor dan menonjolkan USP yang sudah diidentifikasi.`
      : "";

    const stagePrompts = [
      `Kamu adalah Brand Strategist ahli. Berdasarkan ide aplikasi: "${ideaText}"${competitiveCtxBlock}\n\nLangsung buat dokumen **Brand & Identity** final dalam format Markdown. Sertakan: Nama Aplikasi yang unik & memorable (berbeda dari kompetitor), Tagline, Konsep Inti, Positioning statement vs kompetitor, Warna Brand (primary & secondary dengan hex code), Vibe UI, Konsep Logo. Jangan basa-basi.`,
      `Kamu adalah Product Manager ahli. Berdasarkan ide aplikasi: "${ideaText}"${competitiveCtxBlock}\n\nLangsung buat dokumen **PRD** final dalam format Markdown. Sertakan: Core Problem (yang belum diselesaikan kompetitor), Target Audience spesifik, MVP Features (min 5 fitur, prioritaskan fitur diferensiasi dari kompetitor), User Journey step-by-step. Jangan basa-basi.`,
      `Kamu adalah Systems Analyst ahli. Berdasarkan ide aplikasi: "${ideaText}"${competitiveCtxBlock}\n\nLangsung buat dokumen **SRS** final dalam format Markdown. Sertakan: Business Logic (termasuk aturan yang jadi keunggulan vs kompetitor), Edge Cases, Form Validations, User Roles & Permissions, Error Handling. Jangan basa-basi.`,
      `Kamu adalah Software Architect ahli. Berdasarkan ide aplikasi: "${ideaText}"${competitiveCtxBlock}\n\nLangsung buat dokumen **SDD** final dalam format Markdown. Sertakan: Tech Stack modern (frontend, backend, database), Database Schema (tabel & relasi utama), API Architecture (endpoint utama), Third-party Integrations yang mendukung USP. Jangan basa-basi.`,
      `Kamu adalah UX Designer ahli. Berdasarkan ide aplikasi: "${ideaText}"${competitiveCtxBlock}\n\nLangsung buat dokumen **UI/UX Flow** final dalam format Markdown. Sertakan: Screen-by-screen breakdown (fokus pada pain point yang kompetitor gagal address), Modals & Overlays, Navigation Flow, Key Interactions per screen. Jangan basa-basi.`,
      `Kamu adalah Agile Project Manager ahli. Berdasarkan ide aplikasi: "${ideaText}"${competitiveCtxBlock}\n\nLangsung buat dokumen **Task Breakdown (Sprint Plan)** final dalam format Markdown. Pecah menjadi: Phase 1 (Setup & Foundation), Phase 2 (Core Features & Differentiators vs kompetitor), Phase 3 (UI Polish & Integration), Phase 4 (Testing & Launch), Future Phases. Tiap task sertakan estimasi complexity (S/M/L). Jangan basa-basi.`,
    ];

    for (let i = 0; i < stageKeys.length; i++) {
      const stageKey = stageKeys[i];
      const stageLabel = STAGES[i].label;
      setAutoProgress({ current: i + 1, label: stageLabel });
      setActiveStage(i as StageId);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "x-provider": prov,
            "x-base-url": burl || "",
            "x-model": mdl,
          },
          body: JSON.stringify({
            stage: i,
            messages: [{ role: "user", content: stagePrompts[i] }],
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          show(`❌ Gagal generate ${stageLabel}: ${err.error || res.statusText}`, "error");
          break;
        }

        const fullText = await readStreamText(res);

        if (fullText.trim()) {
          updateStageData(stageKey, "summary", fullText.trim());
          markStageComplete(i as StageId);
          appendDocument(`\n\n## ${stageLabel}\n\n${fullText.trim()}`);

          if (i === 0) {
            const nameMatch = fullText.match(/(?:nama app(?:likasi)?|app name|project name|nama proyek)[:\s*#*]+([^\n*#]+)/i);
            if (nameMatch) setAppName(nameMatch[1].trim().replace(/[*_`#]/g, "").trim());
          }
        }
      } catch {
        show(`❌ Error saat generate ${stageLabel}`, "error");
        break;
      }
    }

    setIsAutoRunning(false);
    setAutoProgress(null);
    setActiveStage(0 as StageId);
    show("✅ Semua 6 bagian berhasil di-generate! Lihat dokumen di panel kanan.");
  }, [input, apiKey, isAutoRunning, updateStageData, markStageComplete, appendDocument, setAppName, setActiveStage, show]);

  const noKey = !apiKey;

  return (
    <div className={cn("flex flex-col h-full max-md:pb-14", isLoading && "shimmer-border")}>
      <header className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white/90 truncate">AI Project Architect</h1>
            <p className="text-xs text-white/50 truncate">
              {appName ? `${appName} — ` : ""}
              {isAutoRunning && autoProgress
                ? `⚡ Auto-generating ${autoProgress.current}/6: ${autoProgress.label}...`
                : `Stage ${activeStage + 1}/6: ${stageInfo.label}`}
            </p>
          </div>
          <button
            onClick={openModal}
            className="shrink-0 ml-2 w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title={`API Key: ${provider}`}
          >
            <Key className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Progress bar saat Auto Generate berjalan */}
      {isAutoRunning && autoProgress && (
        <div className="px-4 py-2 border-b border-white/5 bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
            <span className="text-xs text-yellow-300 font-medium">
              {autoProgress.current === 0
                ? `⟳ ${autoProgress.label}`
                : `Auto Generate ${autoProgress.current}/6: ${autoProgress.label}`}
            </span>
            <span className="text-xs text-white/40 ml-auto">
              {autoProgress.current === 0 ? "Riset dulu..." : `${autoProgress.current}/6`}
            </span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                autoProgress.current === 0
                  ? "bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse w-1/4"
                  : "bg-gradient-to-r from-yellow-500 to-purple-500"
              }`}
              style={autoProgress.current > 0 ? { width: `${(autoProgress.current / 6) * 100}%` } : {}}
            />
          </div>
        </div>
      )}

      {noKey ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <button
            onClick={openModal}
            className="flex flex-col items-center gap-3 text-white/50 hover:text-white/80 transition-colors"
          >
            <Key className="w-10 h-10" />
            <p className="text-sm font-medium">Set your API Key to start</p>
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isAutoRunning && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <p className="text-sm font-medium text-white/80 mb-1">{stageInfo.label}</p>
                  <p className="text-xs text-white/40">
                    {activeStage === 0 && "Let's define your app's brand and identity."}
                    {activeStage === 1 && "Let's define the product requirements."}
                    {activeStage === 2 && "Let's define system requirements."}
                    {activeStage === 3 && "Let's design the system architecture."}
                    {activeStage === 4 && "Let's map out the user experience."}
                    {activeStage === 5 && "Let's break down tasks into sprints."}
                  </p>
                  <p className="text-xs text-yellow-400/60 mt-3">
                    💡 Ketik ide app kamu lalu klik ⚡ untuk auto-generate semua 6 bagian sekaligus
                  </p>
                </div>
              </div>
            )}

            {isAutoRunning && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Zap className="w-8 h-8 text-yellow-400 animate-pulse mx-auto mb-3" />
                  <p className="text-sm text-white/70 font-medium">Sedang generate semua bagian...</p>
                  <p className="text-xs text-white/40 mt-1">
                    {autoProgress ? `${autoProgress.current}/6 — ${autoProgress.label}` : "Memulai..."}
                  </p>
                </div>
              </div>
            )}

            {!isAutoRunning && messages
              .filter((m) => m.role !== "system")
              .map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-purple-600/40 backdrop-blur-sm text-white/90 border border-purple-400/20"
                        : "bg-white/5 text-white/80 border border-white/5"
                    }`}
                  >
                    <article className="prose prose-sm prose-invert max-w-none break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {getMessageDisplayContent(m)}
                      </ReactMarkdown>
                    </article>
                  </div>
                </div>
              ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-white/50 border border-white/5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="mx-4 mb-2 px-4 py-2 bg-red-950/60 backdrop-blur-sm border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center justify-between gap-2">
              <span className="flex-1 truncate">{error.message}</span>
              <button
                onClick={() => regenerate()}
                className="shrink-0 text-xs font-medium text-red-200 hover:text-white transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {messages.filter((m) => m.role !== "system").length > 0 && !isLoading && !isAutoRunning && (
            <div className="flex justify-end px-4 pb-1 gap-2">
              <button
                onClick={handleGenerateDoc}
                className="text-xs px-3 py-1.5 bg-purple-600/60 hover:bg-purple-600/80 rounded-md text-white transition-colors"
              >
                Finalisasi & Buat Dokumen
              </button>
              {/* BUG FIX #3: Next Stage muncul sampai stage 4→5, bukan berhenti di stage 4 */}
              {isStageComplete(activeStage) && activeStage < 5 && (
                <button
                  onClick={() => nextStage()}
                  className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
                >
                  Next: {STAGES[activeStage + 1].label}
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div className="px-4 pb-2">
            <div className="flex overflow-x-auto whitespace-nowrap gap-2 scrollbar-none pb-2 px-1">
              {suggestions.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  disabled={isAutoRunning}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur-md transition-all duration-200 active:scale-95 shrink-0 disabled:opacity-30"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isAutoRunning ? "Auto generating..." : isLoading ? "AI is responding..." : "Ketik ide app kamu..."}
                disabled={isLoading || isAutoRunning}
                className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/30 outline-none min-w-0 disabled:opacity-50"
              />
              {hasMicSupport && !isAutoRunning && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                    isListening
                      ? "text-red-400 bg-red-500/10 shadow-lg shadow-red-500/20"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5",
                  )}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              {/* Tombol ⚡ Auto Generate All */}
              <button
                type="button"
                onClick={handleAutoGenerateAll}
                disabled={isLoading || isAutoRunning || !input.trim()}
                className="shrink-0 w-8 h-8 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 flex items-center justify-center disabled:opacity-30 transition-all duration-200"
                title="⚡ Auto Generate: ketik ide app → generate semua 6 bagian sekaligus"
              >
                {isAutoRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              </button>
              {/* Tombol ✨ Magic Expand */}
              <button
                type="button"
                onClick={handleMagicExpand}
                disabled={isLoading || isAutoRunning || !input.trim()}
                className="shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 flex items-center justify-center disabled:opacity-30 transition-all duration-200"
                title="Magic Expand (Kembangkan Ide Kasar)"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={isLoading || isAutoRunning || !input.trim()}
                className="shrink-0 w-8 h-8 rounded-lg bg-purple-600/60 hover:bg-purple-600/80 text-white flex items-center justify-center disabled:opacity-30 transition-all duration-200"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

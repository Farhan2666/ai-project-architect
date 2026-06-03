"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { cn } from "@/lib/utils";
import { useApiKeyStore } from "@/store/api-key";
import { useProjectStore, STAGES, type StageId } from "@/store/project";
import { Send, Loader2, Key, ChevronRight, Mic, MicOff } from "lucide-react";

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

export default function ChatPanel() {
  const { apiKey, provider, baseURL, model, openModal } = useApiKeyStore();
  const store = useProjectStore();
  const { activeStage, markStageComplete, nextStage, appName, setAppName, updateStageData, appendDocument } = store;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const stageInfo = STAGES[activeStage];
  const suggestions = STAGE_SUGGESTIONS[activeStage];

  const stageRef = useRef(activeStage);
  const stageInfoRef = useRef(stageInfo);
  stageRef.current = activeStage;
  stageInfoRef.current = stageInfo;

  const { messages, sendMessage, regenerate, status, error } = useChat({
    transport: new TextStreamChatTransport({
      api: "/api/chat",
      body: () => ({
        provider: useApiKeyStore.getState().provider,
        apiKey: useApiKeyStore.getState().apiKey,
        baseURL: useApiKeyStore.getState().baseURL,
        model: useApiKeyStore.getState().model,
        stage: useProjectStore.getState().activeStage,
      }),
    }),
    onFinish: (result) => {
      const s = stageRef.current;
      const info = stageInfoRef.current;
      const stageKey = ["brand", "prd", "srs", "sdd", "ux", "tasks"][s];
      const text = result.message.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");

      if (s === 0) {
        const lines = text.split("\n");
        for (const line of lines) {
          const match = line.match(/(?:app|application|project)\s*(?:name)?[:\-–]\s*(.+)/i);
          if (match) setAppName(match[1].trim());
        }
      }

      appendDocument(`\n\n## ${info.label}\n\n${text}`);
      updateStageData(stageKey as "brand" | "prd" | "srs" | "sdd" | "ux" | "tasks", "summary", text);
      markStageComplete(s);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      openModal();
      return;
    }
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  const handleChipClick = useCallback(
    (text: string) => {
      if (!apiKey) {
        openModal();
        return;
      }
      if (isLoading) return;
      sendMessage({ text });
    },
    [apiKey, isLoading, sendMessage, openModal],
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
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      for (let i = event.results.length - 1; i >= 0; i--) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript = result[0].transcript + " " + finalTranscript;
        }
      }
      if (finalTranscript) {
        setInput((prev) => prev + finalTranscript);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const noKey = !apiKey;

  return (
    <div className={cn("flex flex-col h-full max-md:pb-14", isLoading && "shimmer-border")}>
      <header className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white/90 truncate">AI Project Architect</h1>
            <p className="text-xs text-white/50 truncate">
              {appName ? `${appName} — ` : ""}
              Stage {activeStage + 1}/6: {stageInfo.label}
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
            {messages.length === 0 && (
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
                </div>
              </div>
            )}

            {messages
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
                    {m.parts
                      ?.filter((p: any) => p.type === "text")
                      .map((p: any) => p.text)
                      .join("")}
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

          {messages.filter((m) => m.role !== "system").length > 0 && !isLoading && (
            <div className="flex justify-end px-4 pb-1">
              <button
                onClick={() => {
                  if (activeStage < 5) nextStage();
                }}
                className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
              >
                {activeStage < 5 ? `Next: ${STAGES[activeStage + 1].label}` : "All stages complete!"}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="px-4 pb-2">
            <div className="flex overflow-x-auto whitespace-nowrap gap-2 scrollbar-none pb-2 px-1">
              {suggestions.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur-md transition-all duration-200 active:scale-95 shrink-0"
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
                placeholder={isLoading ? "AI is responding..." : "Type your message..."}
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/30 outline-none min-w-0 disabled:opacity-50"
              />
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
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
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

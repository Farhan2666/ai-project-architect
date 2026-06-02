"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useApiKeyStore } from "@/store/api-key";
import { useProjectStore, STAGES } from "@/store/project";
import { Send, Loader2, Key, ChevronRight } from "lucide-react";

export default function ChatPanel() {
  const { apiKey, provider, baseURL, model, openModal } = useApiKeyStore();
  const { activeStage, markStageComplete, nextStage, appName, setAppName, updateStageData, appendDocument } = useProjectStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const stageInfo = STAGES[activeStage];

  const { messages, sendMessage, regenerate, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { provider, apiKey, baseURL, model, stage: activeStage },
    }),
    onFinish: (result) => {
      const stageKey = ["brand", "prd", "srs", "sdd", "ux", "tasks"][activeStage];
      const text = result.message.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");

      if (activeStage === 0) {
        const lines = text.split("\n");
        for (const line of lines) {
          const match = line.match(/(?:app|application|project)\s*(?:name)?[:\-–]\s*(.+)/i);
          if (match) setAppName(match[1].trim());
        }
      }

      appendDocument(`\n\n## ${stageInfo.label}\n\n${text}`);
      updateStageData(stageKey as "brand" | "prd" | "srs" | "sdd" | "ux" | "tasks", "summary", text);
      markStageComplete(activeStage);
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

  if (!apiKey) {
    return (
      <div className="flex flex-col h-full max-md:pb-14">
        <Header stageInfo={stageInfo} />
        <div className="flex-1 flex items-center justify-center p-4">
          <button onClick={openModal} className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Key className="w-8 h-8" />
            <p className="text-sm">Set your API Key to start</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-md:pb-14">
      <Header stageInfo={stageInfo} activeStage={activeStage} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <p className="text-sm font-medium mb-1">{stageInfo.label}</p>
              <p className="text-xs text-muted-foreground">
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

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text).join("")}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2">
          <span className="flex-1 truncate">Error: {error.message}</span>
          <button
            onClick={() => regenerate()}
            className="shrink-0 text-xs font-medium hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      <footer className="border-t border-border p-3 space-y-2">
        {messages.length > 0 && !isLoading && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (activeStage < 5) nextStage();
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {activeStage < 5 ? `Next: ${STAGES[activeStage + 1].label}` : "All stages complete!"}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "AI is responding..." : "Type your message..."}
            disabled={isLoading}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-opacity shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </footer>
    </div>
  );
}

function Header({ stageInfo, activeStage }: { stageInfo: typeof STAGES[number]; activeStage?: number }) {
  const { appName } = useProjectStore();
  return (
    <header className="border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">AI Project Architect</h1>
          <p className="text-xs text-muted-foreground">
            {appName ? `${appName} — ` : ""}
            Stage {activeStage !== undefined ? activeStage + 1 : "?"}/6: {stageInfo.label}
          </p>
        </div>
      </div>
    </header>
  );
}

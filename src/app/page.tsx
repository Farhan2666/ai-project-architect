"use client";

import { useEffect } from "react";
import SplitScreen from "@/components/split-screen";
import ByokModal from "@/components/byok-modal";
import ChatPanel from "@/components/chat-panel";
import DocumentPanel from "@/components/document-panel";
import { useApiKeyStore } from "@/store/api-key";
import { useProjectStore } from "@/store/project";
import { requestPersistentStorage } from "@/lib/db";

export default function Home() {
  const hydrated = useProjectStore((s) => s.hydrated);

  useEffect(() => {
    const encrypted = localStorage.getItem("ai-project-architect-api-key-enc");
    if (encrypted) {
      useApiKeyStore.getState().openModal();
    } else {
      useApiKeyStore.getState().openModal();
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    requestPersistentStorage();
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <p className="text-sm text-white/40">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ByokModal />
      <SplitScreen left={<ChatPanel />} right={<DocumentPanel />} />
    </>
  );
}

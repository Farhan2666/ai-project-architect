"use client";

import { useEffect } from "react";

import SplitScreen from "@/components/split-screen";
import ByokModal from "@/components/byok-modal";
import ChatPanel from "@/components/chat-panel";
import DocumentPanel from "@/components/document-panel";
import { useApiKeyStore } from "@/store/api-key";
import { useProjectStore } from "@/store/project";

export default function Home() {
  useEffect(() => {
    const encrypted = localStorage.getItem("ai-project-architect-api-key-enc");
    if (!encrypted) {
      useApiKeyStore.getState().openModal();
    }
  }, []);

  return (
    <>
      <ByokModal />
      <SplitScreen left={<ChatPanel />} right={<DocumentPanel />} />
    </>
  );
}

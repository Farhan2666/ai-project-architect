"use client";

import { useEffect } from "react";
import SplitScreen from "@/components/split-screen";
import ByokModal from "@/components/byok-modal";
import ChatPanel from "@/components/chat-panel";
import DocumentPanel from "@/components/document-panel";
import { useApiKeyStore } from "@/store/api-key";

export default function Home() {
  const loadKey = useApiKeyStore((s) => s.loadKey);

  useEffect(() => {
    loadKey();
  }, [loadKey]);

  return (
    <>
      <ByokModal />
      <SplitScreen
        left={<ChatPanel />}
        right={<DocumentPanel />}
      />
    </>
  );
}

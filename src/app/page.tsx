"use client";

import { useEffect, useRef } from "react";
import SplitScreen from "@/components/split-screen";
import ByokModal from "@/components/byok-modal";
import ChatPanel from "@/components/chat-panel";
import DocumentPanel from "@/components/document-panel";
import { useApiKeyStore } from "@/store/api-key";
import { useProjectStore } from "@/store/project";
import type { StageData, StageId } from "@/lib/schemas";
import { hydrateFromStorage, requestPersistentStorage } from "@/lib/db";

export default function Home() {
  const hydrate = useProjectStore((s) => s.hydrate);
  const hydrated = useProjectStore((s) => s.hydrated);
  const persistedHydrated = useRef(false);

  useEffect(() => {
    const encrypted = typeof window !== "undefined"
      ? localStorage.getItem("ai-project-architect-api-key-enc")
      : null;
    if (encrypted) {
      useApiKeyStore.getState().openModal();
    } else {
      useApiKeyStore.getState().openModal();
    }
  }, []);

  useEffect(() => {
    if (persistedHydrated.current) return;
    persistedHydrated.current = true;

    hydrateFromStorage().then((data) => {
      if (data) {
        hydrate({
          document: data.document,
          stages: data.stages as StageData,
          appName: data.appName,
          completedStages: data.completedStages as StageId[],
          activeStage: data.activeStage as StageId,
        });
      } else {
        const legacyRaw = typeof window !== "undefined"
          ? localStorage.getItem("ai-project-architect-project")
          : null;
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw);
            if (legacy?.state) {
              hydrate({
                document: legacy.state.document || "",
                stages: (legacy.state.stages || {}) as StageData,
                appName: legacy.state.appName || "",
                completedStages: (legacy.state.completedStages || []) as StageId[],
                activeStage: (legacy.state.activeStage ?? 0) as StageId,
              });
              return;
            }
          } catch { /* ignore */ }
        }
        hydrate({ hydrated: true });
      }
    });

    requestPersistentStorage();
  }, [hydrate]);

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

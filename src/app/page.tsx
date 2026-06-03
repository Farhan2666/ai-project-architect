"use client";

import { useEffect } from "react";
import SplitScreen from "@/components/split-screen";
import ByokModal from "@/components/byok-modal";
import ChatPanel from "@/components/chat-panel";
import DocumentPanel from "@/components/document-panel";
import { useApiKeyStore } from "@/store/api-key";
import { useProjectStore } from "@/store/project";
import { migrateFromLocalStorage, hydrateFromStorage } from "@/lib/db";

export default function Home() {
  const loadKey = useApiKeyStore((s) => s.loadKey);
  const hydrate = useProjectStore((s) => s.hydrate);
  const hydrated = useProjectStore((s) => s.hydrated);

  useEffect(() => {
    loadKey();
  }, [loadKey]);

  useEffect(() => {
    if (hydrated) return;
    migrateFromLocalStorage();
    hydrateFromStorage().then((data) => {
      if (data) {
        hydrate({
          document: data.document,
          stages: data.stages as any,
          appName: data.appName,
          completedStages: data.completedStages as any,
          activeStage: data.activeStage as any,
        });
      } else {
        // Fallback: try legacy localStorage key
        const legacyRaw = typeof window !== "undefined"
          ? localStorage.getItem("ai-project-architect-project")
          : null;
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw);
            if (legacy?.state) {
              hydrate({
                document: legacy.state.document || "",
                stages: legacy.state.stages || {},
                appName: legacy.state.appName || "",
                completedStages: legacy.state.completedStages || [],
                activeStage: legacy.state.activeStage ?? 0,
              });
              return;
            }
          } catch { /* ignore parse failure */ }
        }
        hydrate({ hydrated: true });
      }
    });
  }, [hydrate, hydrated]);

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

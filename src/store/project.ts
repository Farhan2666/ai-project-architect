import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setDocumentData, deleteProjectData, getDocumentData } from "@/lib/db";

const BACKUP_KEY = "ai-project-architect-backup";

function saveAutoBackup(state: ProjectState) {
  try {
    const payload = JSON.stringify({
      appName: state.appName,
      stages: state.stages,
      document: state.document,
      completedStages: state.completedStages,
      activeStage: state.activeStage,
      backedUpAt: new Date().toISOString(),
    });
    localStorage.setItem(BACKUP_KEY, payload);
  } catch {}
}

export const STAGES = [
  { id: 0, label: "Brand & Identity", short: "Brand" },
  { id: 1, label: "PRD", short: "PRD" },
  { id: 2, label: "SRS", short: "SRS" },
  { id: 3, label: "SDD", short: "SDD" },
  { id: 4, label: "UI/UX Flow", short: "UI/UX" },
  { id: 5, label: "Task Breakdown", short: "Tasks" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export interface StageData {
  brand: Record<string, string>;
  prd: Record<string, string>;
  srs: Record<string, string>;
  sdd: Record<string, string>;
  ux: Record<string, string>;
  tasks: Record<string, string>;
}

interface ProjectState {
  activeStage: StageId;
  appName: string;
  stages: StageData;
  document: string;
  completedStages: StageId[];
  setAppName: (name: string) => void;
  setActiveStage: (stage: StageId) => void;
  nextStage: () => void;
  prevStage: () => void;
  updateStageData: (stage: keyof StageData, key: string, value: string) => void;
  setDocument: (doc: string) => void;
  appendDocument: (text: string) => void;
  markStageComplete: (stage: StageId) => void;
  isStageComplete: (stage: StageId) => boolean;
  reset: () => void;
  hydrateDocument: () => Promise<void>;
}

const INITIAL_STAGES: StageData = {
  brand: {},
  prd: {},
  srs: {},
  sdd: {},
  ux: {},
  tasks: {},
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      activeStage: 0,
      appName: "",
      stages: structuredClone(INITIAL_STAGES),
      document: "",
      completedStages: [],

      setAppName: (name) => set({ appName: name }),

      setActiveStage: (stage) => set({ activeStage: stage }),

      nextStage: () => {
        const { activeStage } = get();
        if (activeStage < 5) set({ activeStage: (activeStage + 1) as StageId });
      },

      prevStage: () => {
        const { activeStage } = get();
        if (activeStage > 0) set({ activeStage: (activeStage - 1) as StageId });
      },

      updateStageData: (stage, key, value) => {
        set((state) => ({
          stages: {
            ...state.stages,
            [stage]: { ...state.stages[stage], [key]: value },
          },
        }));
      },

      setDocument: (doc) => {
        set({ document: doc });
        setDocumentData(doc);
        saveAutoBackup(useProjectStore.getState());
      },

      appendDocument: (text) => {
        const doc = get().document + "\n" + text;
        set({ document: doc });
        setDocumentData(doc);
        saveAutoBackup(useProjectStore.getState());
      },

      markStageComplete: (stage) => {
        set((state) => ({
          completedStages: state.completedStages.includes(stage)
            ? state.completedStages
            : [...state.completedStages, stage],
        }));
      },

      isStageComplete: (stage) => get().completedStages.includes(stage),

      reset: () => {
        set({
          activeStage: 0,
          appName: "",
          stages: structuredClone(INITIAL_STAGES),
          document: "",
          completedStages: [],
        });
        deleteProjectData();
      },

      hydrateDocument: async () => {
        const state = useProjectStore.getState();
        if (state.document) return;

        // 1. Try Dexie (primary persistent store for large documents)
        const doc = await getDocumentData();
        if (doc) {
          set({ document: doc });
          saveAutoBackup(useProjectStore.getState());
          return;
        }

        // 2. Try auto-backup (localStorage fallback)
        try {
          const raw = localStorage.getItem("ai-project-architect-backup");
          if (raw) {
            const data = JSON.parse(raw);
            const updates: Record<string, unknown> = {};
            if (data?.document) updates.document = data.document;
            if (data?.stages && Object.keys(data.stages).length > Object.keys(state.stages).length) {
              const stageKeys = (Object.keys(state.stages) as (keyof StageData)[]).filter(k => Object.keys(state.stages[k]).length === 0);
              if (stageKeys.length > 0) {
                updates.stages = { ...state.stages, ...data.stages };
              }
            }
            if (Object.keys(updates).length > 0) {
              set(updates);
            }
          }
        } catch {}
      },
    }),
    {
      name: "ai-project-architect-ui",
      partialize: (state) => ({
        activeStage: state.activeStage,
        appName: state.appName,
        stages: state.stages,
        completedStages: state.completedStages,
      }),
      onRehydrateStorage: () => () => {
        useProjectStore.getState().hydrateDocument();
      },
    },
  ),
);

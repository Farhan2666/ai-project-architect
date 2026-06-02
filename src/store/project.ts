import { create } from "zustand";

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
}

const INITIAL_STAGES: StageData = {
  brand: {},
  prd: {},
  srs: {},
  sdd: {},
  ux: {},
  tasks: {},
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  activeStage: 0,
  appName: "",
  stages: { ...INITIAL_STAGES, brand: { ...INITIAL_STAGES.brand }, prd: { ...INITIAL_STAGES.prd }, srs: { ...INITIAL_STAGES.srs }, sdd: { ...INITIAL_STAGES.sdd }, ux: { ...INITIAL_STAGES.ux }, tasks: { ...INITIAL_STAGES.tasks } },
  document: "",
  completedStages: [],

  setAppName: (name) => set({ appName: name }),

  setActiveStage: (stage) => set({ activeStage: stage }),

  nextStage: () => {
    const { activeStage } = get();
    if (activeStage < 5) set({ activeStage: activeStage + 1 as StageId });
  },

  prevStage: () => {
    const { activeStage } = get();
    if (activeStage > 0) set({ activeStage: activeStage - 1 as StageId });
  },

  updateStageData: (stage, key, value) =>
    set((state) => ({
      stages: {
        ...state.stages,
        [stage]: { ...state.stages[stage], [key]: value },
      },
    })),

  setDocument: (doc) => set({ document: doc }),

  appendDocument: (text) =>
    set((state) => ({ document: state.document + "\n" + text })),

  markStageComplete: (stage) =>
    set((state) => ({
      completedStages: state.completedStages.includes(stage)
        ? state.completedStages
        : [...state.completedStages, stage],
    })),

  isStageComplete: (stage) => get().completedStages.includes(stage),

  reset: () =>
    set({
      activeStage: 0,
      appName: "",
      stages: { ...INITIAL_STAGES },
      document: "",
      completedStages: [],
    }),
}));

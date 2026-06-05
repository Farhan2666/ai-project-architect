import Dexie, { type EntityTable } from "dexie";
import { projectDataSchema, type StageData } from "./schemas";

const DB_NAME = "ai-project-architect";
const DB_VERSION = 2;
const STORE_NAME = "project-data";

interface ProjectRecord {
  id: string;
  document: string;
  stages: string;
  appName: string;
  completedStages: string;
  activeStage: number;
  migratedAt?: number;
}

class ProjectDatabase extends Dexie {
  projectData!: EntityTable<ProjectRecord, "id">;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      [STORE_NAME]: "id",
    });
  }
}

const db = new ProjectDatabase();

export async function getProjectData(): Promise<ProjectRecord | null> {
  try {
    const row = await db.projectData.get("default");
    if (!row) return null;
    const parsed = projectDataSchema.parse(row);
    return parsed;
  } catch {
    return null;
  }
}

export async function setProjectData(
  data: Omit<ProjectRecord, "id">,
): Promise<void> {
  try {
    const existing = await db.projectData.get("default");
    const payload: ProjectRecord = {
      ...(existing ?? {
        id: "default",
        document: "",
        stages: "{}",
        appName: "",
        completedStages: "[]",
        activeStage: 0,
      }),
      ...data,
      id: "default",
    };
    projectDataSchema.parse(payload);
    await db.projectData.put(payload);
  } catch {
    // silent fail — localStorage fallback masih berfungsi
  }
}

export async function deleteProjectData(): Promise<void> {
  try {
    await db.projectData.delete("default");
  } catch {
    // silent fail
  }
}

// --- Zustand async storage adapter ---

export const dexieStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (name === "ai-project-architect-project") {
      const row = await getProjectData();
      if (!row) return null;
      return JSON.stringify({
        state: {
          activeStage: row.activeStage,
          appName: row.appName,
          stages: JSON.parse(row.stages),
          document: row.document,
          completedStages: JSON.parse(row.completedStages),
        },
        version: 0,
      });
    }
    if (typeof window === "undefined") return null;
    return localStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (name === "ai-project-architect-project") {
      try {
        const parsed = JSON.parse(value);
        const state = parsed?.state;
        if (!state) return;
        await setProjectData({
          document: state.document ?? "",
          stages: JSON.stringify(state.stages ?? {}),
          appName: state.appName ?? "",
          completedStages: JSON.stringify(state.completedStages ?? []),
          activeStage: state.activeStage ?? 0,
        });
      } catch {
        // silent
      }
      return;
    }
    if (typeof window === "undefined") return;
    localStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (name === "ai-project-architect-project") {
      await deleteProjectData();
      return;
    }
    if (typeof window === "undefined") return;
    localStorage.removeItem(name);
  },
};

// --- Migrasi dari localStorage legacy ke Dexie ---

const LEGACY_KEYS = [
  "ai-project-architect-project",
  "ai-project-architect-api-key",
  "ai-project-architect-provider",
  "ai-project-architect-baseurl",
  "ai-project-architect-model",
] as const;

export async function migrateFromLocalStorage(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const migrated = localStorage.getItem("__migrated_to_idb");
  if (migrated === "true") return false;

  const legacy = localStorage.getItem("ai-project-architect-project");
  if (!legacy) return false;

  try {
    const parsed = JSON.parse(legacy);
    const { state } = parsed;
    if (!state) return false;

    await setProjectData({
      document: state.document || "",
      stages: JSON.stringify(state.stages || {}),
      appName: state.appName || "",
      completedStages: JSON.stringify(state.completedStages || []),
      activeStage: state.activeStage ?? 0,
      migratedAt: Date.now(),
    });

    localStorage.setItem("__migrated_to_idb", "true");
    return true;
  } catch {
    return false;
  }
}

export async function hydrateFromStorage(): Promise<{
  document: string;
  stages: StageData;
  appName: string;
  completedStages: number[];
  activeStage: number;
} | null> {
  try {
    const row = await getProjectData();
    if (!row) return null;
    const parsed = projectDataSchema.parse(row);
    return {
      document: parsed.document || "",
      stages: JSON.parse(parsed.stages),
      appName: parsed.appName || "",
      completedStages: JSON.parse(parsed.completedStages),
      activeStage: parsed.activeStage ?? 0,
    };
  } catch {
    return null;
  }
}

export { LEGACY_KEYS };

// --- StorageManager API ---

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }
  try {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

"use client";

const DB_NAME = "ai-project-architect";
const DB_VERSION = 1;
const STORE_NAME = "project-data";

const LEGACY_KEYS = [
  "ai-project-architect-project",
  "ai-project-architect-api-key",
  "ai-project-architect-provider",
  "ai-project-architect-baseurl",
  "ai-project-architect-model",
] as const;

interface ProjectData {
  id: string;
  document: string;
  stages: string;
  appName: string;
  completedStages: string;
  activeStage: number;
  migratedAt?: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getProjectData(): Promise<ProjectData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("default");
      req.onsuccess = () => {
        resolve(req.result ?? null);
        db.close();
      };
      req.onerror = () => {
        reject(req.error);
        db.close();
      };
    });
  } catch {
    return null;
  }
}

export async function setProjectData(data: Partial<ProjectData>): Promise<void> {
  try {
    const db = await openDB();
    const existing = await getProjectData();
    const payload = { ...existing, ...data, id: "default" };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(payload);
      req.onsuccess = () => { resolve(); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    });
  } catch {
    // silent fail — localStorage fallback still works
  }
}

export async function deleteProjectData(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete("default");
      req.onsuccess = () => { resolve(); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    });
  } catch {
    // silent fail
  }
}

export function migrateFromLocalStorage(): boolean {
  if (typeof window === "undefined") return false;
  const legacy = localStorage.getItem("ai-project-architect-project");
  if (!legacy) return false;
  try {
    const parsed = JSON.parse(legacy);
    const { state } = parsed;
    if (!state) return false;

    const migrated = localStorage.getItem("__migrated_to_idb");
    if (migrated === "true") return false;

    const data: ProjectData = {
      id: "default",
      document: state.document || "",
      stages: JSON.stringify(state.stages || {}),
      appName: state.appName || "",
      completedStages: JSON.stringify(state.completedStages || []),
      activeStage: state.activeStage ?? 0,
      migratedAt: Date.now(),
    };

    setProjectData(data).then(() => {
      localStorage.setItem("__migrated_to_idb", "true");
    });

    return true;
  } catch {
    return false;
  }
}

export async function hydrateFromStorage(): Promise<{
  document: string;
  stages: Record<string, Record<string, string>>;
  appName: string;
  completedStages: number[];
  activeStage: number;
} | null> {
  try {
    const data = await getProjectData();
    if (!data) return null;
    return {
      document: data.document || "",
      stages: data.stages ? JSON.parse(data.stages) : {},
      appName: data.appName || "",
      completedStages: data.completedStages ? JSON.parse(data.completedStages) : [],
      activeStage: data.activeStage ?? 0,
    };
  } catch {
    return null;
  }
}

export { LEGACY_KEYS };

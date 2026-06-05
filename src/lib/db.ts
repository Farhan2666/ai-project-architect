import Dexie, { type EntityTable } from "dexie";

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

export async function getDocumentData(): Promise<string> {
  try {
    const row = await db.projectData.get("default");
    return row?.document ?? "";
  } catch {
    return "";
  }
}

export async function setDocumentData(document: string): Promise<void> {
  try {
    const existing = await db.projectData.get("default");
    await db.projectData.put({
      ...(existing ?? {
        id: "default",
        document: "",
        stages: "{}",
        appName: "",
        completedStages: "[]",
        activeStage: 0,
      }),
      document,
      id: "default",
    });
  } catch {
    // silent
  }
}

export async function deleteProjectData(): Promise<void> {
  try {
    await db.projectData.delete("default");
  } catch {
    // silent
  }
}

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

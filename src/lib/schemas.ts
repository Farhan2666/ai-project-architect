import { z } from "zod";

const stageKeys = ["brand", "prd", "srs", "sdd", "ux", "tasks"] as const;
export type StageKey = (typeof stageKeys)[number];

export const stageDataSchema = z.object({
  brand: z.record(z.string(), z.string()),
  prd: z.record(z.string(), z.string()),
  srs: z.record(z.string(), z.string()),
  sdd: z.record(z.string(), z.string()),
  ux: z.record(z.string(), z.string()),
  tasks: z.record(z.string(), z.string()),
});

export type StageData = z.infer<typeof stageDataSchema>;

export const stageIdSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]) as z.ZodType<0 | 1 | 2 | 3 | 4 | 5>;

export type StageId = z.infer<typeof stageIdSchema>;

export const projectStateSchema = z.object({
  activeStage: stageIdSchema,
  appName: z.string(),
  stages: stageDataSchema,
  document: z.string(),
  completedStages: z.array(stageIdSchema),
});

export type ProjectState = z.infer<typeof projectStateSchema>;

export const projectDataSchema = z.object({
  id: z.literal("default"),
  document: z.string(),
  stages: z.string(),
  appName: z.string(),
  completedStages: z.string(),
  activeStage: z.number(),
  migratedAt: z.number().optional(),
});

export type ProjectData = z.infer<typeof projectDataSchema>;

import { z } from "zod";

const CurriculumTopicSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(500),
  position: z.number().int().nonnegative(),
});

const CurriculumModuleSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(500),
  position: z.number().int().nonnegative(),
  topics: z.array(CurriculumTopicSchema).min(1).max(20),
});

export const LearningPathSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1000),
  modules: z.array(CurriculumModuleSchema).min(1).max(12),
});

export type GeneratedLearningPath = z.infer<typeof LearningPathSchema>;
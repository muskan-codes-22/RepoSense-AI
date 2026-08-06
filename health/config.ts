import { HealthConfig } from "./types";

export const defaultConfig: HealthConfig = {
  weights: {
    documentation: 0.20,
    architecture: 0.20,
    codeQuality: 0.25,
    maintainability: 0.20,
    scalability: 0.15,
  },
  thresholds: {
    readmeLength: { excellent: 3000, good: 1000, basic: 300 },
    activityDays: { active: 30, moderate: 90, stale: 180, inactive: 365 },
    testFileRatio: { excellent: 0.3, good: 0.15, basic: 0.05 },
    docstringDensity: { excellent: 0.3, good: 0.15, basic: 0.05 },
    nestingDepth: { deep: 3, moderate: 2 },
    fileCount: { large: 50, medium: 20, small: 5 },
    topDirs: { large: 8, medium: 5, small: 3 },
  },
};

export function getGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function weightedAverage(scores: Record<string, number>, weights: Record<string, number>): number {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [key, score] of Object.entries(scores)) {
    const w = weights[key] ?? 0;
    weightedSum += score * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export interface FileContext {
  filesLower: string[];
  allContextLower: string;
  allPathsLower: string;
  totalFiles: number;
  topLevelDirs: Set<string>;
  repoLanguages: Record<string, number>;
}

export interface GithubSignals {
  pushedAt: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
}

export interface CheckResult {
  name: string;
  points: number;
  maxPoints: number;
  details?: string;
}

export interface ScorerResult {
  score: number;
  checks: CheckResult[];
}

export interface HealthConfig {
  weights: {
    documentation: number;
    architecture: number;
    codeQuality: number;
    maintainability: number;
    scalability: number;
  };
  thresholds: {
    readmeLength: { excellent: number; good: number; basic: number };
    activityDays: { active: number; moderate: number; stale: number; inactive: number };
    testFileRatio: { excellent: number; good: number; basic: number };
    docstringDensity: { excellent: number; good: number; basic: number };
    nestingDepth: { deep: number; moderate: number };
    fileCount: { large: number; medium: number; small: number };
    topDirs: { large: number; medium: number; small: number };
  };
}

export interface HealthResult {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  documentation: number;
  architecture: number;
  codeQuality: number;
  maintainability: number;
  scalability: number;
  breakdown: {
    documentation: CheckResult[];
    architecture: CheckResult[];
    codeQuality: CheckResult[];
    maintainability: CheckResult[];
    scalability: CheckResult[];
  };
  summary: string;
}

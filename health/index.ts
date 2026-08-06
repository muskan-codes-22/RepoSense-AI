import { FileContext, GithubSignals, HealthConfig, HealthResult } from "./types";
import { defaultConfig, getGrade, weightedAverage, clamp } from "./config";
import { scoreDocumentation } from "./documentation";
import { scoreArchitecture } from "./architecture";
import { scoreCodeQuality } from "./codeQuality";
import { scoreMaintainability } from "./maintainability";
import { scoreScalability } from "./scalability";
import { scoreGithubSignals } from "./githubSignals";

export type { HealthResult, HealthConfig, FileContext, GithubSignals, CheckResult, ScorerResult } from "./types";
export { defaultConfig } from "./config";

interface ComputeHealthScoreInput {
  filePathsInRepo: string[];
  filesContext: Record<string, string>;
  readmeContent: string;
  repoLanguages: Record<string, number>;
  repoMeta: {
    pushed_at?: string | null;
    stargazers_count?: number;
    forks_count?: number;
    open_issues_count?: number;
    language?: string | null;
  } | null;
  config?: Partial<HealthConfig>;
}

export function computeHealthScore(input: ComputeHealthScoreInput): HealthResult {
  const {
    filePathsInRepo,
    filesContext,
    readmeContent,
    repoLanguages,
    repoMeta,
    config: userConfig,
  } = input;

  const config: HealthConfig = {
    ...defaultConfig,
    ...userConfig,
    weights: { ...defaultConfig.weights, ...userConfig?.weights },
    thresholds: { ...defaultConfig.thresholds, ...userConfig?.thresholds },
  };

  // Build file context
  const filesLower = filePathsInRepo.map((f) => f.toLowerCase());
  const allContextLower = JSON.stringify(filesContext).toLowerCase();
  const allPathsLower = filesLower.join(" ");
  const topLevelDirs = new Set(
    filePathsInRepo.map((f) => f.split("/")[0]).filter((d) => !d.startsWith("."))
  );

  const fileCtx: FileContext = {
    filesLower,
    allContextLower,
    allPathsLower,
    totalFiles: filePathsInRepo.length,
    topLevelDirs,
    repoLanguages,
  };

  const githubSignals: GithubSignals = {
    pushedAt: repoMeta?.pushed_at ?? null,
    stars: repoMeta?.stargazers_count ?? 0,
    forks: repoMeta?.forks_count ?? 0,
    openIssues: repoMeta?.open_issues_count ?? 0,
    language: repoMeta?.language ?? null,
  };

  // Run all scorers
  const docResult = scoreDocumentation(fileCtx, readmeContent, config);
  const archResult = scoreArchitecture(fileCtx, config);
  const codeResult = scoreCodeQuality(fileCtx, config);
  const maintResult = scoreMaintainability(fileCtx, githubSignals, config);
  const scaleResult = scoreScalability(fileCtx, config);

  // Weighted average (no star bonus — community signals are now in their own scorer)
  const raw = weightedAverage(
    {
      documentation: docResult.score,
      architecture: archResult.score,
      codeQuality: codeResult.score,
      maintainability: maintResult.score,
      scalability: scaleResult.score,
    },
    config.weights
  );

  const overall = clamp(Math.round(raw), 0, 100);
  const grade = getGrade(overall);

  // Build summary
  const metrics = [
    { name: "Documentation", score: docResult.score },
    { name: "Architecture", score: archResult.score },
    { name: "Code Quality", score: codeResult.score },
    { name: "Maintainability", score: maintResult.score },
    { name: "Scalability", score: scaleResult.score },
  ];
  const weakest = [...metrics].sort((a, b) => a.score - b.score)[0];
  const strongest = [...metrics].sort((a, b) => b.score - a.score)[0];

  let summary = `Repository health score: ${overall}/100 (${grade}). `;
  summary += `Strongest area: ${strongest.name} (${strongest.score}/100). `;
  summary += `Weakest area: ${weakest.name} (${weakest.score}/100).`;

  return {
    overall,
    grade,
    documentation: docResult.score,
    architecture: archResult.score,
    codeQuality: codeResult.score,
    maintainability: maintResult.score,
    scalability: scaleResult.score,
    breakdown: {
      documentation: docResult.checks,
      architecture: archResult.checks,
      codeQuality: codeResult.checks,
      maintainability: maintResult.checks,
      scalability: scaleResult.checks,
    },
    summary,
  };
}

import { FileContext, CheckResult, ScorerResult, HealthConfig } from "./types";
import { clamp } from "./config";

export function scoreArchitecture(ctx: FileContext, config: HealthConfig): ScorerResult {
  const checks: CheckResult[] = [];
  let score = 0;
  const { thresholds } = config;

  // Top-level directory organization (0-20)
  const dirCount = ctx.topLevelDirs.size;
  if (dirCount > thresholds.topDirs.large) {
    const pts = 20;
    score += pts;
    checks.push({ name: "Top-level organization", points: pts, maxPoints: 20, details: `${dirCount} directories` });
  } else if (dirCount > thresholds.topDirs.medium) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Top-level organization", points: pts, maxPoints: 20, details: `${dirCount} directories` });
  } else if (dirCount > thresholds.topDirs.small) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Top-level organization", points: pts, maxPoints: 20, details: `${dirCount} directories` });
  } else {
    checks.push({ name: "Top-level organization", points: 0, maxPoints: 20, details: `${dirCount} directories (flat)` });
  }

  // Source directory presence (0-15)
  const srcPatterns = ["src/", "lib/", "pkg/", "app/", "source/"];
  const hasSourceDir = ctx.filesLower.some((f) => {
    const firstSegment = f.split("/")[0] + "/";
    return srcPatterns.includes(firstSegment) ||
      (f.match(/^[a-z]+\//) && !f.startsWith(".") && !f.startsWith("test") && !f.startsWith("doc"));
  });
  if (hasSourceDir) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Source directory", points: pts, maxPoints: 15 });
  } else {
    checks.push({ name: "Source directory", points: 0, maxPoints: 15, details: "No organized src directory" });
  }

  // Module/component separation (0-20) — graduated by count
  const separationPatterns = [
    "/components/", "/modules/", "/packages/", "/services/", "/utils/",
    "/helpers/", "/core/", "/io/", "/api/", "/lib/", "/hooks/",
    "/controllers/", "/models/", "/views/", "/middleware/", "/routes/",
    "\\components\\", "\\modules\\", "\\services\\", "\\utils\\",
  ];
  const separationHits = ctx.filesLower.filter((f) =>
    separationPatterns.some((p) => f.includes(p))
  ).length;
  if (separationHits > 30) {
    const pts = 20;
    score += pts;
    checks.push({ name: "Module separation", points: pts, maxPoints: 20, details: `${separationHits} files in organized modules` });
  } else if (separationHits > 15) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Module separation", points: pts, maxPoints: 20, details: `${separationHits} files in modules` });
  } else if (separationHits > 5) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Module separation", points: pts, maxPoints: 20, details: `${separationHits} files in modules` });
  } else if (separationHits > 0) {
    const pts = 5;
    score += pts;
    checks.push({ name: "Module separation", points: pts, maxPoints: 20, details: `${separationHits} files in modules` });
  } else {
    checks.push({ name: "Module separation", points: 0, maxPoints: 20, details: "No module separation detected" });
  }

  // Nesting depth — indicates structured code (0-15)
  const deepThreshold = thresholds.nestingDepth.deep;
  const moderateThreshold = thresholds.nestingDepth.moderate;
  const deepFiles = ctx.filesLower.filter((f) => f.split("/").length > deepThreshold);
  const moderateFiles = ctx.filesLower.filter((f) => f.split("/").length > moderateThreshold);
  const deepRatio = ctx.totalFiles > 0 ? deepFiles.length / ctx.totalFiles : 0;
  const moderateRatio = ctx.totalFiles > 0 ? moderateFiles.length / ctx.totalFiles : 0;
  if (deepRatio > 0.3) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Code nesting depth", points: pts, maxPoints: 15, details: `${(deepRatio * 100).toFixed(0)}% files deeply nested` });
  } else if (moderateRatio > 0.3) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Code nesting depth", points: pts, maxPoints: 15, details: `${(moderateRatio * 100).toFixed(0)}% files moderately nested` });
  } else {
    checks.push({ name: "Code nesting depth", points: 0, maxPoints: 15, details: "Mostly flat structure" });
  }

  // Config directory (0-10)
  const configPatterns = ["config/", "configs/", "src/config", "etc/", ".config/", "env/"];
  const hasConfigDir = ctx.filesLower.some((f) => configPatterns.some((p) => f.startsWith(p)));
  if (hasConfigDir) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Config directory", points: pts, maxPoints: 10 });
  } else {
    checks.push({ name: "Config directory", points: 0, maxPoints: 10 });
  }

  // Non-trivial project size (0-20)
  if (ctx.totalFiles > thresholds.fileCount.large) {
    const pts = 20;
    score += pts;
    checks.push({ name: "Project size", points: pts, maxPoints: 20, details: `${ctx.totalFiles} files` });
  } else if (ctx.totalFiles > thresholds.fileCount.medium) {
    const pts = 12;
    score += pts;
    checks.push({ name: "Project size", points: pts, maxPoints: 20, details: `${ctx.totalFiles} files` });
  } else if (ctx.totalFiles > thresholds.fileCount.small) {
    const pts = 6;
    score += pts;
    checks.push({ name: "Project size", points: pts, maxPoints: 20, details: `${ctx.totalFiles} files` });
  } else {
    checks.push({ name: "Project size", points: 0, maxPoints: 20, details: `${ctx.totalFiles} files (very small)` });
  }

  return { score: clamp(score, 0, 100), checks };
}

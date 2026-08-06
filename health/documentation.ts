import { FileContext, CheckResult, ScorerResult, HealthConfig } from "./types";
import { clamp } from "./config";

export function scoreDocumentation(ctx: FileContext, readmeContent: string, config: HealthConfig): ScorerResult {
  const checks: CheckResult[] = [];
  let score = 0;
  const { readmeLength } = config.thresholds;

  // README presence and quality (0-40)
  const hasReadme = ctx.filesLower.some(
    (f) => f.endsWith("readme.md") || f.endsWith("readme.rst") || f.endsWith("readme")
  );
  const readmeLen = readmeContent.length;
  if (hasReadme && readmeLen > readmeLength.excellent) {
    const pts = 40;
    score += pts;
    checks.push({ name: "README quality", points: pts, maxPoints: 40, details: `${readmeLen} chars (excellent)` });
  } else if (hasReadme && readmeLen > readmeLength.good) {
    const pts = 30;
    score += pts;
    checks.push({ name: "README quality", points: pts, maxPoints: 40, details: `${readmeLen} chars (good)` });
  } else if (hasReadme && readmeLen > readmeLength.basic) {
    const pts = 20;
    score += pts;
    checks.push({ name: "README quality", points: pts, maxPoints: 40, details: `${readmeLen} chars (basic)` });
  } else if (hasReadme) {
    const pts = 10;
    score += pts;
    checks.push({ name: "README quality", points: pts, maxPoints: 40, details: `${readmeLen} chars (minimal)` });
  } else {
    checks.push({ name: "README quality", points: 0, maxPoints: 40, details: "No README found" });
  }

  // Dedicated docs directory (0-20)
  const docsDirs = ctx.filesLower.filter(
    (f) => f.startsWith("docs/") || f.startsWith("doc/") || f.startsWith("documentation/")
  );
  const docsFileCount = docsDirs.length;
  if (docsFileCount > 20) {
    const pts = 20;
    score += pts;
    checks.push({ name: "Docs directory", points: pts, maxPoints: 20, details: `${docsFileCount} doc files` });
  } else if (docsFileCount > 5) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Docs directory", points: pts, maxPoints: 20, details: `${docsFileCount} doc files` });
  } else if (docsFileCount > 0) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Docs directory", points: pts, maxPoints: 20, details: `${docsFileCount} doc files` });
  } else {
    checks.push({ name: "Docs directory", points: 0, maxPoints: 20, details: "No docs directory" });
  }

  // Docstring / inline documentation density (0-20)
  const docstringPatterns = ["@param", "@returns", "@throws", "@example", ":param ", ":type ", "{@link}"];
  const pyDocPatterns = ['"""', "'''"];
  let docstringHits = 0;
  for (const pattern of docstringPatterns) {
    const count = (ctx.allContextLower.split(pattern.toLowerCase()).length - 1);
    docstringHits += count;
  }
  for (const pattern of pyDocPatterns) {
    const count = (ctx.allContextLower.split(pattern).length - 1);
    docstringHits += count;
  }
  const docDensity = ctx.totalFiles > 0 ? docstringHits / ctx.totalFiles : 0;
  if (docDensity > config.thresholds.docstringDensity.excellent) {
    const pts = 20;
    score += pts;
    checks.push({ name: "Inline documentation", points: pts, maxPoints: 20, details: `${docstringHits} docstrings across ${ctx.totalFiles} files` });
  } else if (docDensity > config.thresholds.docstringDensity.good) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Inline documentation", points: pts, maxPoints: 20, details: `${docstringHits} docstrings` });
  } else if (docstringHits > 0) {
    const pts = 8;
    score += pts;
    checks.push({ name: "Inline documentation", points: pts, maxPoints: 20, details: `${docstringHits} docstrings` });
  } else {
    checks.push({ name: "Inline documentation", points: 0, maxPoints: 20, details: "No docstrings detected" });
  }

  // Changelog (0-10)
  const hasChangelog = ctx.filesLower.some(
    (f) => f.includes("changelog") || f.includes("changes") || f.includes("history")
  );
  if (hasChangelog) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Changelog", points: pts, maxPoints: 10 });
  } else {
    checks.push({ name: "Changelog", points: 0, maxPoints: 10 });
  }

  // Contributing guide (0-10)
  const hasContributing = ctx.filesLower.some((f) => f.includes("contributing"));
  if (hasContributing) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Contributing guide", points: pts, maxPoints: 10 });
  } else {
    checks.push({ name: "Contributing guide", points: 0, maxPoints: 10 });
  }

  return { score: clamp(score, 0, 100), checks };
}

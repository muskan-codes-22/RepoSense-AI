import { FileContext, CheckResult, ScorerResult, GithubSignals, HealthConfig } from "./types";
import { clamp } from "./config";

export function scoreMaintainability(
  ctx: FileContext,
  github: GithubSignals,
  config: HealthConfig
): ScorerResult {
  const checks: CheckResult[] = [];
  let score = 0;
  const { activityDays } = config.thresholds;

  // Dependency / lock file (0-20)
  const lockPatterns = [
    "package-lock.json", "yarn.lock", "pnpm-lock",
    "poetry.lock", "go.sum", "Cargo.lock", "Gemfile.lock",
    "composer.lock", "Pipfile.lock", "pip-tools", "uv.lock",
    "requirements-lock", "requirements.txt", "setup.py", "setup.cfg",
    "pyproject.toml", "pom.xml", "build.gradle", "build.gradle.kts",
    "go.mod", "Cargo.toml", "Gemfile", "mix.exs", "pubspec.lock",
    "package.json", "bun.lockb",
  ];
  const lockHits = ctx.filesLower.filter((f) =>
    lockPatterns.some((p) => f.includes(p))
  ).length;
  if (lockHits >= 3) {
    const pts = 20;
    score += pts;
    checks.push({ name: "Dependency management", points: pts, maxPoints: 20, details: `${lockHits} dependency files` });
  } else if (lockHits >= 1) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Dependency management", points: pts, maxPoints: 20 });
  } else {
    checks.push({ name: "Dependency management", points: 0, maxPoints: 20, details: "No lock/dependency files found" });
  }

  // Dependency automation (0-15)
  const depAutoPatterns = ["dependabot", "renovate", "renovate.json", ".renovaterc", "renovate.json5"];
  const hasDepAutomation = ctx.filesLower.some((f) =>
    depAutoPatterns.some((p) => f.includes(p))
  );
  if (hasDepAutomation) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Dependency automation", points: pts, maxPoints: 15 });
  } else {
    checks.push({ name: "Dependency automation", points: 0, maxPoints: 15, details: "No Dependabot/Renovate" });
  }

  // License (0-10)
  const hasLicense = ctx.filesLower.some((f) => {
    const name = f.split("/").pop() || f;
    return (name === "license" || name === "license.md" || name === "license.txt" ||
      name === "license-bsd" || name === "license-apache" || name === "license-mit" ||
      name.startsWith("license")) &&
      (name.endsWith(".md") || name.endsWith(".txt") || name.endsWith(".rst") || name === "license");
  });
  if (hasLicense) {
    const pts = 10;
    score += pts;
    checks.push({ name: "License", points: pts, maxPoints: 10 });
  } else {
    checks.push({ name: "License", points: 0, maxPoints: 10, details: "No license file" });
  }

  // Issue/PR templates (0-10)
  const templatePatterns = [
    "issue_template", "ISSUE_TEMPLATE", "pull_request_template",
    "PULL_REQUEST_TEMPLATE", ".github/ISSUE_TEMPLATE", ".github/pull_request_template",
    "bug_report", "feature_request",
  ];
  const hasTemplates = ctx.filesLower.some((f) =>
    templatePatterns.some((p) => f.includes(p))
  );
  if (hasTemplates) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Issue/PR templates", points: pts, maxPoints: 10 });
  } else {
    checks.push({ name: "Issue/PR templates", points: 0, maxPoints: 10 });
  }

  // Activity recency — graduated from GitHub API (0-25)
  if (github.pushedAt) {
    const daysSinceUpdate = (Date.now() - new Date(github.pushedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < activityDays.active) {
      const pts = 25;
      score += pts;
      checks.push({ name: "Last activity", points: pts, maxPoints: 25, details: `Updated ${Math.floor(daysSinceUpdate)} days ago` });
    } else if (daysSinceUpdate < activityDays.moderate) {
      const pts = 18;
      score += pts;
      checks.push({ name: "Last activity", points: pts, maxPoints: 25, details: `Updated ${Math.floor(daysSinceUpdate)} days ago` });
    } else if (daysSinceUpdate < activityDays.stale) {
      const pts = 10;
      score += pts;
      checks.push({ name: "Last activity", points: pts, maxPoints: 25, details: `Updated ${Math.floor(daysSinceUpdate)} days ago` });
    } else if (daysSinceUpdate < activityDays.inactive) {
      const pts = 5;
      score += pts;
      checks.push({ name: "Last activity", points: pts, maxPoints: 25, details: `Updated ${Math.floor(daysSinceUpdate)} days ago` });
    } else {
      checks.push({ name: "Last activity", points: 0, maxPoints: 25, details: `Inactive for ${Math.floor(daysSinceUpdate)} days` });
    }
  } else {
    checks.push({ name: "Last activity", points: 0, maxPoints: 25, details: "No activity data" });
  }

  // CI config (0-10)
  const ciPatterns = [
    ".github/workflows/", ".gitlab-ci", ".circleci/",
    "Jenkinsfile", ".travis.yml", "azure-pipelines",
    "bitbucket-pipelines", "appveyor", "buildkite", "woodpecker",
  ];
  const hasCI = ctx.filesLower.some((f) =>
    ciPatterns.some((p) => f.includes(p))
  );
  if (hasCI) {
    const pts = 10;
    score += pts;
    checks.push({ name: "CI configuration", points: pts, maxPoints: 10 });
  } else {
    checks.push({ name: "CI configuration", points: 0, maxPoints: 10, details: "No CI config detected" });
  }

  // Community files (0-10)
  const communityPatterns = [
    "code_of_conduct", "CODE_OF_CONDUCT", "security.md", "SECURITY.md",
    "support.md", "SUPPORT.md", ".github/CODE_OF_CONDUCT",
    "code_of_conduct.md", "funding.yml",
  ];
  const hasCommunity = ctx.filesLower.some((f) =>
    communityPatterns.some((p) => f.includes(p))
  );
  if (hasCommunity) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Community files", points: pts, maxPoints: 10 });
  } else {
    checks.push({ name: "Community files", points: 0, maxPoints: 10 });
  }

  return { score: clamp(score, 0, 100), checks };
}

import { CheckResult, ScorerResult, GithubSignals, HealthConfig } from "./types";
import { clamp } from "./config";

export function scoreGithubSignals(
  github: GithubSignals,
  config: HealthConfig
): ScorerResult {
  const checks: CheckResult[] = [];
  let score = 0;
  const { activityDays } = config.thresholds;

  // Commit activity recency (0-30) — replaces naive day check
  if (github.pushedAt) {
    const daysSinceUpdate = (Date.now() - new Date(github.pushedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) {
      const pts = 30;
      score += pts;
      checks.push({ name: "Recent activity", points: pts, maxPoints: 30, details: `Updated ${Math.floor(daysSinceUpdate)} days ago` });
    } else if (daysSinceUpdate < 30) {
      const pts = 25;
      score += pts;
      checks.push({ name: "Recent activity", points: pts, maxPoints: 30, details: `Updated ${Math.floor(daysSinceUpdate)} days ago` });
    } else if (daysSinceUpdate < activityDays.moderate) {
      const pts = 15;
      score += pts;
      checks.push({ name: "Recent activity", points: pts, maxPoints: 30, details: `Updated ${Math.floor(daysSinceUpdate)} days ago` });
    } else if (daysSinceUpdate < activityDays.stale) {
      const pts = 8;
      score += pts;
      checks.push({ name: "Recent activity", points: pts, maxPoints: 30, details: `Updated ${Math.floor(daysSinceUpdate)} days ago` });
    } else {
      checks.push({ name: "Recent activity", points: 0, maxPoints: 30, details: `Inactive for ${Math.floor(daysSinceUpdate)} days` });
    }
  } else {
    checks.push({ name: "Recent activity", points: 0, maxPoints: 30, details: "No activity data" });
  }

  // Issue health — open issue ratio (0-25)
  const totalIssues = github.openIssues;
  if (totalIssues >= 0) {
    // Low open issues is healthy
    if (totalIssues === 0) {
      const pts = 25;
      score += pts;
      checks.push({ name: "Issue management", points: pts, maxPoints: 25, details: "No open issues" });
    } else if (totalIssues < 10) {
      const pts = 20;
      score += pts;
      checks.push({ name: "Issue management", points: pts, maxPoints: 25, details: `${totalIssues} open issues` });
    } else if (totalIssues < 50) {
      const pts = 12;
      score += pts;
      checks.push({ name: "Issue management", points: pts, maxPoints: 25, details: `${totalIssues} open issues` });
    } else if (totalIssues < 200) {
      const pts = 5;
      score += pts;
      checks.push({ name: "Issue management", points: pts, maxPoints: 25, details: `${totalIssues} open issues` });
    } else {
      checks.push({ name: "Issue management", points: 0, maxPoints: 25, details: `${totalIssues} open issues (high backlog)` });
    }
  }

  // Fork-to-star ratio — indicates real usage vs vanity stars (0-20)
  if (github.stars > 0) {
    const forkRatio = github.forks / github.stars;
    if (forkRatio > 0.5) {
      const pts = 20;
      score += pts;
      checks.push({ name: "Community adoption", points: pts, maxPoints: 20, details: `Fork ratio: ${(forkRatio * 100).toFixed(0)}% (high adoption)` });
    } else if (forkRatio > 0.2) {
      const pts = 15;
      score += pts;
      checks.push({ name: "Community adoption", points: pts, maxPoints: 20, details: `Fork ratio: ${(forkRatio * 100).toFixed(0)}%` });
    } else if (forkRatio > 0.05) {
      const pts = 8;
      score += pts;
      checks.push({ name: "Community adoption", points: pts, maxPoints: 20, details: `Fork ratio: ${(forkRatio * 100).toFixed(0)}%` });
    } else {
      checks.push({ name: "Community adoption", points: 0, maxPoints: 20, details: `Fork ratio: ${(forkRatio * 100).toFixed(0)}% (low usage)` });
    }
  } else {
    checks.push({ name: "Community adoption", points: 0, maxPoints: 20, details: "No stars" });
  }

  // Project size relative to maturity (0-15)
  if (github.stars > 5000) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Project maturity", points: pts, maxPoints: 15, details: `${github.stars.toLocaleString()} stars` });
  } else if (github.stars > 1000) {
    const pts = 12;
    score += pts;
    checks.push({ name: "Project maturity", points: pts, maxPoints: 15, details: `${github.stars.toLocaleString()} stars` });
  } else if (github.stars > 100) {
    const pts = 8;
    score += pts;
    checks.push({ name: "Project maturity", points: pts, maxPoints: 15, details: `${github.stars.toLocaleString()} stars` });
  } else if (github.stars > 10) {
    const pts = 4;
    score += pts;
    checks.push({ name: "Project maturity", points: pts, maxPoints: 15, details: `${github.stars.toLocaleString()} stars` });
  } else {
    checks.push({ name: "Project maturity", points: 0, maxPoints: 15, details: `${github.stars} stars (early stage)` });
  }

  // Language presence (0-10) — having a primary language is a good signal
  if (github.language) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Primary language", points: pts, maxPoints: 10, details: github.language });
  } else {
    checks.push({ name: "Primary language", points: 0, maxPoints: 10, details: "No primary language detected" });
  }

  return { score: clamp(score, 0, 100), checks };
}

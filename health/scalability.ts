import { FileContext, CheckResult, ScorerResult, HealthConfig } from "./types";
import { clamp } from "./config";

export function scoreScalability(ctx: FileContext, config: HealthConfig): ScorerResult {
  const checks: CheckResult[] = [];
  let score = 0;

  // Containerization — graduated (0-20)
  const dockerPatterns = ["dockerfile", "docker-compose", ".dockerignore", "docker-compose.yml", "docker-compose.yaml", "docker-compose.json"];
  const dockerHits = ctx.filesLower.filter((f) =>
    dockerPatterns.some((p) => f.includes(p))
  ).length;
  if (dockerHits >= 3) {
    const pts = 20;
    score += pts;
    checks.push({ name: "Containerization", points: pts, maxPoints: 20, details: `${dockerHits} Docker files` });
  } else if (dockerHits >= 1) {
    const pts = 12;
    score += pts;
    checks.push({ name: "Containerization", points: pts, maxPoints: 20 });
  } else {
    checks.push({ name: "Containerization", points: 0, maxPoints: 20, details: "No Docker files" });
  }

  // CI/CD pipeline — graduated (0-25)
  const ciPatterns = [
    ".github/workflows/", ".gitlab-ci", ".circleci/",
    "Jenkinsfile", ".travis.yml", "azure-pipelines",
    "bitbucket-pipelines", "buildkite", ".drone", "woodpecker",
  ];
  const ciHits = ctx.filesLower.filter((f) =>
    ciPatterns.some((p) => f.includes(p))
  ).length;
  if (ciHits >= 3) {
    const pts = 25;
    score += pts;
    checks.push({ name: "CI/CD pipeline", points: pts, maxPoints: 25, details: `${ciHits} CI configs` });
  } else if (ciHits >= 1) {
    const pts = 18;
    score += pts;
    checks.push({ name: "CI/CD pipeline", points: pts, maxPoints: 25 });
  } else {
    checks.push({ name: "CI/CD pipeline", points: 0, maxPoints: 25, details: "No CI/CD detected" });
  }

  // Deployment config — graduated (0-15)
  const deployPatterns = [
    "deploy", "vercel.json", "netlify.toml", "Procfile",
    "render.yaml", "kubernetes", "k8s", "helm", "terraform",
    "ansible", ".ebextensions", "appspec.yml", "fly.toml",
    "railway.json", "coolify", ".platform", "serverless.yml",
    "serverless.yaml", "aws/", "gcp/", "azure/",
  ];
  const deployHits = ctx.filesLower.filter((f) =>
    deployPatterns.some((p) => f.includes(p))
  ).length;
  if (deployHits >= 3) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Deployment config", points: pts, maxPoints: 15, details: `${deployHits} deployment indicators` });
  } else if (deployHits >= 1) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Deployment config", points: pts, maxPoints: 15 });
  } else {
    checks.push({ name: "Deployment config", points: 0, maxPoints: 15, details: "No deployment config" });
  }

  // Environment config (0-10)
  const envPatterns = [".env.example", ".env.sample", ".env.template", ".env.dev", ".env.local", ".env.staging"];
  const hasEnv = ctx.filesLower.some((f) =>
    envPatterns.some((p) => f.includes(p))
  );
  if (hasEnv) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Environment config", points: pts, maxPoints: 10 });
  } else {
    checks.push({ name: "Environment config", points: 0, maxPoints: 10, details: "No .env.example" });
  }

  // .gitignore (0-5)
  const hasGitignore = ctx.filesLower.some((f) => f.includes(".gitignore"));
  if (hasGitignore) {
    const pts = 5;
    score += pts;
    checks.push({ name: ".gitignore", points: pts, maxPoints: 5 });
  } else {
    checks.push({ name: ".gitignore", points: 0, maxPoints: 5 });
  }

  // Language diversity (0-10) — not penalizing focused projects
  const langCount = Object.keys(ctx.repoLanguages).length;
  if (langCount > 5) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Language diversity", points: pts, maxPoints: 10, details: `${langCount} languages` });
  } else if (langCount > 3) {
    const pts = 7;
    score += pts;
    checks.push({ name: "Language diversity", points: pts, maxPoints: 10, details: `${langCount} languages` });
  } else {
    checks.push({ name: "Language diversity", points: 0, maxPoints: 10, details: `${langCount} languages (focused stack)` });
  }

  // Modularity bonus (0-15) — only awarded when both source dir and separation exist
  const srcPatterns = ["src/", "lib/", "pkg/", "app/", "source/"];
  const hasSourceDir = ctx.filesLower.some((f) => {
    const firstSegment = f.split("/")[0] + "/";
    return srcPatterns.includes(firstSegment);
  });
  const separationPatterns = ["/components/", "/modules/", "/services/", "/utils/", "/core/", "/api/", "/lib/"];
  const hasSeparation = ctx.filesLower.some((f) =>
    separationPatterns.some((p) => f.includes(p))
  );
  if (hasSourceDir && hasSeparation) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Modular architecture", points: pts, maxPoints: 15 });
  } else {
    checks.push({ name: "Modular architecture", points: 0, maxPoints: 15 });
  }

  return { score: clamp(score, 0, 100), checks };
}

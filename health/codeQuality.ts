import { FileContext, CheckResult, ScorerResult, HealthConfig } from "./types";
import { clamp } from "./config";

function detectTestFrameworks(ctx: FileContext): string[] {
  const frameworks: string[] = [];
  const patterns: Record<string, string[]> = {
    "Jest": ["jest.config", "jest.setup"],
    "Vitest": ["vitest.config"],
    "Mocha": [".mocharc", "mocha.config"],
    "Karma": ["karma.conf"],
    "Playwright": ["playwright.config"],
    "Cypress": ["cypress.config", "cypress.json"],
    "Pytest": ["pytest.ini", "conftest.py", "pyproject.toml"],
    "unittest": ["test_"],
    "JUnit": ["junit", "testng"],
    "Go testing": ["_test.go"],
    "PHPUnit": ["phpunit"],
    "RSpec": ["rspec", ".rspec"],
    "Minitest": ["minitest"],
  };
  for (const [name, markers] of Object.entries(patterns)) {
    if (markers.some((m) => ctx.filesLower.some((f) => f.includes(m.toLowerCase())))) {
      frameworks.push(name);
    }
  }
  return frameworks;
}

function countTestFiles(ctx: FileContext): number {
  return ctx.filesLower.filter((f) =>
    f.includes(".test.") || f.includes(".spec.") ||
    f.includes("/test/") || f.includes("/tests/") || f.includes("/__tests__/") ||
    f.includes("\\test\\") || f.includes("\\tests\\") ||
    f.includes("test_") || f.includes("_test.") ||
    f.includes("conftest") || f.includes("test.py") ||
    f.includes("_test.go") || f.includes("test.java") ||
    f.includes("spec.rb") || f.includes("test_") ||
    f.includes("phpunit") || f.includes("spec.ts") || f.includes("spec.js")
  ).length;
}

export function scoreCodeQuality(ctx: FileContext, config: HealthConfig): ScorerResult {
  const checks: CheckResult[] = [];
  let score = 0;

  // Linter detection (0-20) — graduated by ecosystem coverage
  const linterPatterns = [
    "eslint", ".eslintrc", "eslint.config",
    "ruff.toml", ".ruff", "ruff.toml",
    "flake8", ".flake8", "setup.cfg",
    "pylintrc", ".pylintrc", "pylint",
    "checkstyle", "spotbugs", "golangci",
    ".rubocop", "rubocop", ".clippy",
    "biome.json", "rome.json",
  ];
  const linterHits = ctx.filesLower.filter((f) =>
    linterPatterns.some((p) => f.includes(p))
  ).length;
  if (linterHits >= 2) {
    const pts = 20;
    score += pts;
    checks.push({ name: "Linter", points: pts, maxPoints: 20, details: `${linterHits} linter configs found` });
  } else if (linterHits === 1) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Linter", points: pts, maxPoints: 20 });
  } else {
    checks.push({ name: "Linter", points: 0, maxPoints: 20, details: "No linter detected" });
  }

  // Formatter detection (0-10)
  const formatterPatterns = [
    "prettier", "prettierrc", "prettier.config",
    "black", ".black", "pyproject.toml",
    "rustfmt", "rustfmt.toml",
    "google-java-format", "stylua",
    "biome.json", ".editorconfig",
  ];
  const hasFormatter = ctx.filesLower.some((f) =>
    formatterPatterns.some((p) => f.includes(p))
  );
  if (hasFormatter) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Formatter", points: pts, maxPoints: 10 });
  } else {
    checks.push({ name: "Formatter", points: 0, maxPoints: 10, details: "No formatter detected" });
  }

  // Type checking (0-15)
  const typePatterns = [
    "tsconfig", "jsconfig",
    "mypy.ini", "mypy", "mypy.toml",
    "pyright", "pyrightconfig", "py.typed",
    "pyrightconfig.json",
  ];
  const hasTypes = ctx.filesLower.some((f) =>
    typePatterns.some((p) => f.includes(p))
  );
  if (hasTypes) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Type checking", points: pts, maxPoints: 15 });
  } else {
    checks.push({ name: "Type checking", points: 0, maxPoints: 15, details: "No type checker detected" });
  }

  // Testing — graduated by test file ratio and framework presence (0-30)
  const testFrameworks = detectTestFrameworks(ctx);
  const testFileCount = countTestFiles(ctx);
  const testRatio = ctx.totalFiles > 0 ? testFileCount / ctx.totalFiles : 0;
  const hasFramework = testFrameworks.length > 0;

  if (testRatio > config.thresholds.testFileRatio.excellent && hasFramework) {
    const pts = 30;
    score += pts;
    checks.push({ name: "Testing", points: pts, maxPoints: 30, details: `${testFileCount} test files (${(testRatio * 100).toFixed(0)}%), frameworks: ${testFrameworks.join(", ")}` });
  } else if (testRatio > config.thresholds.testFileRatio.good && hasFramework) {
    const pts = 25;
    score += pts;
    checks.push({ name: "Testing", points: pts, maxPoints: 30, details: `${testFileCount} test files, ${testFrameworks.join(", ")}` });
  } else if (testRatio > config.thresholds.testFileRatio.basic) {
    const pts = 18;
    score += pts;
    checks.push({ name: "Testing", points: pts, maxPoints: 30, details: `${testFileCount} test files (${(testRatio * 100).toFixed(0)}%)` });
  } else if (testFileCount > 0) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Testing", points: pts, maxPoints: 30, details: `${testFileCount} test files (low ratio)` });
  } else {
    checks.push({ name: "Testing", points: 0, maxPoints: 30, details: "No tests detected" });
  }

  // Coverage tool (0-15) — graduated
  const coveragePatterns = [
    "coverage", "jest.config", "vitest.config", ".nycrc",
    "coverage.xml", "htmlcov", "lcov", "lcov.info",
    ".coveragerc", "codecov", "coveralls",
    "pytest-cov", "jacoco", "tarpaulin",
    ".c8rc", "nyc.config",
  ];
  const coverageHits = ctx.filesLower.filter((f) =>
    coveragePatterns.some((p) => f.includes(p))
  ).length;
  if (coverageHits >= 3) {
    const pts = 15;
    score += pts;
    checks.push({ name: "Coverage tooling", points: pts, maxPoints: 15, details: `${coverageHits} coverage indicators` });
  } else if (coverageHits >= 1) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Coverage tooling", points: pts, maxPoints: 15 });
  } else {
    checks.push({ name: "Coverage tooling", points: 0, maxPoints: 15, details: "No coverage tooling detected" });
  }

  // Pre-commit hooks (0-10)
  const hookPatterns = ["husky", "pre-commit", "lint-staged", ".pre-commit-config", "lefthook", "yorkie"];
  const hasHooks = ctx.filesLower.some((f) =>
    hookPatterns.some((p) => f.includes(p))
  );
  if (hasHooks) {
    const pts = 10;
    score += pts;
    checks.push({ name: "Pre-commit hooks", points: pts, maxPoints: 10 });
  } else {
    checks.push({ name: "Pre-commit hooks", points: 0, maxPoints: 10, details: "No pre-commit hooks" });
  }

  return { score: clamp(score, 0, 100), checks };
}

# Repository Health Score

A deterministic, modular scoring system that evaluates GitHub repository health across 5 categories. Replaces AI-generated scores with reproducible, file-system-based analysis combined with GitHub API signals.

## Overview

| Property | Value |
|---|---|
| Score range | 0–100 |
| Grade scale | A (90+), B (75+), C (60+), D (40+), F (<40) |
| Categories | 5 (Documentation, Architecture, Code Quality, Maintainability, Scalability) |
| Scoring method | Weighted average of graduated sub-scores |
| Data sources | Git tree file paths, file contents, GitHub REST API |

## Architecture

```
health/
├── index.ts              Orchestrator — composes all scorers, computes final grade
├── types.ts              HealthResult, CheckResult, FileContext, HealthConfig interfaces
├── config.ts             Default weights/thresholds, getGrade(), clamp(), weightedAverage()
├── documentation.ts      Documentation scorer (0–100)
├── architecture.ts       Architecture scorer (0–100)
├── codeQuality.ts        Code quality scorer (0–100)
├── maintainability.ts    Maintainability scorer (0–100)
├── scalability.ts        Scalability scorer (0–100)
└── githubSignals.ts      GitHub community signal scorer (0–100)
```

Each scorer is an independent function that returns a `ScorerResult` (score + per-check breakdown). No scorer shares state with another. Every check belongs to exactly one category — no double-counting.

## How the Overall Score Is Calculated

```
overall = (docScore × 0.20) + (archScore × 0.20) + (codeScore × 0.25) + (maintScore × 0.20) + (scaleScore × 0.15)
```

Each sub-score is independently normalized to 0–100. The weighted average is rounded and clamped to [0, 100].

### Category Weights

| Category | Weight | Rationale |
|---|---|---|
| Documentation | 20% | Critical for adoption and onboarding |
| Architecture | 20% | Structural quality affects long-term maintenance |
| Code Quality | 25% | Highest weight — directly impacts reliability |
| Maintainability | 20% | Sustainability and project health |
| Scalability | 15% | Deployment and growth readiness |

### Grade Mapping

| Score | Grade |
|---|---|
| 90–100 | **A** — Excellent |
| 75–89 | **B** — Good |
| 60–74 | **C** — Average |
| 40–59 | **D** — Below Average |
| 0–39 | **F** — Poor |

## Scoring Breakdown

### 1. Documentation (0–100)

Evaluates README quality, dedicated documentation, inline docstrings, changelog, and contributing guide.

| Check | Max Points | Scoring |
|---|---|---|
| README quality | 40 | 40: >3000 chars, 30: >1000, 20: >300, 10: exists, 0: missing |
| Docs directory | 20 | 20: >20 files, 15: >5, 10: any, 0: none |
| Inline documentation | 20 | 20: >30% density, 15: >15%, 8: any docstrings, 0: none |
| Changelog | 10 | 10: present, 0: missing |
| Contributing guide | 10 | 10: present, 0: missing |

**Docstring detection covers**: JSDoc (`@param`, `@returns`, `@throws`), Python (`"""`, `'''`, `:param`), Java (`{@link}`, `/** */`), and general doc markers.

### 2. Architecture (0–100)

Evaluates directory organization, source structure, module separation, code nesting, config management, and project size.

| Check | Max Points | Scoring |
|---|---|---|
| Top-level organization | 20 | 20: >8 dirs, 15: >5, 10: >3, 0: flat |
| Source directory | 15 | 15: `src/`, `lib/`, `pkg/`, `app/` present, 0: missing |
| Module separation | 20 | 20: >30 files in modules, 15: >15, 10: >5, 5: any, 0: none |
| Code nesting depth | 15 | 15: >30% files at 4+ levels, 10: >30% at 3+ levels, 0: flat |
| Config directory | 10 | 10: `config/`, `configs/`, `etc/` present, 0: missing |
| Project size | 20 | 20: >50 files, 12: >20, 6: >5, 0: tiny |

**Module detection covers**: `components/`, `modules/`, `packages/`, `services/`, `utils/`, `helpers/`, `core/`, `io/`, `api/`, `lib/`, `hooks/`, `controllers/`, `models/`, `views/`, `middleware/`, `routes/`.

### 3. Code Quality (0–100)

Evaluates linting, formatting, type checking, testing, coverage, and pre-commit hooks.

| Check | Max Points | Scoring |
|---|---|---|
| Linter | 20 | 20: ≥2 configs, 15: 1, 0: none |
| Formatter | 10 | 10: present, 0: missing |
| Type checking | 15 | 15: present, 0: missing |
| Testing | 30 | 30: >30% test files + framework, 25: >15% + framework, 18: >5%, 10: any tests, 0: none |
| Coverage tooling | 15 | 15: ≥3 indicators, 10: ≥1, 0: none |
| Pre-commit hooks | 10 | 10: present, 0: missing |

**Linter detection**: ESLint, Ruff, Flake8, Pylint, Checkstyle, SpotBugs, golangci-lint, RuboCop, Clippy, Biome.

**Formatter detection**: Prettier, Black, rustfmt, google-java-format, StyLua, Biome, EditorConfig.

**Type checker detection**: TypeScript (`tsconfig`), mypy, pyright, `py.typed`.

**Test framework detection**: Jest, Vitest, Mocha, Karma, Playwright, Cypress, Pytest, unittest, JUnit, Go testing, PHPUnit, RSpec, Minitest.

### 4. Maintainability (0–100)

Evaluates dependency management, automation, licensing, templates, activity, CI, and community health.

| Check | Max Points | Scoring |
|---|---|---|
| Dependency management | 20 | 20: ≥3 lock/dep files, 15: ≥1, 0: none |
| Dependency automation | 15 | 15: Dependabot/Renovate present, 0: missing |
| License | 10 | 10: present, 0: missing |
| Issue/PR templates | 10 | 10: present, 0: missing |
| Last activity | 25 | 25: <30 days, 18: <90, 10: <180, 5: <365, 0: inactive |
| CI configuration | 10 | 10: present, 0: missing |
| Community files | 10 | 10: Code of Conduct/Security policy, 0: missing |

**Supported ecosystems** (22+ dependency formats): npm (`package-lock.json`, `yarn.lock`, `pnpm-lock`, `bun.lockb`), Python (`poetry.lock`, `Pipfile.lock`, `uv.lock`, `requirements.txt`, `setup.py`, `pyproject.toml`), Go (`go.sum`, `go.mod`), Rust (`Cargo.lock`, `Cargo.toml`), Ruby (`Gemfile.lock`, `Gemfile`), PHP (`composer.lock`), Java (`pom.xml`, `build.gradle`, `build.gradle.kts`), Elixir (`mix.exs`), Dart (`pubspec.lock`).

### 5. Scalability (0–100)

Evaluates containerization, CI/CD pipelines, deployment config, environment management, and modularity.

| Check | Max Points | Scoring |
|---|---|---|
| Containerization | 20 | 20: ≥3 Docker files, 12: ≥1, 0: none |
| CI/CD pipeline | 25 | 25: ≥3 CI configs, 18: ≥1, 0: none |
| Deployment config | 15 | 15: ≥3 deploy indicators, 10: ≥1, 0: none |
| Environment config | 10 | 10: `.env.example` present, 0: missing |
| .gitignore | 5 | 5: present, 0: missing |
| Language diversity | 10 | 10: >5 languages, 7: >3, 0: focused stack |
| Modular architecture | 15 | 15: source dir + module separation both present, 0: otherwise |

**Deployment detection**: Vercel, Netlify, Render, Heroku (`Procfile`), Kubernetes, Helm, Terraform, Ansible, Fly.io, Railway, Coolify, Serverless Framework, AWS/GCP/Azure configs.

### 6. GitHub Signals (supplementary)

Provides community health signals. Currently computed but not directly weighted into the overall score (used for future enhancements).

| Check | Max Points | Scoring |
|---|---|---|
| Recent activity | 30 | 30: <7 days, 25: <30, 15: <90, 8: <180, 0: inactive |
| Issue management | 25 | 25: 0 open, 20: <10, 12: <50, 5: <200, 0: high backlog |
| Community adoption | 20 | 20: fork ratio >50%, 15: >20%, 8: >5%, 0: low |
| Project maturity | 15 | 15: >5000 stars, 12: >1000, 8: >100, 4: >10, 0: early stage |
| Primary language | 10 | 10: detected, 0: none |

## Configuration

All weights and thresholds are configurable via `HealthConfig`:

```typescript
import { computeHealthScore, defaultConfig } from "./health";

const result = computeHealthScore({
  filePathsInRepo,
  filesContext,
  readmeContent,
  repoLanguages,
  repoMeta,
  config: {
    weights: {
      documentation: 0.25,  // increase doc weight
      codeQuality: 0.30,    // increase code quality weight
      // ... other weights
    },
    thresholds: {
      readmeLength: { excellent: 5000, good: 2000, basic: 500 },
      activityDays: { active: 14, moderate: 60, stale: 120, inactive: 365 },
      testFileRatio: { excellent: 0.4, good: 0.2, basic: 0.05 },
      // ... other thresholds
    },
  },
});
```

### Default Thresholds

| Threshold | Value | Description |
|---|---|---|
| `readmeLength.excellent` | 3000 chars | README considered excellent |
| `readmeLength.good` | 1000 chars | README considered good |
| `readmeLength.basic` | 300 chars | README considered basic |
| `activityDays.active` | 30 days | Repo considered actively maintained |
| `activityDays.moderate` | 90 days | Repo considered moderately maintained |
| `activityDays.stale` | 180 days | Repo considered stale |
| `activityDays.inactive` | 365 days | Repo considered inactive |
| `testFileRatio.excellent` | 30% | Excellent test coverage ratio |
| `testFileRatio.good` | 15% | Good test coverage ratio |
| `testFileRatio.basic` | 5% | Basic test coverage ratio |
| `docstringDensity.excellent` | 30% | Excellent inline documentation |
| `docstringDensity.good` | 15% | Good inline documentation |
| `docstringDensity.basic` | 5% | Basic inline documentation |
| `nestingDepth.deep` | 3 levels | Deeply nested files |
| `nestingDepth.moderate` | 2 levels | Moderately nested files |
| `fileCount.large` | 50 files | Large project |
| `fileCount.medium` | 20 files | Medium project |
| `fileCount.small` | 5 files | Small project |
| `topDirs.large` | 8 dirs | Many top-level directories |
| `topDirs.medium` | 5 dirs | Moderate top-level directories |
| `topDirs.small` | 3 dirs | Few top-level directories |

## API Reference

### `computeHealthScore(input)`

```typescript
interface ComputeHealthScoreInput {
  filePathsInRepo: string[];          // All file paths from git tree
  filesContext: Record<string, string>; // File name → content mapping (for docstring detection)
  readmeContent: string;              // Raw README content
  repoLanguages: Record<string, number>; // Language → byte count mapping
  repoMeta: {                         // GitHub API repo metadata
    pushed_at?: string | null;
    stargazers_count?: number;
    forks_count?: number;
    open_issues_count?: number;
    language?: string | null;
  } | null;
  config?: Partial<HealthConfig>;     // Optional overrides
}
```

**Returns**: `HealthResult`

```typescript
interface HealthResult {
  overall: number;                    // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  documentation: number;              // 0–100
  architecture: number;               // 0–100
  codeQuality: number;                // 0–100
  maintainability: number;            // 0–100
  scalability: number;                // 0–100
  breakdown: {
    documentation: CheckResult[];     // Per-check detail
    architecture: CheckResult[];
    codeQuality: CheckResult[];
    maintainability: CheckResult[];
    scalability: CheckResult[];
  };
  summary: string;                    // Human-readable summary
}

interface CheckResult {
  name: string;                       // Check name
  points: number;                     // Points awarded
  maxPoints: number;                  // Maximum possible
  details?: string;                   // Optional explanation
}
```

### Individual Scorers

Each scorer can be used standalone:

```typescript
import { scoreDocumentation } from "./health/documentation";
import { scoreCodeQuality } from "./health/codeQuality";
// ... etc

const docResult = scoreDocumentation(fileCtx, readmeContent, config);
const codeResult = scoreCodeQuality(fileCtx, config);
```

### Configuration Helpers

```typescript
import { getGrade, clamp, weightedAverage, defaultConfig } from "./health/config";

getGrade(85);           // "B"
clamp(150, 0, 100);     // 100
weightedAverage({ a: 80, b: 60 }, { a: 0.6, b: 0.4 });  // 72
```

## Key Design Decisions

### No Double-Counting

Each file-system check belongs to exactly one category. For example:
- CI config appears only in Maintainability (not also in Scalability)
- README presence appears only in Documentation (not also in Maintainability)
- Module separation appears only in Architecture (and modularity bonus in Scalability requires both source dir + separation)

### Graduated Scoring

Every check uses graduated thresholds instead of binary 0/max. A repo with 1 test file gets credit (10 points) but significantly less than a repo with 30%+ test coverage (30 points).

### Deterministic

All scoring is based on file paths and file contents — no randomness, no AI inference. The same repo will always produce the same score.

### Configurable

All weights and thresholds can be overridden per-call. No config files to edit — pass overrides in the `config` parameter.

## Migration from Old System

The old system used:
- Binary presence/absence checks (0 or max points)
- Star count bonus (+1/+3/+5)
- README counted in both Documentation and Maintainability
- CI config counted in both Maintainability and Scalability
- Language count = scalability indicator

The new system:
- Graduated scoring with multiple tiers per check
- Star/fork ratio measures real adoption (in GitHub Signals)
- Each check belongs to one category only
- Language diversity is a separate, non-penalizing metric
- GitHub API signals (activity, issues, forks) are integrated into Maintainability

import express from "express";
import path from "path";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { computeHealthScore } from "./health";

if (!process.env.VERCEL) {
  dotenv.config({ override: true });
}

// Startup diagnostics for environment and APIs
console.log("=== REPOSENSE STARTUP DIAGNOSTICS ===");
console.log("Backend startup status: Initializing");
console.log("Loaded environment variables:");
console.log("- NVIDIA_API_KEY:", process.env.NVIDIA_API_KEY ? `Present (Prefix: ${process.env.NVIDIA_API_KEY.substring(0, 10)}...)` : "Missing");
console.log("- GITHUB_TOKEN:", process.env.GITHUB_TOKEN ? `Present (Prefix: ${process.env.GITHUB_TOKEN.substring(0, 10)}...)` : "Missing");
console.log("- SUPABASE_URL:", process.env.SUPABASE_URL ? "Present" : "Missing");
console.log("- SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "Present" : "Missing");
console.log("Current API route paths: POST /api/analyze");


// Initialize Supabase admin client safely
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();

const isUrlValid = (url: string) => {
  try {
    return /^https?:\/\/\S+$/.test(url) && !url.includes("ENTER_YOUR");
  } catch {
    return false;
  }
};

let supabaseAdmin = null;
if (isUrlValid(supabaseUrl) && supabaseServiceKey && !supabaseServiceKey.includes("ENTER_YOUR")) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log("[✓] Supabase connected (Integration active)");
  } catch (err: any) {
    console.error("[RepoSense Server] Failed to initialize Supabase admin client:", err.message || err);
  }
} else {
  console.warn("[RepoSense Server] Supabase credentials missing or invalid. Local-only fallbacks will be used.");
}

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "1mb" }));

// In-memory cache for AI API results (1-hour TTL)
const analysisCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCachedResult(key: string): any | null {
  const cached = analysisCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Cache] Hit for key: ${key}`);
    return cached.result;
  }
  if (cached) analysisCache.delete(key);
  return null;
}

function setCachedResult(key: string, result: any): void {
  analysisCache.set(key, { result, timestamp: Date.now() });
  // Evict oldest entries if cache exceeds 100 entries
  if (analysisCache.size > 100) {
    const oldestKey = analysisCache.keys().next().value;
    if (oldestKey) analysisCache.delete(oldestKey);
  }
}


// Helper to parse GitHub repository URL
function parseGitHubUrl(repoUrl: string) {
  try {
    const cleaned = repoUrl.trim().replace(/\.git$/, "");
    // Handles https://github.com/owner/repo or github.com/owner/repo or owner/repo
    let pathPart = cleaned;
    if (cleaned.includes("github.com/")) {
      const parts = cleaned.split("github.com/");
      pathPart = parts[parts.length - 1];
    } else if (cleaned.includes("github.com:")) {
      const parts = cleaned.split("github.com:");
      pathPart = parts[parts.length - 1];
    }
    
    // Split into owner/repo
    const segments = pathPart.split("/").filter(s => s.length > 0);
    if (segments.length >= 2) {
      return {
        owner: segments[0],
        repo: segments[1],
      };
    }
  } catch (e) {
    console.error("Error parsing URL:", e);
  }
  return null;
}

// Helper to safely extract JSON from string (cleans up any markdown wrappers & repairs common LLM syntax quirks)
function extractJson(text: string) {
  let cleaned = text.trim();

  // 1. Remove markdown codeblock wrapper if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  cleaned = cleaned.trim();

  // 2. Convert Python-style triple quotes to standard JSON-escaped double quotes
  cleaned = cleaned.replace(/"""([\s\S]*?)"""/g, (match, p1) => {
    const escaped = p1
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, "\\n");
    return `"${escaped}"`;
  });

  // 3. Fix unescaped literal newlines inside regular double-quoted strings.
  let insideString = false;
  let escapeActive = false;
  let result = "";
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (insideString) {
      if (escapeActive) {
        result += char;
        escapeActive = false;
      } else if (char === "\\") {
        result += char;
        escapeActive = true;
      } else if (char === '"') {
        result += char;
        insideString = false;
      } else if (char === "\n") {
        result += "\\n";
      } else if (char === "\r") {
        result += "\\r";
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        insideString = true;
      }
      result += char;
    }
  }

  try {
    return JSON.parse(result);
  } catch (e: any) {
    throw new Error("Extracted text block could not be parsed as valid JSON: " + e.message);
  }
}



// SSE helper to write a typed event
function sendSSE(res: express.Response, data: Record<string, any>) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// REST route for code/repo analysis (SSE streaming)
app.post("/api/analyze", async (req, res) => {
  console.log("[API] Analyze route hit");
  const { url, userId } = req.body;
  let rawAiResult = "";
  if (!url) {
    return res.status(400).json({ error: "Repository URL is required." });
  }

  console.log("[Analyze] Request received");
  console.log("[Analyze] GitHub URL:", url);
  console.log("✓ GitHub URL received:", url);

  const repoDetails = parseGitHubUrl(url);
  if (!repoDetails) {
    return res.status(400).json({ error: "Invalid GitHub repository URL format. Please enter a valid path." });
  }

  const { owner, repo } = repoDetails;
  console.log("✓ Repository parsed:", `${owner}/${repo}`);
  console.log(`[RepoSense Engine] Starting dual-phase parse for: ${owner}/${repo}`);

  // Check cache first
  const cacheKey = `${owner}/${repo}`;
  const cachedResult = getCachedResult(cacheKey);
  if (cachedResult) {
    console.log(`[Cache] Returning cached result for ${cacheKey}`);
    // Cache hit — return as SSE done event so frontend handles it uniformly
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    sendSSE(res, { type: "done", report: cachedResult });
    return res.end();
  }

  // Set SSE headers early so we can stream progress during GitHub API calls
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Stage 1: Connecting to GitHub
  sendSSE(res, { type: "stage", step: 1 });

  // Base setup headers backed by GITHUB_TOKEN if available to prevent API rate-limits
  const headers: Record<string, string> = {
    "User-Agent": "RepoSense-AI-App",
    "Accept": "application/vnd.github.v3+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  let repoMeta: any = null;
  let repoContents: any = null;
  let repoLanguages: any = {};
  let readmeContent = "";
  let filesContext: Record<string, string> = {};
  let apiSuccess = false;
  let usedApiFallback = false;
  let filePathsInRepo: string[] = [];
  let gitTree: any[] = [];

  try {
    console.log("[Analyze] Calling GitHub API");
    // 1. Fetch Repository Metadata
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

    if (repoRes.status === 404) {
      return res.status(404).json({ 
        error: `Repository '${owner}/${repo}' was not found. Please verify that the name is spelled correctly and the repo is Public.`,
        errorType: "Repository Not Found"
      });
    }

    if (!repoRes.ok) {
      return res.status(repoRes.status).json({
        error: `GitHub API returned status code ${repoRes.status}. Could not verify repository credentials.`,
        errorType: "GitHub Authentication Failed"
      });
    }

    repoMeta = await repoRes.json();
    apiSuccess = true;
    console.log("✓ Repository metadata fetched");

    // Parallel fetch: languages and git tree
    const branch = repoMeta.default_branch || "main";
    const [langResult, treeResult] = await Promise.allSettled([
      // 2. Fetch Languages
      fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers })
        .then(r => r.ok ? r.json() : {}),
      // 3. Fetch Recursive Git Tree
      fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers })
        .then(r => r.ok ? r.json() : null)
    ]);

    // Extract results from parallel fetches
    if (langResult.status === "fulfilled") {
      repoLanguages = langResult.value;
      console.log("✓ Languages fetched:", Object.keys(repoLanguages));
    }
    if (treeResult.status === "fulfilled" && treeResult.value && Array.isArray(treeResult.value.tree)) {
      gitTree = treeResult.value.tree;
      filePathsInRepo = gitTree.map((node: any) => node.path);
      if (treeResult.value.truncated) {
        console.warn(`[Warning] Git tree truncated at ${filePathsInRepo.length} entries. Health score may be less accurate for very large repos.`);
      }
      console.log(`✓ Git tree fetched recursively. Total nodes: ${filePathsInRepo.length}`);
    }

    // Sort file paths for deterministic health scoring

    // Stage 2: Reading Repository Files
    sendSSE(res, { type: "stage", step: 2 });
    filePathsInRepo.sort();

    // 5. Fallback directory contents fetch if recursive tree failed
    if (filePathsInRepo.length === 0) {
      const contentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
      if (contentsRes.ok) {
        repoContents = await contentsRes.json();
        if (Array.isArray(repoContents)) {
          filePathsInRepo = repoContents.map((f: any) => f.path);
        }
      }
    }

    // 6. Locate and concurrently fetch important configuration files (max 8)
    const targetFilePatterns = [
      "readme.md", "package.json", "requirements.txt", "cargo.toml", "pom.xml",
      "composer.json", "gemfile", "go.mod", "dockerfile", "tsconfig.json",
      "vite.config.ts", "vite.config.js", "tailwind.config.js"
    ];

    const filesToFetch: { path: string, name: string }[] = [];
    if (gitTree && gitTree.length > 0) {
      for (const node of gitTree) {
        if (node.type === "blob") {
          const lowerPath = node.path.toLowerCase();
          const fileName = lowerPath.split("/").pop() || "";
          if (targetFilePatterns.includes(fileName) && filesToFetch.length < 8) {
            const alreadyHasName = filesToFetch.some(f => f.name === fileName);
            if (!alreadyHasName || fileName === "package.json") {
              filesToFetch.push({ path: node.path, name: fileName });
            }
          }
        }
      }
    } else if (Array.isArray(repoContents)) {
      for (const node of repoContents) {
        if (node.type === "file") {
          const lowerName = node.name.toLowerCase();
          if (targetFilePatterns.includes(lowerName) && filesToFetch.length < 8) {
            filesToFetch.push({ path: node.path, name: lowerName });
          }
        }
      }
    }

    // Sort for deterministic fetch order
    filesToFetch.sort((a, b) => a.name.localeCompare(b.name));

    // Fetch config files — collect results then insert in deterministic order
    const fileResults = await Promise.all(
      filesToFetch.map(async (fileInfo) => {
        try {
          const branch = repoMeta?.default_branch || "main";
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fileInfo.path}`;
          const rawRes = await fetch(rawUrl, { headers });
          if (rawRes.ok) {
            const text = await rawRes.text();
            return { name: fileInfo.name, text, fullName: fileInfo.name.toLowerCase() };
          }
        } catch (err) {
          console.error(`Error downloading raw file ${fileInfo.path}:`, err);
        }
        return null;
      })
    );
    // Insert in sorted order for deterministic JSON.stringify output
    fileResults
      .filter((r): r is { name: string; text: string; fullName: string } => r !== null)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(({ name, text, fullName }) => {
        filesContext[name] = text.substring(0, 500);
        if (fullName === "readme.md") {
          readmeContent = text;
        }
      });

    // Dynamic recovery for readme if not fetched yet
    if (!readmeContent) {
      try {
        const rawReadmeRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`
        );
        if (rawReadmeRes.ok) {
          readmeContent = await rawReadmeRes.text();
          filesContext["README.md"] = readmeContent.substring(0, 500);
        }
      } catch (readmeErr) {
        console.warn("README raw recovery failed:", readmeErr);
      }
    }

    if (readmeContent) {
      console.log("✓ README fetched");
    }

  } catch (error: any) {
    console.error("GitHub retrieval pipeline failure:", error);
    // Continue with synthesis fallback if primary api failed but do not force-crash
  }

  // Stage 3: Analyzing Project Structure
  sendSSE(res, { type: "stage", step: 3 });

  // Ensure filePathsInRepo has at least some elements
  if (filePathsInRepo.length === 0 && Array.isArray(repoContents)) {
    filePathsInRepo = repoContents.map((f: any) => f.name);
  }

  // Heuristic classification of repository type
  let detectedRepoType = "Web Application";
  const filePathsLower = filePathsInRepo.map(f => f.toLowerCase());
  const allFilesContextStr = JSON.stringify(filesContext).toLowerCase();
  const repoNameLower = repo.toLowerCase();
  const repoDescLower = (repoMeta?.description || "").toLowerCase();
  const repoTopics = Array.isArray(repoMeta?.topics) ? repoMeta.topics.map((t: string) => t.toLowerCase()) : [];

  // Mutually-exclusive detailed heuristics for repository types
  const isLearningKeyword = (str: string) => 
    str.includes("learn") || str.includes("course") || str.includes("tutorial") || 
    str.includes("exercise") || str.includes("homework") || str.includes("study") || 
    str.includes("practice") || str.includes("intro") || str.includes("basic") || 
    str.includes("curriculum") || str.includes("assignment") || str.includes("classwork") ||
    str.includes("sandbox") || str.includes("example") || str.includes("demo-");

  if (isLearningKeyword(repoNameLower) || isLearningKeyword(repoDescLower) || repoTopics.some((t: string) => isLearningKeyword(t))) {
    if (repoNameLower.includes("course") || repoDescLower.includes("course") || repoTopics.includes("course") || repoTopics.includes("class")) {
      detectedRepoType = "Course Repository";
    } else {
      detectedRepoType = "Learning Repository";
    }
  } else if (
    repoNameLower.includes("portfolio") || repoDescLower.includes("portfolio") || 
    repoTopics.includes("portfolio") || repoDescLower.includes("personal website") || 
    repoDescLower.includes("about me") || repoNameLower.includes("resume") || repoNameLower.includes("about-me")
  ) {
    detectedRepoType = "Portfolio";
  } else if (
    repoNameLower.includes("docs") || repoNameLower.includes("documentation") || 
    repoNameLower.includes("wiki") || repoDescLower.includes("docs") || 
    repoDescLower.includes("documentation") || repoDescLower.includes("guide") || 
    repoDescLower.includes("handbook") || repoTopics.includes("documentation") ||
    repoTopics.includes("docs") || filePathsLower.every(f => f.endsWith(".md") || f.endsWith(".txt") || f.startsWith("docs/"))
  ) {
    detectedRepoType = "Documentation";
  } else if (
    repoDescLower.includes("research") || repoDescLower.includes("paper") || 
    repoTopics.includes("research") || filePathsLower.some(f => f.endsWith(".tex") || f.includes("paper.pdf"))
  ) {
    detectedRepoType = "Research Project";
  } else if (
    filePathsLower.some(f => f.includes("dotfiles") || f.includes("kubernetes") || f.includes("ansible") || f.includes("terraform") || f.includes("docker-compose") || f.includes(".nix")) ||
    repoNameLower.includes("dotfiles") || repoTopics.includes("dotfiles") || repoTopics.includes("infrastructure")
  ) {
    detectedRepoType = "Configuration Repository";
  } else if (
    (filePathsLower.some(f => f.endsWith(".csv") || f.endsWith(".tsv") || f.endsWith(".parquet") || f.endsWith(".db") || f.endsWith(".sqlite")) &&
     !filePathsLower.some(f => f.includes("package.json") || f.includes("tsconfig.json"))) ||
    repoDescLower.includes("dataset") || repoDescLower.includes("data repository") || repoTopics.includes("dataset")
  ) {
    detectedRepoType = "Data Repository";
  } else if (
    allFilesContextStr.includes("torch") || allFilesContextStr.includes("tensorflow") || 
    allFilesContextStr.includes("scikit-learn") || allFilesContextStr.includes("keras") || 
    allFilesContextStr.includes("pandas") || allFilesContextStr.includes("numpy") ||
    filePathsLower.some(f => f.endsWith(".ipynb")) || repoTopics.includes("machine-learning") || repoTopics.includes("deep-learning")
  ) {
    const isAiKeyword = (str: string) =>
      str.includes("openai") || str.includes("langchain") || str.includes("gemini") ||
      str.includes("huggingface") || str.includes("llm") || str.includes("agent") ||
      str.includes("chatbot") || str.includes("gpt") || str.includes("claude") ||
      str.includes("llama") || str.includes("text-generation");
      
    if (isAiKeyword(repoNameLower) || isAiKeyword(repoDescLower) || isAiKeyword(allFilesContextStr) || repoTopics.some((t: string) => isAiKeyword(t))) {
      detectedRepoType = "AI Project";
    } else {
      detectedRepoType = "Machine Learning";
    }
  } else if (
    allFilesContextStr.includes("android") || allFilesContextStr.includes("ios") || 
    allFilesContextStr.includes("flutter") || allFilesContextStr.includes("react-native") || 
    repoTopics.includes("android") || repoTopics.includes("ios") || repoTopics.includes("flutter") ||
    filePathsLower.some(f => f.endsWith(".kt") || f.endsWith(".swift") || f.endsWith("androidmanifest.xml") || f.endsWith("podfile") || f.endsWith("pubspec.yaml"))
  ) {
    detectedRepoType = "Mobile App";
  } else if (
    allFilesContextStr.includes("cobra") || allFilesContextStr.includes("click") || 
    allFilesContextStr.includes("argparse") || allFilesContextStr.includes("commander") || 
    allFilesContextStr.includes("yargs") || repoTopics.includes("cli") || repoNameLower.includes("cli") ||
    (filesContext["package.json"] && (() => { try { return JSON.parse(filesContext["package.json"]).bin !== undefined; } catch { return false; } })())
  ) {
    detectedRepoType = "CLI Tool";
  } else if (
    repoNameLower.includes("library") || repoNameLower.includes("sdk") || 
    repoDescLower.includes("library") || repoDescLower.includes("package") || 
    repoTopics.includes("library") || repoTopics.includes("package") || repoTopics.includes("sdk") ||
    (filesContext["package.json"] && (() => {
       try {
         const p = JSON.parse(filesContext["package.json"]);
         return !allFilesContextStr.includes("react") && !allFilesContextStr.includes("express") && !allFilesContextStr.includes("next") && (p.main || p.module || p.exports);
       } catch { return false; }
     })())
  ) {
    detectedRepoType = "Library";
  } else if (
    (allFilesContextStr.includes("express") || allFilesContextStr.includes("fastapi") || allFilesContextStr.includes("flask") || allFilesContextStr.includes("spring-boot") || allFilesContextStr.includes("django") || allFilesContextStr.includes("gin-gonic")) &&
    !allFilesContextStr.includes("react") && !allFilesContextStr.includes("vue") && !allFilesContextStr.includes("html") && !filePathsLower.some(f => f.endsWith(".html"))
  ) {
    detectedRepoType = "API Service";
  } else {
    detectedRepoType = "Web Application";
  }

  // Programmatically detect exact Tech Stack
  const techMetadata = (() => {
    const filePathsLower = filePathsInRepo.map(f => f.toLowerCase());
    const allContentsLower = JSON.stringify(filesContext).toLowerCase();
    const detectedLanguages = Object.keys(repoLanguages);

    const languages = detectedLanguages.length > 0 
      ? detectedLanguages 
      : (repoMeta?.language ? [repoMeta.language] : ["TypeScript", "JavaScript"]);

    const frameworks: string[] = [];
    const libraries: string[] = [];
    const databases: string[] = [];
    const tools: string[] = [];

    // Framework detection
    if (allContentsLower.includes("next")) frameworks.push("Next.js");
    else if (allContentsLower.includes("react-dom") || allContentsLower.includes("react-router")) frameworks.push("React");
    if (allContentsLower.includes("vue") || filePathsLower.some(f => f.endsWith(".vue"))) frameworks.push("Vue.js");
    if (allContentsLower.includes("nuxt")) frameworks.push("Nuxt.js");
    if (allContentsLower.includes("@angular/core")) frameworks.push("Angular");
    if (allContentsLower.includes("svelte")) frameworks.push("Svelte");
    if (allContentsLower.includes("express")) frameworks.push("Express.js");
    if (allContentsLower.includes("fastapi")) frameworks.push("FastAPI");
    if (allContentsLower.includes("flask")) frameworks.push("Flask");
    if (allContentsLower.includes("django")) frameworks.push("Django");
    if (allContentsLower.includes("spring-boot") || (allContentsLower.includes("spring") && languages.includes("Java"))) frameworks.push("Spring Boot");
    if (allContentsLower.includes("laravel/framework") || allContentsLower.includes("laravel")) frameworks.push("Laravel");
    if (allContentsLower.includes("rails") || filePathsLower.some(f => f === "gemfile" && allContentsLower.includes("rails"))) frameworks.push("Ruby on Rails");
    if (allContentsLower.includes("gofiber/fiber")) frameworks.push("Fiber");
    if (allContentsLower.includes("gin-gonic/gin")) frameworks.push("Gin");

    // Database detection
    if (allContentsLower.includes("supabase")) databases.push("Supabase");
    if (allContentsLower.includes("mongodb") || allContentsLower.includes("mongoose")) databases.push("MongoDB");
    if (allContentsLower.includes("postgres") || allContentsLower.includes("pg") || allContentsLower.includes("psycopg2")) databases.push("PostgreSQL");
    if (allContentsLower.includes("mysql") || allContentsLower.includes("mysql2")) databases.push("MySQL");
    if (allContentsLower.includes("sqlite") || allContentsLower.includes("sqlite3")) databases.push("SQLite");
    if (allContentsLower.includes("redis") || allContentsLower.includes("ioredis")) databases.push("Redis");
    if (allContentsLower.includes("firebase")) databases.push("Firebase Firestore");
    if (allContentsLower.includes("dynamodb") || allContentsLower.includes("aws-sdk/client-dynamodb")) databases.push("DynamoDB");
    if (allContentsLower.includes("prisma")) databases.push("Prisma ORM");
    if (allContentsLower.includes("drizzle")) databases.push("Drizzle ORM");

    // Tool detection
    if (filePathsLower.some(f => f.includes("vite"))) tools.push("Vite");
    if (filePathsLower.some(f => f.includes("docker"))) tools.push("Docker");
    if (filePathsLower.some(f => f.includes("webpack"))) tools.push("Webpack");
    if (filePathsLower.some(f => f.includes("eslint"))) tools.push("ESLint");
    if (filePathsLower.some(f => f.includes("prettier"))) tools.push("Prettier");
    if (filePathsLower.some(f => f.includes("tailwind"))) tools.push("Tailwind CSS");
    if (filePathsLower.some(f => f.includes("github/workflows") || f.includes(".github"))) tools.push("GitHub Actions");
    if (filePathsLower.some(f => f.includes("babel"))) tools.push("Babel");
    if (filePathsLower.some(f => f.includes("poetry.lock") || f.includes("pyproject.toml"))) tools.push("Poetry");

    // Library detection
    if (allContentsLower.includes("framer-motion") || allContentsLower.includes("motion")) libraries.push("Framer Motion");
    if (allContentsLower.includes("lucide")) libraries.push("Lucide Icons");
    if (allContentsLower.includes("axios")) libraries.push("Axios");
    if (allContentsLower.includes("lodash")) libraries.push("Lodash");
    if (allContentsLower.includes("redux")) libraries.push("Redux Toolkit");
    if (allContentsLower.includes("graphql")) libraries.push("GraphQL");
    if (allContentsLower.includes("zustand")) libraries.push("Zustand");
    if (allContentsLower.includes("react-query") || allContentsLower.includes("tanstack/react-query")) libraries.push("TanStack Query");
    if (allContentsLower.includes("d3") || allContentsLower.includes("recharts")) libraries.push("D3.js");
    if (allContentsLower.includes("numpy")) libraries.push("NumPy");
    if (allContentsLower.includes("pandas")) libraries.push("Pandas");
    if (allContentsLower.includes("sklearn") || allContentsLower.includes("scikit-learn")) libraries.push("Scikit-learn");
    if (allContentsLower.includes("torch") || allContentsLower.includes("pytorch")) libraries.push("PyTorch");
    if (allContentsLower.includes("tensorflow")) libraries.push("TensorFlow");
    if (allContentsLower.includes("openai")) libraries.push("OpenAI SDK");
    if (allContentsLower.includes("langchain")) libraries.push("LangChain");

    if (frameworks.length === 0 && (languages.includes("JavaScript") || languages.includes("TypeScript"))) {
      frameworks.push("Node.js");
    }

    return {
      languages,
      frameworks,
      libraries,
      databases,
      tools
    };
  })();

  // Architecture is confident ONLY if the codebase contains multi-tier components (like backend, DB, complex UI flow) and is not a learning/docs/portfolio project
  const nonArchTypes = ["Learning Repository", "Portfolio", "Documentation", "Course Repository", "Research Project", "Data Repository", "Configuration Repository"];
  const isArchitectureConfident = !nonArchTypes.includes(detectedRepoType) && filePathsInRepo.length > 8;

  // ── Programmatic Health Score (modular, graduated scoring) ──
  const computedHealth = computeHealthScore({
    filePathsInRepo,
    filesContext,
    readmeContent,
    repoLanguages,
    repoMeta,
  });
  console.log(`[Health] Programmatic score: ${computedHealth.overall}/${100} (${computedHealth.grade}) — doc:${computedHealth.documentation} arch:${computedHealth.architecture} code:${computedHealth.codeQuality} maint:${computedHealth.maintainability} scale:${computedHealth.scalability}`);

  // Stage 4: Detecting Technologies
  sendSSE(res, { type: "stage", step: 4 });

  // Prepare tailored section guidance based on repository type to enforce high-fidelity summaries
  let dynamicSectionGuidance = "";
  if (detectedRepoType === "Learning Repository" || detectedRepoType === "Course Repository") {
    dynamicSectionGuidance = `
CRITICAL INSIGHT DIRECTIVE: This is a learning/educational repository.
Your "summary" section and "projectOverview" MUST focus heavily on:
1. Topics covered
2. Concepts learned
3. Skill progression
4. Educational value
STRICT PROHIBITION: Do NOT list any scalability metrics, container orchestrations, or enterprise architecture definitions. Keep the focus entirely educational.
For "aiInsights" suggestions, focus on missing exercises, additional code examples, and educational clarity.
`;
  } else if (detectedRepoType === "Library") {
    dynamicSectionGuidance = `
CRITICAL INSIGHT DIRECTIVE: This is a software library / package.
Your "summary" section and "projectOverview" MUST focus heavily on:
1. API design simplicity
2. Reusability and extensibility
3. Documentation quality
4. Modular packaging and exports
For "aiInsights" suggestions, focus on API versioning, coverage, export patterns, and user consumption ergonomics.
`;
  } else if (detectedRepoType === "Web Application") {
    dynamicSectionGuidance = `
CRITICAL INSIGHT DIRECTIVE: This is a full-stack web application.
Your "summary" section and "projectOverview" MUST focus heavily on:
1. Frontend state and views
2. Backend request paths and routing
3. Database layout or storage
4. Deployment pipelines and runtime hosts
For "aiInsights" suggestions, focus on scalability, security checks, state-management optimizations, and host environment configs.
`;
  } else if (detectedRepoType === "Portfolio") {
    dynamicSectionGuidance = `
CRITICAL INSIGHT DIRECTIVE: This is a personal portfolio website.
Your "summary" section and "projectOverview" MUST focus heavily on:
1. Visual presentation & UI layout
2. Projects showcased
3. Responsive design & styling choices
4. Contact integration & static hosting
STRICT PROHIBITION: Do NOT invent databases, complex APIs, or backend queues unless explicitly found. Focus purely on showcase presentation value.
`;
  } else if (detectedRepoType === "AI Project" || detectedRepoType === "Machine Learning") {
    dynamicSectionGuidance = `
CRITICAL INSIGHT DIRECTIVE: This is an AI/ML repository.
Your "summary" section and "projectOverview" MUST focus heavily on:
1. Model pipelines or LLM integration
2. Data preparation or data loading
3. Prompt engineering / fine-tuning / training setup
4. Inference latency & evaluation metrics
`;
  } else {
    dynamicSectionGuidance = `
CRITICAL INSIGHT DIRECTIVE: This repository is categorized as: ${detectedRepoType}.
Tailor all summary paragraphs, overview, strengths, suggestions, and steps to be 100% relevant to a ${detectedRepoType}, focusing strictly on what is programmatically detected in the file list and provided contexts.
`;
  }

  // Compile full-strength analysis prompt
  let contextPrompt = "";
  if (apiSuccess && repoMeta) {
    contextPrompt = `
You are an advanced software architect auditing the public GitHub repository: ${owner}/${repo}.
We retrieved high-resolution repository metadata and structural contents.

COGNITIVE SOURCE CONTEXT:
=========================================
Name: ${owner}/${repo}
Owner: ${owner}
Stars: ${repoMeta.stargazers_count ?? 0}
Forks: ${repoMeta.forks_count ?? 0}
Open Issues: ${repoMeta.open_issues_count ?? 0}
Description: ${repoMeta.description ?? "N/A"}
Size: ${repoMeta.size ?? 0} KB
Pushed At: ${repoMeta.pushed_at ?? "N/A"}
Primary Language: ${repoMeta.language ?? "N/A"}
Languages breakdown from GitHub: ${JSON.stringify(repoLanguages)}
Topics: ${JSON.stringify(repoTopics)}

ACTUAL FILE PATHS FROM REPOSITORY (use these to generate the exact folder tree, do NOT invent folders):
${JSON.stringify(filePathsInRepo.slice(0, 25))}

STRICT PROGRAMMATIC STACK CLUES (DO NOT DEVIATE OR INVENT TECHNOLOGIES BEYOND THESE GROUND TRUTHS):
- Languages: ${JSON.stringify(techMetadata.languages)}
- Frameworks: ${JSON.stringify(techMetadata.frameworks)}
- Databases: ${JSON.stringify(techMetadata.databases)}
- Tools: ${JSON.stringify(techMetadata.tools)}
- Libraries: ${JSON.stringify(techMetadata.libraries)}

EXTRACTED SEED CONTENTS FOR SOURCE CLUES:
${Object.entries(filesContext).map(([name, body]) => `
--- File: ${name} ---
${body.substring(0, 500)}
`).join("\n")}

=========================================

${dynamicSectionGuidance}

Analyze this codebase extensively. Generate a structured, professional architectural report in JSON following this JSON schema:

{
  "name": "The friendly display name of the project",
  "description": "Short 1-sentence tagline description",
  "stars": number,
  "forks": number,
  "openIssues": number,
  "repoType": "Determine the most accurate category based on the actual code and configuration: Web Application, Mobile App, Library, CLI Tool, API Service, AI Project, Machine Learning, Portfolio, Learning Repository, Course Repository, Documentation, Research Project, Data Repository, Configuration Repository, or Software Project.",
  "architectureConfident": "Set to true if you can confidently identify the architecture from the file structure and contents. Set to false if the repo is too small, empty, or lacks clear structure.",
  "summary": {
    "projectOverview": "2-3 SHORT sentences max. What it is, who it's for, and why it matters. No fluff, no paragraphs.",
    "purpose": "1-2 sentences. The core problem this repo solves and why it's useful.",
    "mainFunctionality": ["Bullet point list of major interactive features and functionalities built into the code"]
  },
  "techStack": {
    "languages": ["Only include from the programmatic languages ground truth list: ${techMetadata.languages.join(", ")}"],
    "frameworks": ["Only include from detected frameworks: ${techMetadata.frameworks.join(", ")}"],
    "libraries": ["Only include from detected libraries: ${techMetadata.libraries.join(", ")}"],
    "databases": ["Only include from detected databases: ${techMetadata.databases.join(", ")}"],
    "tools": ["Only include from detected tools: ${techMetadata.tools.join(", ")}"]
  },
  "projectStructure": {
    "tree": "Provide a beautiful ASCII tree showing a professional structure of a typical repository corresponding to this type. E.g. /src, /components, /api, etc.",
    "explanation": "Provide a detailed deep-dive markdown explanation mapping key files and describing the structural pattern."
  },
  "installation": {
    "prerequisites": ["Direct prerequisites like: Node.js >= 18.0.0, Python >= 3.9"],
    "steps": [
      {
        "title": "Title of step",
        "command": "Executable codeblock command",
        "description": "Step detail"
      }
    ]
  },
  "aiInsights": {
    "strengths": ["Clear bullets of design strengths, design patterns, quality choices, etc."],
    "suggestions": ["Clear improvements or optimizations (e.g. security checks, bundle optimization, missing files, or architectural updates)"],
    "architectureExplanation": "A clear breakdown of the architecture, data flows, and component interactions based on what you find in the code."
  },
  "stats": {
    "filesAnalyzed": number (estimated count of total files in the codebase, e.g. 15 to 250),
    "technologiesCount": number (total count of discrete tools, databases, and languages detected, e.g., 3 to 15),
    "estimatedSizeKb": number (size in KB from metadata),
    "complexityScore": "Low" | "Medium" | "High" (the level of technical sophistication)
  },
  "healthScore": number (overall health score 0-100. CRITICAL: You MUST differentiate scores between repositories. A small personal project should score 20-50. A decent open-source project with README and tests should score 50-70. Only mature, well-documented, well-tested, actively maintained projects with CI/CD and comprehensive tooling should score 70-90. Never give the same score to different repos. Base strictly on actual evidence found in the codebase: presence of tests, linting, CI/CD configs, documentation, type safety, dependency management, commit activity.),
  "healthMetrics": {
    "documentation": number (0-100, score LOW if only a basic README exists, MEDIUM if README is detailed with examples, HIGH only if docs directory, JSDoc/typedoc, and inline comments are present),
    "architecture": number (0-100, score LOW for flat single-file projects, MEDIUM for basic folder separation, HIGH only for clear separation of concerns with modular design),
    "codeQuality": number (0-100, score LOW if no linting or tests, MEDIUM if eslint/prettier config exists, HIGH only if tests, linting, type safety, and CI checks are all present),
    "maintainability": number (0-100, score LOW if no lock file or stale dependencies, MEDIUM if lock files and recent commits, HIGH only if active issue management, dependency updates, and changelog),
    "scalability": number (0-100, score LOW if no CI/CD or Docker, MEDIUM if basic CI exists, HIGH only if full CI/CD pipeline, Docker, deployment configs, and modular architecture)
  }
}

Ensure all texts are short, punchy, and written in plain text without any markdown formatting. Do not use **bold**, backticks, or headers. Do not output any conversational prefixes. Return only the JSON.
`;
  } else {
    usedApiFallback = true;
    // Advanced dynamically mapped prediction projection fallback (No generic static React/Express/Supabase!)
    const projectedLanguages = repoNameLower.includes("python") || repoNameLower.includes("django") || repoNameLower.includes("flask") || repoNameLower.includes("ml") || repoNameLower.includes("ai")
      ? ["Python"]
      : (repoNameLower.includes("rust") ? ["Rust"] : ["TypeScript", "JavaScript"]);
      
    const projectedFrameworks = projectedLanguages.includes("Python") 
      ? (repoNameLower.includes("django") ? ["Django"] : (repoNameLower.includes("flask") ? ["Flask"] : ["FastAPI"])) 
      : ["Node.js"];
      
    const projectedDatabases = projectedLanguages.includes("Python") ? ["SQLite"] : ["PostgreSQL"];
    const projectedTools = projectedLanguages.includes("Python") ? ["pip", "Docker"] : ["Vite", "ESLint"];
    const projectedLibraries = projectedLanguages.includes("Python") ? ["NumPy", "Pandas"] : ["Lucide Icons", "Axios"];

    contextPrompt = `
We are performing a highly technical AI-synthesized architectural review for the repository: https://github.com/${owner}/${repo}.
The repository is currently offline, rate-limited, or has typo boundaries.

Since this is a popular repository segment or standard codebase shape, please generate a highly accurate, technical projection of this codebase.
Use the parsed owner: "${owner}" and repo name: "${repo}" to guess the most logical structure and technologies!
Do NOT use default React/Express templates if the name indicates otherwise (e.g., if it is obviously a Python script, a Rust library, dotfiles, or documentation).

Provide the complete analysis in the exact same JSON format:

{
  "name": "${repo}",
  "description": "A professionally modeled open-source ${detectedRepoType}",
  "stars": 34,
  "forks": 5,
  "openIssues": 1,
  "repoType": "Determine the most accurate category based on the actual code and configuration.",
  "architectureConfident": true,
  "summary": {
    "projectOverview": "Analytical projection of ${repo}, detailing the technical capabilities and expected execution flow for a ${detectedRepoType}.",
    "purpose": "A technical assessment of why this codebase structure was built.",
    "mainFunctionality": ["Expected primary function 1", "Expected primary function 2"]
  },
  "techStack": {
    "languages": ${JSON.stringify(projectedLanguages)},
    "frameworks": ${JSON.stringify(projectedFrameworks)},
    "libraries": ${JSON.stringify(projectedLibraries)},
    "databases": ${JSON.stringify(projectedDatabases)},
    "tools": ${JSON.stringify(projectedTools)}
  },
  "projectStructure": {
    "tree": "Project structural projection tree.",
    "explanation": "Expected architectural outline of a standard codebase of this format."
  },
  "installation": {
    "prerequisites": ["Expected language installation environment"],
    "steps": [
      {
        "title": "Set up project",
        "command": "git clone https://github.com/${owner}/${repo}.git",
        "description": "Checkout codebase."
      }
    ]
  },
  "aiInsights": {
    "strengths": ["Expected clean modular design layout"],
    "suggestions": ["Upgrade dependencies and establish proper automation workflows"],
    "architectureExplanation": "A clear breakdown of the architecture, data flows, and component interactions based on what you find in the code."
  },
  "stats": {
    "filesAnalyzed": 14,
    "technologiesCount": 6,
    "estimatedSizeKb": 120,
    "complexityScore": "Medium"
  },
  "healthScore": 50,
  "healthMetrics": {
    "documentation": 50,
    "architecture": 50,
    "codeQuality": 50,
    "maintainability": 50,
    "scalability": 50
  }
}

Return only the JSON.
`;
  }

  try {
    rawAiResult = "";

    // Before making any NVIDIA request, validate:
    if (!process.env.NVIDIA_API_KEY) {
      throw new Error("NVIDIA API key not configured");
    }

    const nvidiaApiKey = process.env.NVIDIA_API_KEY;
    const requestUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
const modelName = "meta/llama-3.1-8b-instruct";
    const MAX_RETRIES = 1;
    const BASE_DELAY_MS = 1000;

    // Signal to client that GitHub data is ready and AI generation is starting
    sendSSE(res, { type: "start" });

    let response: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        if (attempt > 0) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[AI Retry] Attempt ${attempt}/${MAX_RETRIES} after ${delay}ms delay`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log("[Analyze] Calling LLM API" + (attempt > 0 ? ` (attempt ${attempt + 1})` : "") + ` model: ${modelName}`);
        response = await fetch(requestUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nvidiaApiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: "system",
                content: "You are RepoSense AI, an exceptional full-stack developer and system architect. Your goal is to return a strict, valid JSON string following the requested format schema exactly. Be concise — every text field should be short, punchy, and to the point. No fluff, no long paragraphs. Do not add any extra preambles, chat prefixes, or post texts. Write all text fields in plain text only — do not use any markdown formatting such as **bold**, backticks, or headers. CRITICAL: You MUST assign different health scores to different repositories. A repo with only a README and no tests should score ~30-45. A repo with README, basic structure, and some config should score ~45-60. A well-organized repo with tests, linting, CI/CD, docs, and active maintenance should score ~60-80. Only elite, production-grade repos with comprehensive everything should score 80+. Never default to 80."
              },
              {
                role: "user",
                content: contextPrompt
              }
            ],
            temperature: 0.2,
            max_tokens: 4096,
            top_p: 0.9,
            stream: true
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 429 && attempt < MAX_RETRIES) {
          console.warn(`[AI] Rate limited (429), will retry...`);
          continue;
        }

        break; // success or non-retryable error

      } catch (fetchErr: any) {
        clearTimeout(timeoutId);

        if (fetchErr.name === "AbortError" || fetchErr.message?.includes("aborted")) {
          if (attempt < MAX_RETRIES) {
            console.warn(`[AI] Request timed out, will retry...`);
            continue;
          }
          console.warn(`[AI] Model ${modelName} timed out.`);
        } else if (attempt < MAX_RETRIES) {
          console.warn(`[AI] Network error, will retry:`, fetchErr.message);
          continue;
        } else {
          console.warn(`[AI] Model ${modelName} failed:`, fetchErr.message);
        }
        break;
      }
    }

    if (!response || !response.ok) {
      const status = response?.status || 0;
      const errText = response ? await response.text() : "No response from LLM API";
      console.error(`[AI Error] Status: ${status}`);
      console.error(`[AI Error] Response: ${errText}`);

      if (status === 401) {
        sendSSE(res, { type: "error", message: "Invalid API key.", errorType: "Authentication Failed" });
      } else if (status === 403) {
        sendSSE(res, { type: "error", message: "Access Forbidden.", errorType: "Authorization Failed" });
      } else if (status === 429) {
        sendSSE(res, { type: "error", message: "API rate limit exceeded. Please wait and try again.", errorType: "Rate Limit" });
      } else {
        sendSSE(res, { type: "error", message: `API error: status ${status}`, errorType: "AI Error" });
      }
      return res.end();
    }

    console.log(`✓ AI streaming response received (model: ${modelName})`);
    console.log(`[AI Response] Status Code: ${response.status}`);

    // Stream the response and collect full content
    const reader = response.body?.getReader();
    if (!reader) {
      sendSSE(res, { type: "error", message: "Failed to read AI streaming response.", errorType: "Stream Error" });
      return res.end();
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let chunkIndex = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              rawAiResult += delta;
              chunkIndex++;
              sendSSE(res, { type: "chunk", content: delta, chunkIndex });
            }
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (finishReason === "length") {
              console.warn("[AI] Model hit max_tokens limit — response may be truncated.");
            }
          } catch {
            // skip malformed SSE chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log("✓ AI streaming complete");
    console.log(`[AI] Total content length: ${rawAiResult.length} chars`);

    let parsedData;
    try {
      parsedData = extractJson(rawAiResult);
    } catch (parseErr: any) {
      console.error("[AI Parse Error] Failed to parse JSON from model response:", parseErr.message);
      console.error("[AI Raw Response Content]:\n", rawAiResult);
      throw parseErr;
    }
    
    // Strict ground truth interception of tech stack to block hallucinations
    const cleanLanguages = parsedData.techStack?.languages?.filter((l: string) => 
      techMetadata.languages.map(t => t.toLowerCase()).includes(l.toLowerCase())
    ) || techMetadata.languages;

    const cleanFrameworks = parsedData.techStack?.frameworks?.filter((f: string) =>
      techMetadata.frameworks.map(t => t.toLowerCase()).includes(f.toLowerCase())
    ) || techMetadata.frameworks;

    const cleanDatabases = parsedData.techStack?.databases?.filter((d: string) =>
      techMetadata.databases.map(t => t.toLowerCase()).includes(d.toLowerCase())
    ) || techMetadata.databases;

    const cleanTools = parsedData.techStack?.tools?.filter((t: string) =>
      techMetadata.tools.map(x => x.toLowerCase()).includes(t.toLowerCase())
    ) || techMetadata.tools;

    const cleanLibraries = parsedData.techStack?.libraries?.filter((l: string) =>
      techMetadata.libraries.map(x => x.toLowerCase()).includes(l.toLowerCase())
    ) || techMetadata.libraries;

    // Build the final, highly sanitized report payload
    const finalReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      owner,
      repo,
      url,
      name: parsedData.name || repo,
      description: parsedData.description || repoMeta?.description || "A public repository analyzed by RepoSense AI",
      stars: typeof parsedData.stars === "number" ? parsedData.stars : (repoMeta?.stargazers_count ?? 0),
      forks: typeof parsedData.forks === "number" ? parsedData.forks : (repoMeta?.forks_count ?? 0),
      openIssues: typeof parsedData.openIssues === "number" ? parsedData.openIssues : (repoMeta?.open_issues_count ?? 0),
      repoType: parsedData.repoType || "Software Project",
      architectureConfident: parsedData.architectureConfident ?? true,
      healthScore: computedHealth.overall,
      healthGrade: computedHealth.grade,
      healthMetrics: {
        documentation: computedHealth.documentation,
        architecture: computedHealth.architecture,
        codeQuality: computedHealth.codeQuality,
        maintainability: computedHealth.maintainability,
        scalability: computedHealth.scalability
      },
      healthBreakdown: computedHealth.breakdown,
      healthScoreSource: "computed" as const,
      summary: parsedData.summary || {
        projectOverview: parsedData.description || "Project representation.",
        purpose: "Repository audit.",
        mainFunctionality: []
      },
      techStack: {
        languages: cleanLanguages.length > 0 ? cleanLanguages : techMetadata.languages,
        frameworks: cleanFrameworks,
        libraries: cleanLibraries,
        databases: cleanDatabases,
        tools: cleanTools
      },
      projectStructure: parsedData.projectStructure || {
        tree: "/src\n  index.ts",
        explanation: "Repository structure representation."
      },
      installation: parsedData.installation || {
        prerequisites: ["Git Installed"],
        steps: []
      },
      aiInsights: {
        strengths: parsedData.aiInsights?.strengths || ["Clear directory alignment"],
        suggestions: parsedData.aiInsights?.suggestions || ["Incorporate test runners"],
        architectureExplanation: parsedData.aiInsights?.architectureExplanation || "Architecture analysis based on available code structure."
      },
      stats: parsedData.stats || {
        filesAnalyzed: filePathsInRepo.length || 10,
        technologiesCount: techMetadata.languages.length + techMetadata.frameworks.length + techMetadata.databases.length + techMetadata.tools.length + techMetadata.libraries.length,
        estimatedSizeKb: repoMeta?.size ?? 500,
        complexityScore: filePathsInRepo.length > 50 ? "High" : (filePathsInRepo.length > 15 ? "Medium" : "Low")
      },
      analyzedAt: new Date().toISOString()
    };

    console.log("✓ Analysis generated via LLM");

    // Save to Supabase tables on successful analysis (non-blocking - fire and forget)
    if (supabaseAdmin) {
      const reportId = finalReport.id;
      const auditUserId = userId || null;

      // Fire-and-forget: don't await, let it run in background
      Promise.allSettled([
        supabaseAdmin
          .from("repository_analyses")
          .upsert({
            id: reportId,
            user_id: auditUserId,
            repository_url: url,
            repository_name: `${owner}/${repo}`,
            summary: finalReport.summary.projectOverview,
            analysis_result: finalReport,
            created_at: new Date().toISOString()
          }),
        supabaseAdmin
          .from("reposense_reports")
          .upsert({
            id: reportId,
            user_id: auditUserId,
            owner,
            repo,
            url,
            name: finalReport.name,
            description: finalReport.description,
            stars: finalReport.stars,
            forks: finalReport.forks,
            open_issues: finalReport.openIssues,
            summary: finalReport.summary,
            tech_stack: finalReport.techStack,
            project_structure: finalReport.projectStructure,
            installation: finalReport.installation,
            ai_insights: finalReport.aiInsights,
            stats: finalReport.stats,
            analyzed_at: new Date().toISOString()
          })
      ]).then(results => {
        results.forEach((r, i) => {
          if (r.status === "rejected") {
            console.error(`[Supabase] Background save error (table ${i === 0 ? 'repository_analyses' : 'reposense_reports'}):`, r.reason);
          } else {
            console.log(`[Supabase] Background save successful (table ${i === 0 ? 'repository_analyses' : 'reposense_reports'})`);
          }
        });
      }).catch(dbErr => {
        console.error("[Supabase] Background save exception:", dbErr);
      });
    }

    console.log("[Analyze] Returning SSE done event");
    // Cache the result for future requests
    setCachedResult(cacheKey, finalReport);
    sendSSE(res, { type: "done", report: finalReport });
    return res.end();

  } catch (err: any) {
    console.error("[RepoSense] Analysis pipeline error:", err);
    if (err.message === "NVIDIA API key not configured") {
      sendSSE(res, { type: "error", message: "NVIDIA_API_KEY environment variable not found", errorType: "Authentication Failed" });
      return res.end();
    }
    sendSSE(res, { type: "error", message: err.message || "Failed to generate report from repository.", errorType: "Analysis Error" });
    return res.end();
  }
});


// Copilot chat endpoint (SSE streaming)
app.post("/api/copilot", async (req, res) => {
  console.log("[API] Copilot route hit");
  try {
  const { message, history, report } = req.body;

  if (!message || !report) {
    return res.status(400).json({ error: "Message and report context are required." });
  }

  if (!process.env.NVIDIA_API_KEY) {
    return res.status(500).json({ error: "NVIDIA API key not configured." });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  sendSSE(res, { type: "start" });

  // Build the system prompt with full report context
  const reportContext = `
REPOSITORY ANALYSIS CONTEXT:
============================
Name: ${report.name || report.repo}
Owner: ${report.owner}
Repository: ${report.owner}/${report.repo}
URL: ${report.url}
Description: ${report.description || "N/A"}
Stars: ${report.stars ?? 0} | Forks: ${report.forks ?? 0} | Open Issues: ${report.openIssues ?? 0}
Repository Type: ${report.repoType || "Unknown"}
Analyzed At: ${report.analyzedAt || "Unknown"}

SUMMARY:
- Project Overview: ${report.summary?.projectOverview || "N/A"}
- Purpose: ${report.summary?.purpose || "N/A"}
- Main Functionality: ${(report.summary?.mainFunctionality || []).join(", ") || "N/A"}

TECH STACK:
- Languages: ${(report.techStack?.languages || []).join(", ") || "None detected"}
- Frameworks: ${(report.techStack?.frameworks || []).join(", ") || "None detected"}
- Libraries: ${(report.techStack?.libraries || []).join(", ") || "None detected"}
- Databases: ${(report.techStack?.databases || []).join(", ") || "None detected"}
- Tools: ${(report.techStack?.tools || []).join(", ") || "None detected"}

PROJECT STRUCTURE:
${report.projectStructure?.tree || "Not available"}
- Explanation: ${report.projectStructure?.explanation || "N/A"}

INSTALLATION:
- Prerequisites: ${(report.installation?.prerequisites || []).join(", ") || "N/A"}
- Steps: ${(report.installation?.steps || []).map((s: any) => `${s.title}: ${s.command || s.description}`).join("; ") || "N/A"}

AI INSIGHTS:
- Strengths: ${(report.aiInsights?.strengths || []).join("; ") || "None identified"}
- Suggestions: ${(report.aiInsights?.suggestions || []).join("; ") || "None provided"}
- Architecture: ${report.aiInsights?.architectureExplanation || "N/A"}

HEALTH METRICS (0-100):
- Documentation: ${report.healthMetrics?.documentation ?? "N/A"}
- Architecture: ${report.healthMetrics?.architecture ?? "N/A"}
- Code Quality: ${report.healthMetrics?.codeQuality ?? "N/A"}
- Maintainability: ${report.healthMetrics?.maintainability ?? "N/A"}
- Scalability: ${report.healthMetrics?.scalability ?? "N/A"}
- Overall Health Score: ${report.healthScore ?? "N/A"}

STATS:
- Files Analyzed: ${report.stats?.filesAnalyzed ?? "N/A"}
- Technologies Count: ${report.stats?.technologiesCount ?? "N/A"}
- Estimated Size: ${report.stats?.estimatedSizeKb ?? "N/A"} KB
- Complexity Score: ${report.stats?.complexityScore || "N/A"}
`;

  const systemMessage = {
    role: "system",
    content: `You are RepoSense Copilot, a knowledgeable AI assistant specialized in analyzing and explaining software repositories. You have full context about the repository the user is asking about.

RULES:
1. Answer ONLY based on the repository context provided above.
2. Be concise and direct — no fluff, no unnecessary greetings.
3. If a question is about something not covered in the context, say so clearly.
4. Use plain text formatting. Do not use markdown headers. You may use bold for emphasis if needed.
5. Keep answers focused and helpful for a developer trying to understand this codebase.

${reportContext}`
  };

  // Build message array with history
  const messages = [systemMessage];
  if (Array.isArray(history)) {
    for (const msg of history) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }
  messages.push({ role: "user", content: message });

  const nvidiaApiKey = process.env.NVIDIA_API_KEY;
  const requestUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
  const modelName = "meta/llama-3.1-8b-instruct";
  const MAX_RETRIES = 1;
  const BASE_DELAY_MS = 1000;

  let response: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      if (attempt > 0) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[Copilot AI Retry] Attempt ${attempt + 1}/${MAX_RETRIES + 1} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log(`[Copilot] Calling LLM model: ${modelName}`);
      response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nvidiaApiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature: 0.4,
          max_tokens: 1024,
          top_p: 0.9,
          stream: true
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 429 && attempt < MAX_RETRIES) {
        console.warn("[Copilot AI] Rate limited (429), retrying...");
        continue;
      }

      break;
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if ((fetchErr.name === "AbortError" || fetchErr.message?.includes("aborted")) && attempt < MAX_RETRIES) {
        console.warn("[Copilot AI] Request timed out, retrying...");
        continue;
      } else if (attempt < MAX_RETRIES) {
        console.warn("[Copilot AI] Network error, retrying:", fetchErr.message);
        continue;
      } else {
        console.warn("[Copilot AI] Failed:", fetchErr.message);
      }
      break;
    }
  }

  if (!response || !response.ok) {
    const status = response?.status || 0;
    console.error(`[Copilot AI Error] Status: ${status}`);

    if (status === 429) {
      sendSSE(res, { type: "error", message: "Too many requests. Please wait a moment." });
    } else {
      sendSSE(res, { type: "error", message: `AI error: status ${status}` });
    }
    return res.end();
  }

  console.log(`[Copilot] AI streaming response received (model: ${modelName})`);

  const reader = response.body?.getReader();
  if (!reader) {
    sendSSE(res, { type: "error", message: "Failed to read AI response." });
    return res.end();
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let chunkIndex = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            chunkIndex++;
            sendSSE(res, { type: "chunk", content: delta, chunkIndex });
          }
        } catch {
          // skip malformed SSE chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  console.log("[Copilot] Streaming complete");
  sendSSE(res, { type: "done" });
  return res.end();
  } catch (err: any) {
    console.error("[Copilot] Endpoint error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
    try { sendSSE(res, { type: "error", message: err.message || "Server error" }); } catch {}
    return res.end();
  }
});


// Catch-all route handler for all unhandled /api/* endpoints to ensure they never return HTML
app.all("/api/*", (req, res) => {
  console.warn(`[API Route Missing] Method: ${req.method} Path: ${req.url}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});


// Configure Vite or Static Asset delivery
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Static production build directories
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RepoSense Server] listening on http://0.0.0.0:${PORT}`);
  });
}

// Only start the server when running directly (not on Vercel)
if (!process.env.VERCEL) {
  startServer().catch((startupErr: any) => {
    console.error("=== BACKEND STARTUP EXCEPTION ===");
    console.error(startupErr.stack || startupErr.message || startupErr);
  });
}

export default app;

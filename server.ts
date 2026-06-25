import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ override: true });

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

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
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



// REST route for code/repo analysis
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
  let filePathsInRepo: string[] = [];
  let recentCommits: any[] = [];

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

    // 2. Fetch Languages Used
    try {
      const langRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers });
      if (langRes.ok) {
        repoLanguages = await langRes.json();
        console.log("✓ Languages fetched:", Object.keys(repoLanguages));
      }
    } catch (langErr) {
      console.warn("Failed to retrieve language statistics:", langErr);
    }

    // 3. Fetch Recent Commits (for maintenance & statistics)
    try {
      const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers });
      if (commitsRes.ok) {
        recentCommits = await commitsRes.json();
        console.log(`✓ Fetched recent commits: ${recentCommits.length}`);
      }
    } catch (commitsErr) {
      console.warn("Failed to fetch commits:", commitsErr);
    }

    // 4. Fetch Recursive Git Tree to get complete file map
    let gitTree: any[] = [];
    try {
      const branch = repoMeta.default_branch || "main";
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        if (treeData && Array.isArray(treeData.tree)) {
          gitTree = treeData.tree;
          filePathsInRepo = gitTree.map((node: any) => node.path);
          console.log(`✓ Git tree fetched recursively. Total nodes: ${gitTree.length}`);
        }
      }
    } catch (treeErr) {
      console.warn("Failed to fetch recursive git tree:", treeErr);
    }

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

    await Promise.all(
      filesToFetch.map(async (fileInfo) => {
        try {
          const branch = repoMeta?.default_branch || "main";
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fileInfo.path}`;
          const rawRes = await fetch(rawUrl, { headers });
          if (rawRes.ok) {
            const text = await rawRes.text();
            filesContext[fileInfo.name] = text.substring(0, 5000);
            if (fileInfo.name.toLowerCase() === "readme.md") {
              readmeContent = text;
            }
          }
        } catch (err) {
          console.error(`Error downloading raw file ${fileInfo.path}:`, err);
        }
      })
    );

    // Dynamic recovery for readme if not fetched yet
    if (!readmeContent) {
      try {
        const rawReadmeRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`
        );
        if (rawReadmeRes.ok) {
          readmeContent = await rawReadmeRes.text();
          filesContext["README.md"] = readmeContent.substring(0, 5000);
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

  if (isLearningKeyword(repoNameLower) || isLearningKeyword(repoDescLower) || repoTopics.some(t => isLearningKeyword(t))) {
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
      
    if (isAiKeyword(repoNameLower) || isAiKeyword(repoDescLower) || isAiKeyword(allFilesContextStr) || repoTopics.some(t => isAiKeyword(t))) {
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

  // Calculate dynamic, programmatic health scores based on real repository contents
  const scoreResults = (() => {
    const readmeText = readmeContent || "";
    const filePathsLower = filePathsInRepo.map(f => f.toLowerCase());
    
    // 1. Documentation Score (Max 100)
    let docPoints = 0;
    if (readmeText.trim().length > 0) docPoints += 40;
    if (readmeText.trim().length > 1000) docPoints += 20;
    if (readmeText.trim().length > 4000) docPoints += 20;
    
    const hasLicense = filePathsLower.some(f => f.includes("license") || f.includes("copying"));
    const hasContributing = filePathsLower.some(f => f.includes("contributing"));
    const hasDocsDir = filePathsLower.some(f => f.includes("docs/") || f.includes("doc/") || f === "docs" || f === "doc");
    
    if (hasLicense) docPoints += 10;
    if (hasContributing) docPoints += 5;
    if (hasDocsDir) docPoints += 5;
    const documentation = Math.min(100, Math.max(25, docPoints));

    // 2. Architecture & Project Structure Score (Max 100)
    let archPoints = 30;
    const hasCodeDir = filePathsLower.some(f => f.startsWith("src/") || f.startsWith("lib/") || f.startsWith("app/") || f.startsWith("components/") || f.startsWith("api/"));
    const hasConfigs = filePathsLower.some(f => f.endsWith(".json") || f.endsWith(".toml") || f.endsWith(".yaml") || f.endsWith(".config.js") || f.endsWith(".config.ts"));
    if (hasCodeDir) archPoints += 40;
    if (hasConfigs) archPoints += 15;
    if (filePathsInRepo.length > 10) archPoints += 10;
    if (filePathsInRepo.length > 30) archPoints += 5;
    const architecture = Math.min(100, Math.max(30, archPoints));

    // 3. Code Quality & Testing Score (Max 100)
    let qualityPoints = 30;
    const hasTests = filePathsLower.some(f => f.includes("test") || f.includes("spec") || f.includes("__tests__") || f.includes("jest.config") || f.includes("vitest.config") || f.includes("pytest"));
    const hasLint = filePathsLower.some(f => f.includes("eslint") || f.includes("prettier") || f.includes("tsconfig.json") || f.includes("pylint") || f.includes("rustfmt"));
    if (hasTests) qualityPoints += 45;
    if (hasLint) qualityPoints += 25;
    const codeQuality = Math.min(100, Math.max(30, qualityPoints));

    // 4. Maintainability & Recent Activity Score (Max 100)
    let maintPoints = 40;
    if (repoMeta?.pushed_at) {
      const lastPush = new Date(repoMeta.pushed_at);
      const diffDays = (Date.now() - lastPush.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 14) maintPoints += 30;
      else if (diffDays < 30) maintPoints += 25;
      else if (diffDays < 90) maintPoints += 15;
      else if (diffDays < 180) maintPoints += 5;
    } else {
      maintPoints += 10;
    }
    
    const hasLock = filePathsLower.some(f => f.includes("lock") || f.endsWith(".sum") || f.endsWith(".lock"));
    if (hasLock) maintPoints += 15;
    
    const openIssues = repoMeta?.open_issues_count ?? 0;
    const stars = repoMeta?.stargazers_count ?? 0;
    if (openIssues === 0) maintPoints += 15;
    else if (openIssues < 5) maintPoints += 12;
    else if (openIssues < stars * 0.1) maintPoints += 10;
    else maintPoints += 5;
    
    const maintainability = Math.min(100, Math.max(30, maintPoints));

    // 5. Scalability Score (Max 100)
    let scalePoints = 30;
    if (repoMeta?.size && repoMeta.size > 3000) scalePoints += 15;
    if (filePathsInRepo.length > 25) scalePoints += 15;
    
    const hasDevOps = filePathsLower.some(f => f.includes("docker") || f.includes("github/workflows") || f.includes("kubernetes") || f.includes("gitlab-ci") || f.includes("travis.yml") || f.includes("circleci"));
    if (hasDevOps) scalePoints += 40;
    const scalability = Math.min(100, Math.max(30, scalePoints));

    const healthScore = Math.round(
      documentation * 0.25 +
      architecture * 0.20 +
      codeQuality * 0.20 +
      maintainability * 0.20 +
      scalability * 0.15
    );

    return {
      healthScore,
      healthMetrics: {
        documentation,
        architecture,
        codeQuality,
        maintainability,
        scalability
      }
    };
  })();

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
${JSON.stringify(filePathsInRepo.slice(0, 40))}

STRICT PROGRAMMATIC STACK CLUES (DO NOT DEVIATE OR INVENT TECHNOLOGIES BEYOND THESE GROUND TRUTHS):
- Languages: ${JSON.stringify(techMetadata.languages)}
- Frameworks: ${JSON.stringify(techMetadata.frameworks)}
- Databases: ${JSON.stringify(techMetadata.databases)}
- Tools: ${JSON.stringify(techMetadata.tools)}
- Libraries: ${JSON.stringify(techMetadata.libraries)}

EXTRACTED SEED CONTENTS FOR SOURCE CLUES:
${Object.entries(filesContext).map(([name, body]) => `
--- File: ${name} ---
${body.substring(0, 3000)}
`).join("\n")}

=========================================

${dynamicSectionGuidance}

STRICT ARCHITECTURE EVIDENCE VERIFICATION:
The computed architecture confidence for this repository is: ${isArchitectureConfident}.
- Since isArchitectureConfident is ${isArchitectureConfident}:
  - Set "architectureConfident" inside the JSON to exactly: ${isArchitectureConfident}.
  - If isArchitectureConfident is false: You MUST set "architectureExplanation" inside "aiInsights" to EXACTLY: "Architecture information not confidently detected." Do not invent any React, Express, Supabase, or AI pipelines.
  - If isArchitectureConfident is true: Provide an excellent "architectureExplanation" detailing actual data flows between the detected layers in the files.

Analyze this codebase extensively. Generate a structured, professional architectural report in JSON following this JSON schema:

{
  "name": "The friendly display name of the project",
  "description": "Short 1-sentence tagline description",
  "stars": number,
  "forks": number,
  "openIssues": number,
  "repoType": "${detectedRepoType}",
  "architectureConfident": ${isArchitectureConfident},
  "summary": {
    "projectOverview": "Detailed, highly thorough 2-3 paragraph markdown-formatted overview explaining the repository, its value proposition, who it is for, and how it delivers value, fully adapted to the ${detectedRepoType} requirements.",
    "purpose": "A concise explanation of the core technical challenge this code addresses.",
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
    "architectureExplanation": "If 'architectureConfident' is true, write a detailed breakdown. If 'architectureConfident' is false, write EXACTLY: 'Architecture information not confidently detected.'"
  },
  "stats": {
    "filesAnalyzed": number (estimated count of total files in the codebase, e.g. 15 to 250),
    "technologiesCount": number (total count of discrete tools, databases, and languages detected, e.g., 3 to 15),
    "estimatedSizeKb": number (size in KB from metadata),
    "complexityScore": "Low" | "Medium" | "High" (the level of technical sophistication)
  }
}

Ensure all texts, titles, steps, and overview values are beautifully styled in Markdown with rich typography spacing! Do not output any conversational prefixes. Return only the JSON.
`;
  } else {
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
  "repoType": "${detectedRepoType}",
  "architectureConfident": ${isArchitectureConfident},
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
    "architectureExplanation": "If 'architectureConfident' is true, write a detailed breakdown. If 'architectureConfident' is false, write EXACTLY: 'Architecture information not confidently detected.'"
  },
  "stats": {
    "filesAnalyzed": 14,
    "technologiesCount": 6,
    "estimatedSizeKb": 120,
    "complexityScore": "Medium"
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
    const modelName = "deepseek-ai/deepseek-v4-flash";

    console.log(`Using model: ${modelName}`);
    console.log(`[NVIDIA Request] Request URL: ${requestUrl}`);
    console.log(`[NVIDIA Request] Model Name: ${modelName}`);
    console.log("✓ NVIDIA request sent");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    let response;
    try {
      console.log("[Analyze] Calling NVIDIA API");
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
              content: "You are RepoSense AI, an exceptional full-stack developer and system architect. Your goal is to return a strict, valid JSON string following the requested format schema exactly. Do not add any extra preambles, chat prefixes, or post texts. Markdown rendering inside JSON properties is fully supported."
            },
            {
              role: "user",
              content: contextPrompt
            }
          ],
          temperature: 0.2,
          max_tokens: 2800
        }),
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === "AbortError" || fetchErr.message?.includes("aborted")) {
        return res.status(504).json({
          error: "NVIDIA API request timed out.",
          details: "The NVIDIA Foundation AI Engine did not respond within the 90-second window."
        });
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log("✓ NVIDIA response received");
    console.log(`[NVIDIA Response] Status Code: ${response.status}`);

    if (!response.ok) {
      const errText = await response.text();

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      console.error("[NVIDIA Error Log]");
      console.error(`Status Code: ${response.status}`);
      console.error(`Headers:`, responseHeaders);
      console.error(`Response Body: ${errText}`);
      console.error(`Model Name: ${modelName}`);
      console.error(`Endpoint URL: ${requestUrl}`);

      if (response.status === 401) {
        console.error("[NVIDIA Error] Unauthorized (401): Invalid API key provided.");
        return res.status(401).json({
          success: false,
          error: "Invalid NVIDIA API key.",
          errorType: "NVIDIA Authentication Failed",
          details: "The configured NVIDIA_API_KEY is unauthorized or invalid. Please verify your credentials."
        });
      }

      if (response.status === 403) {
        console.error("[NVIDIA Error] Forbidden (403): Access is blocked or unauthorized.");
        return res.status(403).json({
          success: false,
          error: "NVIDIA Access Forbidden.",
          errorType: "NVIDIA Authorization Failed",
          details: "The configured NVIDIA_API_KEY does not have permissions or access was forbidden."
        });
      }

      if (response.status === 404) {
        console.error(`[NVIDIA Error] Not Found (404): The requested model '${modelName}' is not available.`);
        return res.status(404).json({
          success: false,
          error: "Model not available.",
          errorType: "NVIDIA Model Unavailable",
          details: `The requested model '${modelName}' was not found or is not currently available at this endpoint.`
        });
      }

      if (response.status === 429) {
        console.error("[NVIDIA Error] Too Many Requests (429): NVIDIA API rate limit exceeded.");
        return res.status(429).json({
          error: "NVIDIA API rate limit exceeded.",
          details: "The NVIDIA API rate limit has been reached. Please wait a moment and try again."
        });
      }

      return res.status(response.status).json({
        error: `NVIDIA API error: received status code ${response.status}`,
        details: errText || response.statusText
      });
    }

    const payload: any = await response.json();
    rawAiResult = payload.choices?.[0]?.message?.content || "";

    let parsedData;
    try {
      parsedData = extractJson(rawAiResult);
    } catch (parseErr: any) {
      console.error("[NVIDIA Parse Error] Failed to parse JSON from model response:", parseErr.message);
      console.error("[NVIDIA Raw Response Content]:\n", rawAiResult);
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
      repoType: parsedData.repoType || detectedRepoType,
      architectureConfident: parsedData.architectureConfident !== undefined ? parsedData.architectureConfident : isArchitectureConfident,
      healthScore: scoreResults.healthScore,
      healthMetrics: scoreResults.healthMetrics,
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
        architectureExplanation: (parsedData.architectureConfident === false || isArchitectureConfident === false || parsedData.aiInsights?.architectureExplanation?.includes("not confidently detected"))
          ? "Architecture information not confidently detected."
          : (parsedData.aiInsights?.architectureExplanation || "Single SPA standard codebase.")
      },
      stats: parsedData.stats || {
        filesAnalyzed: filePathsInRepo.length || 10,
        technologiesCount: techMetadata.languages.length + techMetadata.frameworks.length + techMetadata.databases.length + techMetadata.tools.length + techMetadata.libraries.length,
        estimatedSizeKb: repoMeta?.size ?? 500,
        complexityScore: filePathsInRepo.length > 50 ? "High" : (filePathsInRepo.length > 15 ? "Medium" : "Low")
      },
      analyzedAt: new Date().toISOString()
    };

    console.log("✓ Analysis generated via NVIDIA Foundation AI");

    // Save to Supabase tables on successful analysis
    if (supabaseAdmin) {
      try {
        const reportId = finalReport.id;
        const auditUserId = userId || null;

        // 1. Save to standard repository_analyses requested field schema
        const { error: analysesErr } = await supabaseAdmin
          .from("repository_analyses")
          .upsert({
            id: reportId,
            user_id: auditUserId,
            repository_url: url,
            repository_name: `${owner}/${repo}`,
            summary: finalReport.summary.projectOverview,
            analysis_result: finalReport,
            created_at: new Date().toISOString()
          });

        if (analysesErr) {
          console.error("[Supabase Admin] Insertion error into `repository_analyses`:", analysesErr);
        } else {
          console.log("[Supabase Admin] Successfully saved report in `repository_analyses` table.");
        }

        // 2. Save to secondary reposense_reports for seamless dual compatible lookup
        await supabaseAdmin
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
          });
          
      } catch (dbErr) {
        console.error("[Supabase Admin] Exception while backing up to Cloud DB:", dbErr);
      }
    }

    console.log("[Analyze] Returning JSON response");
    return res.json(finalReport);

  } catch (err: any) {
    console.error("[RepoSense] Analysis pipeline error:", err);
    if (err.message === "NVIDIA API key not configured") {
      return res.status(500).json({
        error: "NVIDIA_API_KEY environment variable not found",
        errorType: "NVIDIA Authentication Failed",
        details: "NVIDIA API key not configured"
      });
    }
    return res.status(500).json({
      error: "Failed to generate report from repository.",
      details: err.message || err,
      rawAiResult: rawAiResult || undefined
    });
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
    // Vite middleware for Dev Server
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

try {
  startServer();
} catch (startupErr: any) {
  console.error("=== BACKEND STARTUP EXCEPTION ===");
  console.error(startupErr.stack || startupErr.message || startupErr);
}

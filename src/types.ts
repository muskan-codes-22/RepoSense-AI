export interface Summary {
  projectOverview: string;
  purpose: string;
  mainFunctionality: string[];
}

export interface TechStack {
  languages: string[];
  frameworks: string[];
  libraries: string[];
  databases: string[];
  tools: string[];
}

export interface ProjectStructure {
  tree: string;
  explanation: string;
}

export interface InstallationStep {
  title: string;
  command: string;
  description: string;
}

export interface Installation {
  prerequisites: string[];
  steps: InstallationStep[];
}

export interface AiInsights {
  strengths: string[];
  suggestions: string[];
  architectureExplanation: string;
}

export interface Stats {
  filesAnalyzed: number;
  technologiesCount: number;
  estimatedSizeKb: number;
  complexityScore: string;
}

export interface HealthMetrics {
  documentation: number;
  architecture: number;
  codeQuality: number;
  maintainability: number;
  scalability: number;
}


export interface AnalysisReport {
  id: string;
  owner: string;
  repo: string;
  url: string;
  name: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  summary: Summary;
  techStack: TechStack;
  projectStructure: ProjectStructure;
  installation: Installation;
  aiInsights: AiInsights;
  stats: Stats;
  analyzedAt: string;
  healthScore?: number;
  healthMetrics?: HealthMetrics;
  healthScoreSource?: "ai" | "fallback_parse" | "fallback_api" | "computed";
  repoType?: string;
  architectureConfident?: boolean;
}


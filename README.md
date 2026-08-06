<div align="center">

# RepoSense AI

An AI-powered tool that analyzes GitHub repositories and provides comprehensive insights into code quality, architecture, and development patterns.

</div>

## Overview

RepoSense AI is a web application that leverages AI to analyze GitHub repositories. It helps developers understand codebases by providing detailed reports on:

- **Code Quality** - Analysis of code structure, naming conventions, and best practices
- **Architecture Patterns** - Identification of design patterns and architectural decisions
- **Development Activity** - Insights into commit history, contributor patterns, and project health
- **Dependencies** - Review of package dependencies and their security implications
- **Documentation** - Assessment of code documentation and README quality

## Tech Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Express.js
- **AI Integration**: NVIDIA NIM API (Mistral)
- **Database**: Supabase (optional)
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/muskan-codes-22/RepoSense-AI.git
   cd RepoSense-AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example env file and fill in your keys:
   ```bash
   cp .env.example .env
   ```

   At minimum, you need an NVIDIA API key:
   ```env
   NVIDIA_API_KEY=your_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:3000`

## Usage

1. Enter a GitHub repository URL in the input field
2. Click "Analyze Repository"
3. Wait for the AI to process the repository
4. Review the comprehensive analysis report

## Project Structure

```
RepoSense-AI/
├── src/
│   ├── components/     # React components
│   ├── lib/            # Utilities (Supabase client, etc.)
│   └── App.tsx         # Main application
├── health/             # Modular health scoring system
│   ├── index.ts        # Orchestrator
│   ├── documentation.ts
│   ├── architecture.ts
│   ├── codeQuality.ts
│   ├── maintainability.ts
│   ├── scalability.ts
│   ├── githubSignals.ts
│   ├── config.ts       # Weights & thresholds
│   └── types.ts        # Interfaces
├── public/             # Static assets
├── server.ts           # Express backend with AI analysis
├── .env.example        # Environment variable template
└── package.json        # Dependencies and scripts
```

## Health Score

Every analyzed repository receives a **Repository Health Score** (0–100) with a letter grade (A–F). The score is a deterministic, weighted average of 5 categories:

| Category | Weight | What it measures |
|---|---|---|
| Documentation | 20% | README quality, docs dir, inline docstrings, changelog |
| Architecture | 20% | Directory structure, module separation, nesting depth |
| Code Quality | 25% | Linter, formatter, type checker, test ratio, coverage |
| Maintainability | 20% | Dependencies, license, CI, activity recency, community |
| Scalability | 15% | Docker, CI/CD, deployment config, modularity |

See [`docs/HEALTH_SCORE.md`](docs/HEALTH_SCORE.md) for the full scoring breakdown, configuration options, and API reference.

## Available Scripts

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run lint` - Type-check with TypeScript

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NVIDIA_API_KEY` | NVIDIA NIM API key for AI analysis | Yes |
| `GITHUB_TOKEN` | GitHub PAT to avoid API rate limits | No |
| `SUPABASE_URL` | Supabase project URL for persistent history | No |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | No |
| `VITE_SUPABASE_URL` | Same as SUPABASE_URL (exposed to frontend) | No |
| `VITE_SUPABASE_ANON_KEY` | Same as SUPABASE_ANON_KEY (exposed to frontend) | No |

The app works fully without Supabase — it falls back to local-only state.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

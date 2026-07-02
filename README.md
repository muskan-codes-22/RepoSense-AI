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
- **AI Integration**: Google Gemini API
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Google Gemini API Key** - Get one from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/reposense-ai.git
   cd reposense-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:5173`

## Usage

1. Enter a GitHub repository URL in the input field
2. Click "Analyze Repository"
3. Wait for the AI to process the repository
4. Review the comprehensive analysis report

## Project Structure

```
reposense-ai/
├── src/
│   ├── components/     # React components
│   ├── services/       # API and AI services
│   ├── utils/          # Helper functions
│   └── App.tsx         # Main application
├── public/             # Static assets
├── .env.local          # Environment variables (not committed)
└── package.json        # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with React and TypeScript
- Powered by Google Gemini AI
- Styled with Tailwind CSS

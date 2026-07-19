import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Terminal, 
  Search, 
  Github, 
  ArrowRight, 
  Cpu, 
  Code2, 
  Zap, 
  Sparkles, 
  FileCode, 
  ShieldCheck, 
  Clock,
  Layers,
  Flame,
  Star,
  GitFork,
  AlertCircle,
  MessageSquare,
  MousePointer,
  Check,
  CheckCircle2,
  Activity,
  BookOpen
} from "lucide-react";
import AboutSection from "./AboutSection";

interface LandingPageProps {
  onGetStarted: (initialUrl?: string) => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [mockupPhase, setMockupPhase] = useState(0); // 0: Input/Typing, 1: Loading, 2: Showing Results
  const [typingText, setTypingText] = useState("");
  const targetUrl = "https://github.com/facebook/react";

  // Sticky Scroll story state
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [activeStoryStep, setActiveStoryStep] = useState(0); // 0, 1, 2, 3, 4
  const [isDarkHeader, setIsDarkHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const elementHeight = rect.height;
      const viewportHeight = window.innerHeight;

      // Track active header state: dark header when over "How It Works" OR "About" dark sections
      const isWithinHowItWorks = rect.top <= 64 && rect.bottom >= 64;
      const aboutEl = document.getElementById("about");
      let isWithinAbout = false;
      if (aboutEl) {
        const aboutRect = aboutEl.getBoundingClientRect();
        isWithinAbout = aboutRect.top <= 64 && aboutRect.bottom >= 64;
      }
      setIsDarkHeader(isWithinHowItWorks || isWithinAbout);

      // Distance from top of element to top of viewport
      const scrolled = -rect.top;
      const maxScrollable = elementHeight - viewportHeight;

      if (maxScrollable <= 0) return;

      let pct = scrolled / maxScrollable;
      pct = Math.max(0, Math.min(1, pct));

      // Direct DOM style update for the scrolling timeline bar to bypass React reconciliation lag
      if (lineRef.current) {
        lineRef.current.style.height = `${pct * 100}%`;
      }

      // Divide 100% of scroll into 5 states:
      // Index 0: Step 1 (Paste URL)
      // Index 1: Step 2 (AI Processing)
      // Index 2: Step 3 (Breakdown)
      // Index 3: Step 4 (Ask Questions)
      // Index 4: Done success banner
      let calculatedStep = 0;
      if (pct > 0.85) {
        calculatedStep = 4;
      } else if (pct > 0.60) {
        calculatedStep = 3;
      } else if (pct > 0.35) {
        calculatedStep = 2;
      } else if (pct > 0.12) {
        calculatedStep = 1;
      } else {
        calculatedStep = 0;
      }

      setActiveStoryStep((prev) => {
        if (prev !== calculatedStep) return calculatedStep;
        return prev;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    handleScroll(); // Trigger initial calculation

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // Handler to jump to a specific step
  const scrollToStep = (stepIdx: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const elementTop = rect.top + scrollTop;
    const elementHeight = rect.height;
    const viewportHeight = window.innerHeight;
    const maxScrollable = elementHeight - viewportHeight;

    // Calculate target scroll position
    let targetPct = 0;
    if (stepIdx === 0) targetPct = 0.05;
    else if (stepIdx === 1) targetPct = 0.23;
    else if (stepIdx === 2) targetPct = 0.48;
    else if (stepIdx === 3) targetPct = 0.73;
    else if (stepIdx === 4) targetPct = 0.95;

    const targetScrollY = elementTop + (maxScrollable * targetPct);
    window.scrollTo({
      top: targetScrollY,
      behavior: "smooth"
    });
  };

  // Helper dynamically calculating stacking style of mockscreens relative to active scroll storytelling milestones
  const getScreenVariants = (idx: number, current: number) => {
    if (idx === current) {
      return {
        y: 0,
        scale: 1,
        opacity: 1,
        zIndex: 20 + idx,
        pointerEvents: "auto" as const,
      };
    } else if (idx < current) {
      const diff = current - idx;
      return {
        y: -18 * diff,
        scale: Math.max(0.75, 1 - 0.05 * diff),
        opacity: Math.max(0.15, 1 - 0.3 * diff),
        zIndex: 10 + idx,
        pointerEvents: "none" as const,
      };
    } else {
      return {
        y: "115%",
        scale: 0.95,
        opacity: 0,
        zIndex: 5,
        pointerEvents: "none" as const,
      };
    }
  };

  // Mockup automation loop
  useEffect(() => {
    let textTimer: any;
    let phaseTimer: any;

    if (mockupPhase === 0) {
      setTypingText("");
      let currentIndex = 0;
      textTimer = setInterval(() => {
        if (currentIndex < targetUrl.length) {
          setTypingText((prev) => prev + targetUrl[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(textTimer);
          // Auto transition to loading phase after typing completes
          phaseTimer = setTimeout(() => {
            setMockupPhase(1);
          }, 1500);
        }
      }, 70);
    } else if (mockupPhase === 1) {
      // Transition to results phase after a brief loading mock
      phaseTimer = setTimeout(() => {
        setMockupPhase(2);
      }, 4000);
    } else if (mockupPhase === 2) {
      // Cycle back to beginning after showing results for a while
      phaseTimer = setTimeout(() => {
        setMockupPhase(0);
      }, 6000);
    }

    return () => {
      clearInterval(textTimer);
      clearTimeout(phaseTimer);
    };
  }, [mockupPhase]);

  // Features list
  const features = [
    {
      icon: Cpu,
      title: "Deep AI Audit",
      desc: "AI-powered analysis that understands repository purpose, architecture, and design patterns."
    },
    {
      icon: Code2,
      title: "Interactive Tech Stack",
      desc: "Automated detection of frameworks, libraries, databases, and dev tools from file structures."
    },
    {
      icon: Layers,
      title: "Project Mapping",
      desc: "Visual directory trees generated from real repository structure with architecture explanations."
    },
    {
      icon: Zap,
      title: "Instant Setup Guides",
      desc: "Setup instructions and prerequisites inferred from config files like package.json and requirements.txt."
    },
    {
      icon: Flame,
      title: "AI Optimization Suggestions",
      desc: "AI-generated recommendations for architecture improvements and best practices."
    },
    {
      icon: ShieldCheck,
      title: "Real GitHub Synchronization",
      desc: "Live data from the GitHub API including stars, forks, languages, and file contents."
    }
  ];

  const steps = [
    { num: "01", name: "Paste URL", desc: "Input any public GitHub repository address." },
    { num: "02", name: "AI Extraction", desc: "We parse metadata, file structures, and documentation." },
    { num: "03", name: "Deploy Report", desc: "Receive immediate insights, file trees, and architecture maps." }
  ];

  return (
    <div id="landing-container" className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans relative overflow-x-clip">
      
      {/* BACKGROUND GRAPHICS (Subtle floating glowing points) */}
      <div className="absolute top-[10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-purple-300/10 blur-[120px] animate-float-slow pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-300/15 blur-[150px] animate-float-slower pointer-events-none" />

      {/* HEADER NAVBAR */}
      <header 
        id="landing-navbar" 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isDarkHeader 
            ? "glass-dark border-b border-slate-800 text-white shadow-lg shadow-purple-950/25" 
            : "glass border-b border-slate-200/80 text-slate-900"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3 -ml-4 sm:-ml-6 lg:-ml-8">
            <img src="/logo.svg" alt="RepoSense AI" className="w-8 h-8 rounded-xl shadow-sm" />
            <span className="font-extrabold text-3xl tracking-tight bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] bg-clip-text text-transparent font-display">
              REPOSENSE AI
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a href="#features" className={`text-sm font-medium transition-colors ${isDarkHeader ? "text-slate-300 hover:text-[#7C3AED]" : "text-slate-600 hover:text-[#6D28D9]"}`}>Features</a>
            <a href="#how-it-works" className={`text-sm font-medium transition-colors ${isDarkHeader ? "text-white hover:text-[#7C3AED]" : "text-slate-600 hover:text-[#6D28D9]"}`}>How It Works</a>
            <a href="#about" className={`text-sm font-medium transition-colors ${isDarkHeader ? "text-slate-300 hover:text-[#7C3AED]" : "text-slate-600 hover:text-[#6D28D9]"}`}>About</a>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              id="nav-get-started"
              onClick={() => onGetStarted()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#6D28D9] hover:bg-[#6D28D9] rounded-lg shadow-sm shadow-[#6D28D9]/20 transition-all flex items-center gap-1.5 hover:shadow-lg"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>


          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* HERO LEFT (45%) */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-8 flex flex-col justify-center text-center xl:text-left">
            
            {/* Logo and Tagline */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F3FF] border border-[#EDE9FE] text-[#6D28D9] text-xs font-semibold uppercase tracking-wider">
                <Github className="w-3.5 h-3.5" /> Public Repo Analyzer
              </div>
              <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-5xl leading-none tracking-tight text-slate-900 pb-1 select-none">
                Analyze any repository with AI
              </h1>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#6D28D9] leading-tight">
                AI-Powered GitHub Repository Analyzer
              </h2>
            </div>

            {/* Description */}
            <p className="text-base text-slate-600 leading-relaxed font-sans max-w-lg mx-auto xl:mx-0">
              Transform complex GitHub repositories into clear, actionable insights. Understand technologies, architecture, setup instructions, and project purpose in seconds.
            </p>

            {/* CTA Button and Info */}
            <div className="space-y-3 pt-2">
              <button
                id="hero-cta-btn"
                onClick={() => onGetStarted()}
                className="group relative px-8 py-4 w-full sm:w-auto font-semibold text-white bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] rounded-xl shadow-lg shadow-purple-200 py-2 hover:scale-[1.02] transition-all hover:shadow-[#6D28D9]/30 duration-200 overflow-hidden flex items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span>Get Started Analyzing</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-center xl:justify-start">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Got a repository link? Let's explore it together.
              </p>
            </div>
          </div>

          {/* HERO RIGHT (55%) - Browser Mockup with Animations */}
          <div className="lg:col-span-7">
            <div className="relative mx-auto max-w-2xl w-full font-sans">
              {/* Outer Decorative Glow */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] opacity-20 blur-xl animate-pulse" />

              {/* Browser Shell Box */}
              <div className="relative rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden font-mono flex flex-col h-[400px]">
                
                {/* Browser Title Bar */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex gap-1.5 font-sans">
                    <span className="w-3 h-3 rounded-full bg-rose-400 block" />
                    <span className="w-3 h-3 rounded-full bg-amber-400 block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400 block" />
                  </div>
                  <div className="w-3/5 bg-white border border-slate-200/80 rounded-md py-1 px-3 text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                    <Search className="w-2.5 h-2.5 text-slate-300" />
                    <span>reposense.ai/analyzer</span>
                  </div>
                  <div className="w-10" />
                </div>

                {/* Browser App Mock Panel */}
                <div className="p-6 flex-1 flex flex-col justify-center bg-slate-50/50">
                  <AnimatePresence mode="wait">
                    
                    {/* State 0: Typing State */}
                    {mockupPhase === 0 && (
                      <motion.div
                        key="phase-0"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-5 w-full max-w-md mx-auto"
                      >
                        <div className="bg-white rounded-2xl border border-[#EDE9FE] p-5 shadow-sm space-y-4">
                          <div className="space-y-1.5">
                            <h4 className="font-display font-extrabold text-slate-900 text-base">Drop Your GitHub Link</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Immediate architectural breakdown</p>
                          </div>
                          <div className="relative">
                            <input 
                              type="text" 
                              disabled 
                              value={typingText}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#EDE9FE] bg-white font-sans text-[11px] focus:ring-0 select-none text-slate-800 placeholder:text-slate-300"
                              placeholder="https://github.com/..."
                            />
                            <div className="absolute right-3 top-2.5 w-4 h-4">
                              <Github className="w-4 h-4 text-slate-300" />
                            </div>
                          </div>
                          <button 
                            disabled
                            className="w-full py-2.5 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] rounded-xl text-white font-sans font-semibold text-[11px] shadow-md shadow-purple-200/30 flex items-center justify-center gap-1.5"
                          >
                            Analyze Repository <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* State 1: Processing AI State */}
                    {mockupPhase === 1 && (
                      <motion.div
                        key="phase-1"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="space-y-4 w-full max-w-md mx-auto"
                      >
                        <div className="bg-white rounded-2xl border border-[#EDE9FE] p-5 shadow-sm space-y-4">
                          <div className="text-center space-y-2">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 mb-1">
                              <img src="/logo.svg" alt="RepoSense AI" className="w-4 h-4 animate-spin" />
                            </div>
                            <h4 className="font-display font-extrabold text-slate-900 text-sm">RepoSense AI Processing...</h4>
                            <p className="text-[10px] text-[#6D28D9] font-bold uppercase tracking-widest font-mono">{targetUrl}</p>
                          </div>

                          <div className="space-y-2 bg-[#FAF9FF] rounded-xl border border-[#EDE9FE] p-3.5 font-sans text-[11px]">
                            <div className="flex items-center gap-2 font-semibold text-[#6D28D9]">
                              <span className="w-2 h-2 rounded-full bg-[#6D28D9] animate-ping" />
                              <span>Scanning repository structures...</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                              <span>Reading README file content...</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                              <span>Detecting main technology structures...</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                              <span>Formulating structural insights...</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* State 2: Displaying Beautiful Report mockup */}
                    {mockupPhase === 2 && (
                      <motion.div
                        key="phase-2"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="space-y-3 w-full font-sans"
                      >
                        {/* Report Header Card */}
                        <div className="bg-gradient-to-br from-white to-[#F9FAFB] p-4 rounded-2xl border border-[#EDE9FE] shadow-sm space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-[#FAF5FF] rounded-full blur-xl opacity-60 pointer-events-none" />
                          
                          <div className="flex flex-wrap items-center gap-1.5 relative z-10">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[8px] font-extrabold uppercase tracking-widest rounded border border-purple-100">facebook</span>
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-extrabold uppercase tracking-widest rounded border border-emerald-100 flex items-center gap-1">
                              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                              Public
                            </span>
                          </div>

                          <div className="space-y-1 relative z-10">
                            <h5 className="font-display font-extrabold text-slate-900 text-sm leading-tight">facebook/react</h5>
                            <p className="text-slate-500 text-[10px] leading-snug font-medium line-clamp-2">A JavaScript library for building user interfaces</p>
                          </div>

                          <div className="space-y-2 relative z-10">
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Primary Tech Stack</span>
                            <div className="flex flex-wrap gap-1">
                              <span className="px-2 py-0.5 bg-purple-100 text-[#6D28D9] rounded text-[8px] font-bold">JavaScript</span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-bold">React</span>
                              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-[8px] font-bold">TypeScript</span>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-[9px] text-slate-400 font-medium relative z-10">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <strong className="text-slate-700 font-extrabold">224k</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <GitFork className="w-3 h-3 text-indigo-400" />
                                <strong className="text-slate-700 font-extrabold">45k</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                <strong className="text-slate-700 font-extrabold">1.2k</strong>
                              </span>
                            </div>
                            <span className="font-mono text-[8px]">Last Updated: 7/1/2026</span>
                          </div>
                        </div>

                        {/* Mini Summary Card */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#6D28D9] flex items-center justify-center">
                              <BookOpen className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-display font-extrabold text-slate-900 text-[11px]">Project Overview</span>
                          </div>
                          <p className="text-slate-500 text-[9px] leading-relaxed font-medium line-clamp-2">
                            React is a declarative, component-based JavaScript library for building user interfaces. It lets you compose complex UIs from small and isolated pieces of code called components.
                          </p>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* DETAILED STATS BANNER */}
      <section className="bg-white border-y border-slate-200/80 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 text-center">
            {[
              { val: "14+", label: "Repo Types", id: "stat1" },
              { val: "100+", label: "Technologies Detected", id: "stat2" },
              { val: "6", label: "Report Sections", id: "stat3" },
              { val: "5", label: "Health Metrics", id: "stat4" },
              { val: "Real-time", label: "SSE Streaming", id: "stat5" },
              { val: "AI", label: "Powered Insights", id: "stat6" },
            ].map((stat, i) => (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group"
              >
                <div className="text-3xl font-extrabold text-slate-900 font-display group-hover:text-[#6D28D9] transition-colors duration-300">{stat.val}</div>
                <div className="text-xs font-semibold text-[#6D28D9] mt-1 uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h3 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900">
            Unravel Codebases in Real Time
          </h3>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Skip the overwhelming file trees and tangled imports. Get instant clarity on project structure, dependencies, and architectural patterns with AI-powered analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, index) => (
            <div 
              key={index}
              className="feature-card bg-white rounded-2xl p-6 space-y-4 cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#6D28D9]">
                <feat.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-display font-bold text-slate-900 text-lg">{feat.title}</h4>
                <p className="text-sm leading-relaxed text-slate-500">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS (Sticky Stack Storytelling Scroll Animation) */}
      <section 
        ref={containerRef} 
        id="how-it-works" 
        className="relative bg-[#090C15] select-none text-white"
        style={{ height: "450vh" }}
      >
        {/* Sticky viewport content box */}
        <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden pt-20 pb-6 sm:pt-24 sm:pb-12 md:pb-16 px-4 sm:px-6 lg:px-8 bg-[#040712] z-10">
          
          {/* Subtle Glowing dots and Linear matrix grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
          <div className="absolute top-[20%] left-[20%] w-[250px] h-[250px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-float-slow" />

          {/* Section Header Title block (Placed outside grid, disappears at success stage) */}
          <AnimatePresence>
            {activeStoryStep < 4 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="max-w-4xl mx-auto text-center space-y-3 mb-6 sm:mb-12 cursor-default relative z-30 font-sans"
              >
                <div className="inline-flex gap-2 px-3.5 py-1.5 rounded-full bg-[#6D28D9]/20 border border-[#6D28D9]/40 text-[#8B5CF6] text-xs font-bold uppercase tracking-widest leading-none">
                  HOW REPOSENSE WORKS
                </div>
                <h3 className="font-display font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
                  Analyze Any GitHub Repository in Seconds
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto">
                  Watch RepoSense transform a repository URL into a complete AI-powered breakdown.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Showcase Layout */}
          <div className="max-w-7xl mx-auto w-full relative z-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Left Column: Interactive Milestone Line and Content details */}
              <div className="lg:col-span-5 flex items-start gap-6 leading-relaxed select-none">
                
                {/* Timeline bar with dots */}
                <div className="hidden md:flex flex-col items-center h-80 relative mt-2 shrink-0 select-none">
                  <div className="w-1 h-full bg-slate-800/80 rounded-full overflow-hidden absolute">
                    <div 
                      ref={lineRef}
                      className="w-full bg-gradient-to-b from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] origin-top"
                      style={{ height: "0%" }}
                    />
                  </div>
                  
                  {/* Step milestones */}
                  {[0, 1, 2, 3, 4].map((stepIdx) => {
                    const isCurrent = activeStoryStep === stepIdx;
                    const isPast = activeStoryStep > stepIdx;
                    return (
                      <button
                        key={stepIdx}
                        onClick={() => scrollToStep(stepIdx)}
                        className="w-7 h-7 rounded-full border-2 absolute flex items-center justify-center transition-all z-10 duration-300 transform hover:scale-110 active:scale-95 cursor-pointer outline-none"
                        style={{
                          top: `${stepIdx * 25}%`,
                          backgroundColor: isCurrent ? "#6D28D9" : isPast ? "#1E1B4B" : "#111827",
                          borderColor: isCurrent ? "#A78BFA" : isPast ? "#6D28D9" : "#374151",
                        }}
                        title={`Go to view stage ${stepIdx + 1}`}
                      >
                        {isPast ? (
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        ) : (
                          <span className={`text-[10px] font-bold ${isCurrent ? "text-white animate-pulse" : "text-slate-400"}`}>
                            {stepIdx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Left Dynamic Text content change block */}
                <div className="flex-1 min-h-[220px] flex flex-col justify-center text-left">
                  <AnimatePresence mode="wait">
                    {activeStoryStep === 0 && (
                      <motion.div
                        key="story-step-0"
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 15 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-4 font-sans"
                      >
                        <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-[#6D28D9]/20 border border-[#6D28D9]/40 text-[#A78BFA] tracking-widest uppercase">
                          STEP 01
                        </span>
                        <h4 className="text-2xl sm:text-3xl font-extrabold text-white font-display leading-tight select-none">
                          Paste Repository URL
                        </h4>
                        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md select-all">
                          Paste any public GitHub repo link into our analyzer. RepoSense instantly scans branches, file folders, and inner code layers — no login or tokens needed.
                        </p>
                        <button
                          onClick={() => scrollToStep(1)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8B5CF6] hover:text-white transition-colors cursor-pointer group"
                        >
                          Watch AI Processing <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </motion.div>
                    )}

                    {activeStoryStep === 1 && (
                      <motion.div
                        key="story-step-1"
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 15 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-4 font-sans"
                      >
                        <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 tracking-widest uppercase">
                          STEP 02
                        </span>
                        <h4 className="text-2xl sm:text-3xl font-extrabold text-white font-display leading-tight select-none">
                          AI Processing Repository
                        </h4>
                        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md select-all">
                          Our engines run safe background micro-tasks. We extract codebase architectures, synthesize structure logic, list modules, and verify configuration schemas cleanly within seconds.
                        </p>
                        <button
                          onClick={() => scrollToStep(2)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8B5CF6] hover:text-white transition-colors cursor-pointer group"
                        >
                          Explore Instant Breakdown <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </motion.div>
                    )}

                    {activeStoryStep === 2 && (
                      <motion.div
                        key="story-step-2"
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 15 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-4 font-sans"
                      >
                        <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-505/20 border border-indigo-500/30 text-indigo-300 tracking-widest uppercase">
                          STEP 03
                        </span>
                        <h4 className="text-2xl sm:text-3xl font-extrabold text-white font-display leading-tight select-none">
                          Instant Repository Breakdown
                        </h4>
                        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md select-all">
                          Immediately interact with the deep-dive report dashboards. Review high-fidelity metrics, technology scores, system summaries, and setup steps nicely framed.
                        </p>
                        <button
                          onClick={() => scrollToStep(3)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8B5CF6] hover:text-white transition-colors cursor-pointer group"
                        >
                          Inspect CoPilot Queries <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </motion.div>
                    )}

                    {activeStoryStep === 3 && (
                      <motion.div
                        key="story-step-3"
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 15 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-4 font-sans"
                      >
                        <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-pink-500/15 border border-pink-500/30 text-pink-300 tracking-widest uppercase">
                          BONUS FEATURE
                        </span>
                        <h4 className="text-2xl sm:text-3xl font-extrabold text-white font-display leading-tight select-none">
                          Ask Questions About Repo
                        </h4>
                        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md select-all">
                          Curious about a specific file or folder? Ask our AI chat anything — like where settings are used or how parts connect — and get quick answers.
                        </p>
                        <button
                          onClick={() => scrollToStep(4)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8B5CF6] hover:text-white transition-colors cursor-pointer group"
                        >
                          Complete Inspection <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </motion.div>
                    )}

                    {activeStoryStep === 4 && (
                      <motion.div
                        key="story-step-4"
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 15 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-4 font-sans"
                      >
                        <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 tracking-widest uppercase animate-pulse">
                          EXPERIENCE READY
                        </span>
                        <h4 className="text-2xl sm:text-3xl font-extrabold text-white font-display leading-tight select-none">
                          Ready to Ship Faster?
                        </h4>
                        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md select-all">
                          No more wasting hours digging through folders and guessing how things work. RepoSense gives you clear answers from the start.
                        </p>
                        <button
                          onClick={() => onGetStarted()}
                          className="inline-flex items-center gap-1.5 px-6 py-3 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white rounded-xl text-xs font-bold hover:shadow-lg shadow-purple-500/20 hover:scale-[1.02] transform transition-all cursor-pointer"
                        >
                          Launch Workspace Now <Sparkles className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Column: Premium Cascading Mockup stack elements */}
              <div className="lg:col-span-7 h-[50vh] sm:h-[58vh] relative flex items-center justify-center select-none pt-4 lg:pt-0">
                <div className="w-full h-full relative" style={{ perspective: "1000px" }}>
                  
                  {/* SCREEN 1: Input mock block */}
                  <motion.div
                    className="absolute inset-0 bg-[#0E1324] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-none"
                    animate={getScreenVariants(0, activeStoryStep)}
                    transition={{ type: "spring", stiffness: 95, damping: 18 }}
                  >
                    <div className="px-4 py-3 bg-[#070914] border-b border-slate-850 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">be749013/reposense-ai/paste-url</span>
                      <div className="w-8" />
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/40 relative">
                      <div className="space-y-4 w-full max-w-xs text-center relative z-20">
                        <div className="w-11 h-11 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto text-[#8B5CF6] border border-purple-500/20">
                          <Github className="w-5.5 h-5.5" />
                        </div>
                        
                        <div className="space-y-0.5">
                          <h5 className="font-display font-medium text-slate-200 text-xs">Drop public repository address</h5>
                          <p className="text-[10px] text-slate-500">Fast sandbox-safe indexing</p>
                        </div>

                        <div className="relative">
                          <input 
                            type="text" 
                            readOnly
                            value="https://github.com/facebook/react"
                            className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-[#070914] text-[10.5px] text-slate-350 focus:ring-0 text-left font-mono"
                          />
                        </div>

                        <button 
                          disabled
                          className="w-full py-2 bg-[#6D28D9] rounded-lg text-white font-sans font-semibold text-[11px] shadow-md shadow-[#6D28D9]/10 flex items-center justify-center gap-1.5"
                        >
                          Analyze Codebase <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Moving pointer cursor */}
                      <motion.div
                        className="absolute z-40 flex flex-col items-start gap-1"
                        animate={{
                          x: activeStoryStep === 0 ? [-50, 90, 90, -50] : -50,
                          y: activeStoryStep === 0 ? [50, 48, 48, 50] : 50,
                          scale: activeStoryStep === 0 ? [1, 1, 0.88, 1, 1] : 1
                        }}
                        transition={{
                          duration: 4.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <MousePointer className="w-5 h-5 text-purple-400 fill-purple-400 filter drop-shadow-[0_2px_6px_rgba(124,58,237,0.4)]" />
                        <motion.span 
                          className="h-2.5 w-2.5 rounded-full bg-purple-500 absolute -top-1 -left-1"
                          animate={{ scale: [1, 2.5, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* SCREEN 2: Loading State mock block */}
                  <motion.div
                    className="absolute inset-0 bg-[#0E1324] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-none"
                    animate={getScreenVariants(1, activeStoryStep)}
                    transition={{ type: "spring", stiffness: 95, damping: 18 }}
                  >
                    <div className="px-4 py-3 bg-[#070914] border-b border-slate-850 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">be749013/reposense-ai/indexer</span>
                      <div className="w-8" />
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center p-5 bg-slate-950/40 relative">
                      <div className="w-full max-w-sm space-y-3 relative z-20">
                        <div className="text-center space-y-1 mb-1">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 animate-spin mb-1">
                            <img src="/logo.svg" alt="RepoSense AI" className="w-3.5 h-3.5" />
                          </div>
                          <h5 className="font-display font-medium text-slate-200 text-xs">Parsing files & structures</h5>
                          <p className="text-[9px] text-[#8B5CF6] font-semibold uppercase tracking-wider font-mono">facebook/react</p>
                        </div>

                        {/* checklist */}
                        <div className="space-y-1.5 bg-[#070914] rounded-xl border border-slate-850 p-3 font-sans text-[11px] text-slate-400">
                          <div className="flex items-center justify-between text-emerald-400 font-medium">
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ✓ Reading README Documentation
                            </span>
                            <span className="text-[9px] font-mono tracking-tight bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-300">100%</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-emerald-400 font-medium">
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ✓ Detecting Framework & tech parameters
                            </span>
                            <span className="text-[9px] font-mono tracking-tight bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-300">100%</span>
                          </div>

                          <div className="flex items-center justify-between text-purple-300 font-semibold">
                            <span className="flex items-center gap-2 animate-pulse">
                              <span className="w-3.5 h-3.5 border-2 border-[#6D28D9] border-t-transparent rounded-full animate-spin shrink-0" />
                              Analyzing Component Files Tree
                            </span>
                            <span className="text-[9px] font-mono bg-purple-555/10 px-1.5 py-0.5 rounded animate-pulse text-[#8B5CF6]">42%</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-slate-850 shrink-0" />
                              Extracting Main Dependency Packages
                            </span>
                            <span className="text-[9px] font-mono text-slate-705">Queued</span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-[#6D28D9]"
                            animate={{ width: ["10%", "60%", "72%", "10%"] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </div>
                      </div>

                      {/* Moving particles */}
                      <div className="absolute inset-0 overflow-hidden opacity-15">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-3 rounded-full bg-purple-500"
                            style={{
                              left: `${20 + i * 20}%`,
                              bottom: "-20px",
                            }}
                            animate={{
                              y: [-20, -320],
                              opacity: [0, 0.7, 0],
                            }}
                            transition={{
                              duration: 3.5 + i,
                              repeat: Infinity,
                              delay: i * 0.5,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* SCREEN 3: Dashboard breakdown report mockup block */}
                  <motion.div
                    className="absolute inset-0 bg-[#0E1324] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-none"
                    animate={getScreenVariants(2, activeStoryStep)}
                    transition={{ type: "spring", stiffness: 95, damping: 18 }}
                  >
                    <div className="px-4 py-3 bg-[#070914] border-b border-slate-850 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">be749013/reposense-ai/report</span>
                      <div className="w-8" />
                    </div>
                    
                    <div className="flex-1 p-4 bg-[#05070f] flex flex-col justify-between text-slate-400">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] tracking-wide text-purple-400 uppercase font-black bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">Indexed Profile</span>
                          <span className="font-display font-medium text-xs text-slate-100">facebook/react</span>
                        </div>
                        <span className="flex items-center bg-slate-900 text-[#8B5CF6] px-1.5 py-0.5 rounded text-[8px] border border-slate-800 gap-1 font-mono">
                          <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" strokeWidth={3} /> 224k
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 flex-1 mb-2">
                        {/* Technologies card */}
                        <div className="bg-[#0b0e1a] border border-slate-850 p-2.5 rounded-xl flex flex-col justify-between space-y-1">
                          <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest leading-none block">framework / language</span>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] text-slate-200 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block" />
                              <span>TypeScript</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-350">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 block" />
                              <span>Flow Compiler</span>
                            </div>
                          </div>
                        </div>

                        {/* Statistics card */}
                        <div className="bg-[#0b0e1a] border border-slate-850 p-2.5 rounded-xl flex flex-col justify-between space-y-1">
                          <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest leading-none block">COMPLEXITY RATE</span>
                          <div>
                            <span className="text-lg font-black text-[#8B5CF6] block font-display leading-none">9.4/10</span>
                            <span className="text-[7.5px] uppercase font-bold tracking-wider px-1 bg-red-500/15 border border-red-500/20 text-red-400 rounded mt-1 inline-block">highly complex</span>
                          </div>
                        </div>

                        {/* AI advisor layout */}
                        <div className="bg-[#0b0e1a] border border-slate-850 p-2.5 rounded-xl col-span-2 flex flex-col justify-between">
                          <span className="text-[8px] text-slate-400 uppercase font-extrabold tracking-wider block mb-1">ai structural diagnostics statement</span>
                          <p className="text-[9.5px] text-slate-300 leading-relaxed font-sans select-all">
                            "The monorepo contains multiple workspace packages (react, react-dom, react-reconciler). We suggest replacing legacy scripts with dynamic <span className="text-[#8B5CF6] font-bold">Vite</span> workflows to optimize bundlers."
                          </p>
                        </div>
                      </div>

                      <div className="p-1.5 bg-[#080b14] rounded-lg border border-slate-850 flex items-center justify-between text-[8px] font-mono mt-1 select-all">
                        <span className="text-slate-500">Repository setup profile:</span>
                        <span className="text-emerald-400 font-semibold">Ready / Sandbox Compliant</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* SCREEN 4: Interactive AI Chat mockup block */}
                  <motion.div
                    className="absolute inset-0 bg-[#0E1324] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-none"
                    animate={getScreenVariants(3, activeStoryStep)}
                    transition={{ type: "spring", stiffness: 95, damping: 18 }}
                  >
                    <div className="px-4 py-3 bg-[#070914] border-b border-slate-850 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">be749013/reposense-ai/chat</span>
                      <div className="w-8" />
                    </div>
                    
                    <div className="flex-1 p-3 bg-[#05070f] flex flex-col justify-between text-slate-400">
                      <div className="flex items-center gap-1.5 border-b border-slate-850 pb-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-[#8B5CF6]" />
                        <div className="text-left">
                          <h6 className="font-display font-medium text-[11px] text-white leading-none">RepoSense CoPilot Ask</h6>
                          <span className="text-[8px] text-slate-500 block">Workspace contextual vector models</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-3.5 flex flex-col justify-start">
                        {/* User Question */}
                        <div className="flex gap-2.5 justify-end items-start text-right">
                          <div className="bg-[#1E1B4B] border border-[#6D28D9]/20 py-1.5 px-2.5 rounded-xl text-[9.5px] leading-relaxed max-w-[80%] text-left text-slate-250 font-sans">
                            "What does this react-reconciler package handle?"
                          </div>
                        </div>

                        {/* Copilot reply */}
                        <motion.div 
                          className="flex gap-2 justify-start items-start"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: activeStoryStep === 3 ? 1 : 0, y: activeStoryStep === 3 ? 0 : 5 }}
                          transition={{ delay: 0.5, duration: 0.3 }}
                        >
                          <div className="w-5.5 h-5.5 rounded-full bg-purple-650 border border-[#6D28D9]/30 font-bold flex items-center justify-center text-[8px] text-white shrink-0 font-display">
                            R
                          </div>
                          <div className="bg-[#0b0e1a] border border-slate-850 p-2.5 rounded-xl text-[9.5px] leading-relaxed max-w-[80%] text-left text-slate-300 font-sans">
                            <span className="font-semibold text-[#8B5CF6] block mb-0.5">Answer:</span>
                            "The reconciler acts as the core Virtual DOM engine. It calculates changes across element mounts, processes diff files, and updates targeted hardware nodes."
                          </div>
                        </motion.div>
                      </div>

                      <div className="mt-2 relative flex items-center">
                        <input 
                          type="text" 
                          placeholder="Ask CoPilot any code question..." 
                          className="w-full bg-[#070914] border border-slate-850 rounded-lg py-1.5 px-3 pl-3 text-[9px] text-slate-400 focus:ring-0"
                          readOnly
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* SCREEN 5: Immersive Done Final launch card mock block */}
                  <motion.div
                    className="absolute inset-0 bg-[#0E1324] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-none"
                    animate={getScreenVariants(4, activeStoryStep)}
                    transition={{ type: "spring", stiffness: 95, damping: 18 }}
                  >
                    <div className="px-4 py-3 bg-[#070914] border-b border-slate-850 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">be749013/reposense-ai/launch</span>
                      <div className="w-8" />
                    </div>
                    
                    <div className="flex-1 p-6 bg-gradient-to-b from-[#090b14] to-[#120a2e] flex flex-col items-center justify-center text-slate-300 relative overflow-hidden text-center">
                      <div className="absolute inset-x-0 bottom-0 top-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.18),transparent_70%)]" />
                      
                      {/* Spinning code crystal */}
                      <div className="relative mb-4 z-20">
                        <motion.div 
                          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6D28D9] to-[#A78BFA] flex items-center justify-center text-white shadow-xl shadow-purple-500/10 border border-white/10"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                        >
                           <img src="/logo.svg" alt="RepoSense AI" className="w-5.5 h-5.5" />
                        </motion.div>
                        <motion.div 
                          className="absolute -inset-1.5 rounded-2xl bg-[#6D28D9]/20 blur-xl pointer-events-none select-none"
                          animate={{ scale: [1, 1.25, 1] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>

                      <div className="text-center space-y-3.5 max-w-xs relative z-20 font-sans">
                        <div className="space-y-0.5">
                          <h5 className="font-display font-extrabold text-white text-sm tracking-tight leading-none">Understand Any Codebase</h5>
                          <p className="text-[9.5px] text-slate-400 tracking-tight">Paste. Analyze. Learn.</p>
                        </div>
                        
                        <p className="text-[9.5px] text-slate-500 leading-snug">
                          Unlock modular file trees and interactive system diagnostics in seconds.
                        </p>

                        <button 
                          onClick={() => onGetStarted()}
                          className="w-full py-2.5 bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] text-white rounded-xl font-bold text-[10.5px] shadow-lg shadow-purple-500/15 flex items-center justify-center gap-1 hover:brightness-110 active:scale-98 cursor-pointer pointer-events-auto"
                        >
                          <span>Try RepoSense Now</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Concentric planetary rings */}
                      <div className="absolute w-[180px] h-[180px] rounded-full border border-slate-800/40 pointer-events-none" />
                      <div className="absolute w-[240px] h-[240px] rounded-full border border-slate-800/20 pointer-events-none" />
                    </div>
                  </motion.div>

                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* CORE PHILOSOPHY / ABOUT */}
      <AboutSection />

      {/* FOOTER */}
      <footer className="bg-[#050810] text-slate-500 py-10 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="RepoSense AI" className="w-4 h-4 rounded-md" />
            <span className="font-display font-semibold text-slate-300">RepoSense AI</span>
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
          </div>
          <p className="text-[11px] text-slate-600">
            © 2026 RepoSense AI. Powered by NVIDIA LLM API.
          </p>
        </div>
      </footer>

    </div>
  );
}

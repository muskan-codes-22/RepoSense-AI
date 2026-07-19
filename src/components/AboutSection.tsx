import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

const CODE_LINES = [
  { text: "repo_type: next_app", color: "text-[#8B5CF6]" },
  { text: "framework: next@14.2", color: "text-[#A78BFA]" },
  { text: "lang: typescript", color: "text-[#818CF8]" },
  { text: "pkg_mgr: pnpm", color: "text-[#8B5CF6]" },
  { text: "runtime: node@20.x", color: "text-[#A78BFA]" },
  { text: "db: postgresql@16", color: "text-[#818CF8]" },
  { text: "confidence: 100%", color: "text-[#8B5CF6]" },
];

const TECH_STACK = [
  "Next.js",
  "TypeScript",
  "Tailwind",
  "Prisma",
  "PostgreSQL",
  "Vercel",
  "React 19",
  "Zod",
];

const PROBLEM_POINTS = [
  { text: "AI models confidently ", highlight: "guess", highlightSuffix: " repository architectures" },
  { text: "Hallucinate framework versions & invent nonexistent dependencies" },
  { text: "Fabricate install steps that break on first ", code: "npm install", codeSuffix: "" },
  { text: "Result: false tech claims, misleading diagrams, wasted hours" },
];

const SOLUTION_POINTS = [
  { text: "Programmatic heuristic engine extracts ", highlight: "100% ground truth" },
  { text: "Detects 14+ repo types, 100+ technologies, build systems" },
  { text: "Deterministic shield fed to ", highlight: "NVIDIA Mistral LLM", highlightSuffix: " as verified context" },
  { text: "Completely eliminates hallucination at the source" },
];

function GlowLine() {
  return (
    <div className="flex justify-center py-2 relative z-10">
      <svg
        viewBox="0 0 24 40"
        className="w-5 h-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 4 L12 30" className="stroke-[#6D28D9]/60" strokeLinecap="round" />
        <path d="M6 24 L12 32 L18 24" className="stroke-[#6D28D9]/60" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function AboutSection() {
  return (
    <section
      id="about"
      className="relative bg-[#090C15] text-white overflow-hidden"
    >
      {/* Background layers matching How It Works */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[15%] left-[10%] w-[300px] h-[300px] rounded-full bg-[#6D28D9]/10 blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[15%] right-[10%] w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[120px] animate-float-slow pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20 items-start">

          {/* ════════ LEFT COLUMN — Problem & Solution ════════ */}
          <motion.div
            className="lg:col-span-5 space-y-7"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* Section pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#6D28D9]/20 border border-[#6D28D9]/40 text-[#8B5CF6] text-[11px] font-bold uppercase tracking-[0.2em] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
                Our Core Philosophy
              </span>
            </motion.div>

            {/* Main heading */}
            <motion.h2
              className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-[1.1] tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Deep Code Intelligence.{" "}
              <span className="bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#A78BFA] bg-clip-text text-transparent">
                Zero Hallucinations.
              </span>
            </motion.h2>

            {/* THE PROBLEM */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              <h3 className="font-display font-bold text-sm text-white/90 uppercase tracking-wider flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="w-4 h-4 text-red-400" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                The Problem
              </h3>
              <ul className="space-y-2.5">
                {PROBLEM_POINTS.map((point, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2.5 text-sm sm:text-[15px] text-slate-400 leading-relaxed"
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.4 + i * 0.08 }}
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400/80 shrink-0" />
                    <span>
                      {point.text}
                      {point.highlight && (
                        <span className="text-slate-200 font-medium">{point.highlight}</span>
                      )}
                      {point.highlightSuffix && (
                        <span>{point.highlightSuffix}</span>
                      )}
                      {point.code && (
                        <code className="px-1.5 py-0.5 rounded bg-slate-800/80 text-rose-300 text-xs font-mono border border-slate-700/60">
                          {point.code}
                        </code>
                      )}
                      {point.codeSuffix && <span>{point.codeSuffix}</span>}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* THE SOLUTION */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h3 className="font-display font-bold text-sm text-white/90 uppercase tracking-wider flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="w-4 h-4 text-[#8B5CF6]" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                The Solution
              </h3>
              <ul className="space-y-2.5">
                {SOLUTION_POINTS.map((point, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2.5 text-sm sm:text-[15px] text-slate-400 leading-relaxed"
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.55 + i * 0.08 }}
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#8B5CF6]/80 shrink-0" />
                    <span>
                      {point.text}
                      {point.highlight && (
                        <span className="text-[#8B5CF6] font-semibold">{point.highlight}</span>
                      )}
                      {point.highlightSuffix && (
                        <span>{point.highlightSuffix}</span>
                      )}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Tech stack proof badges */}
            <motion.div
              className="flex flex-wrap gap-2 pt-2"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.65 }}
            >
              {TECH_STACK.map((tech, i) => (
                <motion.span
                  key={tech}
                  className="px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] font-mono font-medium text-slate-300 hover:border-[#6D28D9]/40 hover:text-[#8B5CF6] transition-colors duration-300"
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.7 + i * 0.04 }}
                >
                  {tech}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          {/* ════════ RIGHT COLUMN — Architectural Blueprint ════════ */}
          <motion.div
            className="lg:col-span-7 relative"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <div className="relative w-full max-w-lg mx-auto">

              {/* ── Layer 1: Incoming URL ── */}
              <motion.div
                className="relative z-10 mx-auto w-fit"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0E1324] border border-slate-800 shadow-2xl shadow-black/30">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#6D28D9]/10 border border-[#6D28D9]/20">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">Incoming</span>
                    <span className="text-xs font-mono text-[#8B5CF6] font-medium">
                      github.com/vercel/next.js
                    </span>
                  </div>
                  <div className="ml-2 w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
                </div>
              </motion.div>

              <GlowLine />

              {/* ── Layer 2: Dual Engine Cards ── */}
              <motion.div
                className="relative z-10"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Heuristics Engine Card */}
                  <div className="rounded-2xl bg-[#0A0F1C] border border-slate-800 overflow-hidden shadow-2xl shadow-black/40">
                    <div className="px-3 py-2 bg-[#070914] border-b border-slate-800/60 flex items-center gap-2">
                      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-[#8B5CF6]" fill="currentColor">
                        <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        Heuristics Engine
                      </span>
                    </div>
                    <div className="p-3 space-y-1.5">
                      {CODE_LINES.map((line, i) => (
                        <motion.div
                          key={i}
                          className="flex items-center gap-2"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.8 + i * 0.08 }}
                        >
                          <span className="text-[9px] text-slate-600 font-mono w-3 text-right select-none shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">→</span>
                          <span className={`text-[10px] font-mono font-medium ${line.color}`}>
                            {line.text}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* NVIDIA Mistral LLM Card */}
                  <div className="rounded-2xl bg-gradient-to-br from-[#0C0520] via-[#110A28] to-[#0A1525] border border-[#6D28D9]/20 overflow-hidden shadow-2xl shadow-purple-900/30 relative">
                    {/* Mesh gradient background */}
                    <div className="absolute inset-0 opacity-40">
                      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_20%_30%,rgba(124,58,237,0.3),transparent_60%)]" />
                      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_80%_70%,rgba(167,139,250,0.2),transparent_60%)]" />
                    </div>

                    <div className="relative z-10 px-3 py-2 bg-[#0A0320]/80 border-b border-[#6D28D9]/15 flex items-center gap-2">
                      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-[#7C3AED]" fill="currentColor">
                        <path d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.062 1.06A.75.75 0 116.11 5.173L5.05 4.11a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.062a.75.75 0 01-1.062-1.061l1.061-1.06a.75.75 0 011.06 0zM3 8a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 013 8zm11 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0114 8zm-6.828 2.828a.75.75 0 011.06 0l.708.707a.75.75 0 01-1.061 1.06l-.707-.707a.75.75 0 010-1.06zm5.656 0a.75.75 0 010 1.06l-.707.708a.75.75 0 01-1.06-1.061l.707-.707a.75.75 0 011.06 0zM10 14a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 14z" />
                        <path d="M10 6a4 4 0 100 8 4 4 0 000-8zM2 10a8 8 0 1116 0 8 8 0 01-16 0z" />
                      </svg>
                      <span className="text-[10px] font-mono text-[#8B5CF6]/80 uppercase tracking-wider">
                        NVIDIA Mistral LLM
                      </span>
                    </div>

                    <div className="relative z-10 p-4 space-y-3">
                      {[
                        "Architecture: Monorepo with Turborepo pipelines",
                        "Auth: NextAuth.js with GitHub + Google OAuth",
                        "Deployment: Vercel Edge Functions",
                      ].map((text, i) => (
                        <motion.div
                          key={i}
                          className="flex items-start gap-2"
                          initial={{ opacity: 0, x: 10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 1.0 + i * 0.15 }}
                        >
                          <span className="text-[10px] text-[#8B5CF6] mt-0.5 shrink-0">✦</span>
                          <span className="text-[10px] font-sans text-[#A78BFA]/70 leading-relaxed">
                            {text}
                          </span>
                        </motion.div>
                      ))}

                      {/* Pulsing inference indicator */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#6D28D9]/10">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7C3AED]" />
                        </span>
                        <span className="text-[9px] font-mono text-[#8B5CF6]/60 uppercase tracking-widest">
                          Inference streaming…
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <GlowLine />

              {/* ── Layer 3: Anti-Hallucination Shield ── */}
              <motion.div
                className="relative z-20 mx-auto w-fit"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="relative">
                  {/* Glow backdrop */}
                  <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-[#6D28D9]/20 via-[#8B5CF6]/10 to-[#6D28D9]/20 blur-xl pointer-events-none" />

                  <div className="relative flex items-center gap-4 px-6 py-4 rounded-2xl bg-[#0B1520]/90 border border-[#6D28D9]/30 shadow-2xl shadow-purple-900/20 backdrop-blur-xl">
                    {/* Shield icon with scan animation */}
                    <motion.div
                      className="shrink-0 w-10 h-10 rounded-xl bg-[#6D28D9]/10 border border-[#6D28D9]/25 flex items-center justify-center"
                      animate={{ boxShadow: ["0 0 0px 0px rgba(139,92,246,0)", "0 0 20px 4px rgba(139,92,246,0.2)", "0 0 0px 0px rgba(139,92,246,0)"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ShieldCheck className="w-5 h-5 text-[#8B5CF6]" />
                    </motion.div>

                    <div className="space-y-1">
                      <span className="text-xs font-display font-bold text-[#A78BFA] block">
                        Anti-Hallucination Filter
                      </span>
                      <span className="text-[10px] font-sans text-slate-400 leading-snug block max-w-[240px]">
                        Cross-verifies heuristic ground truth against LLM output before streaming to the user.
                      </span>
                    </div>

                    {/* Verification checkmarks */}
                    <div className="hidden sm:flex flex-col gap-1 ml-2 shrink-0">
                      {["text", "tech", "config"].map((item, i) => (
                        <motion.div
                          key={item}
                          className="flex items-center gap-1.5"
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 1.6 + i * 0.1 }}
                        >
                          <svg viewBox="0 0 16 16" className="w-3 h-3 text-[#8B5CF6]" fill="currentColor">
                            <path fillRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm3.78-9.72a.75.75 0 00-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z" clipRule="evenodd" />
                          </svg>
                          <span className="text-[9px] font-mono text-[#8B5CF6]/70 uppercase tracking-wider">{item}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              <GlowLine />

              {/* ── Layer 4: Verified Output Pill ── */}
              <motion.div
                className="flex justify-center relative z-10"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 1.8 }}
              >
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9]/10 to-[#7C3AED]/10 border border-[#6D28D9]/20">
                  <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-[#8B5CF6]" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[11px] font-mono font-medium text-[#A78BFA]">
                    Verified output → 100% accurate report
                  </span>
                </div>
              </motion.div>

            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

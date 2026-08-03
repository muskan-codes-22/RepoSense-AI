import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import {
  Github,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Chrome,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";

interface AuthPageProps {
  onLoginSuccess: (user: { id: string; email: string; fullName: string; avatarUrl?: string }) => void;
  onBackToLanding: () => void;
  initialTab?: "login" | "signup";
}

export default function AuthPage({ onLoginSuccess, onBackToLanding, initialTab = "login" }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStr, setErrorStr] = useState<string | null>(null);
  const [infoStr, setInfoStr] = useState<string | null>(null);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    setErrorStr(null);
    setInfoStr(null);
  }, [activeTab, isForgotPassword]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStr(null);
    setInfoStr(null);

    if (!email || !password) {
      setErrorStr("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      if (email.toLowerCase() === "demo@example.com" && password === "password") {
        setIsLoading(false);
        const dummyUser = {
          id: "usr_demo123",
          email: "demo@example.com",
          fullName: "Demo Developer",
          avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Demo"
        };

        if (rememberMe) {
          localStorage.setItem("reposense_remembered_email", email);
        } else {
          localStorage.removeItem("reposense_remembered_email");
        }

        onLoginSuccess(dummyUser);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
          setErrorStr("Unable to connect to authentication service. You can still use the app in offline mode with any email.");
          const fallbackUser = {
            id: `usr_${Date.now()}`,
            email: email.trim(),
            fullName: email.trim().split("@")[0],
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${email.trim()}`
          };
          if (rememberMe) {
            localStorage.setItem("reposense_remembered_email", email);
          } else {
            localStorage.removeItem("reposense_remembered_email");
          }
          onLoginSuccess(fallbackUser);
          return;
        }
        throw error;
      }

      if (data?.user) {
        const userEmail = data.user.email || "";
        const userFullName = data.user.user_metadata?.full_name || userEmail.split("@")[0];
        const authUser = {
          id: data.user.id,
          email: userEmail,
          fullName: userFullName,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.user.id}`
        };

        if (rememberMe) {
          localStorage.setItem("reposense_remembered_email", email);
        } else {
          localStorage.removeItem("reposense_remembered_email");
        }

        onLoginSuccess(authUser);
      }
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
        setErrorStr(null);
        const fallbackUser = {
          id: `usr_${Date.now()}`,
          email: email.trim(),
          fullName: email.trim().split("@")[0],
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${email.trim()}`
        };
        if (rememberMe) {
          localStorage.setItem("reposense_remembered_email", email);
        } else {
          localStorage.removeItem("reposense_remembered_email");
        }
        onLoginSuccess(fallbackUser);
        return;
      }
      setErrorStr(err?.message || "An authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStr(null);
    setInfoStr(null);

    if (!fullName) {
      setErrorStr("Please provide your full name.");
      return;
    }
    if (!email) {
      setErrorStr("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorStr("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorStr("Passwords do not match.");
      return;
    }
    if (!acceptTerms) {
      setErrorStr("You must accept the terms of service to continue.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
          const fallbackUser = {
            id: `usr_${Date.now()}`,
            email: email.trim(),
            fullName: fullName,
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${email.trim()}`
          };
          onLoginSuccess(fallbackUser);
          return;
        }
        throw error;
      }

      if (data?.user) {
        const userEmail = data.user.email || email.trim();
        const userFullName = data.user.user_metadata?.full_name || fullName;
        onLoginSuccess({
          id: data.user.id,
          email: userEmail,
          fullName: userFullName,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.user.id}`
        });
      }
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
        const fallbackUser = {
          id: `usr_${Date.now()}`,
          email: email.trim(),
          fullName: fullName,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${email.trim()}`
        };
        onLoginSuccess(fallbackUser);
        return;
      }
      setErrorStr(err?.message || "Failed to finalize registration.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "github") => {
    setErrorStr(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
        const fallbackUser = {
          id: `usr_${Date.now()}`,
          email: `user@${provider}.com`,
          fullName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${provider}_${Date.now()}`
        };
        onLoginSuccess(fallbackUser);
        return;
      }
      setErrorStr(err?.message || `Social login via ${provider} failed.`);
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrorStr("Please enter your email to receive a reset token.");
      return;
    }
    setIsLoading(true);
    setErrorStr(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setInfoStr(`Reset password instructions have been sent to ${resetEmail}. Check your inbox!`);
      setResetEmail("");
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
        setErrorStr("Unable to connect to authentication service. Please try again later or contact support.");
      } else {
        setErrorStr(err?.message || "Failed to process recovery request.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-page-root" className="h-screen bg-slate-50 grid grid-cols-1 md:grid-cols-2 relative font-sans overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* ─── LEFT COLUMN: Product Context & Visual Blueprint (hidden on mobile) ─── */}
      <div className="relative hidden md:flex flex-col justify-between p-6 lg:p-10 z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="space-y-6 my-auto"
        >
          <h2 className="text-4xl lg:text-5xl font-sans font-[900] text-slate-900 leading-[1.05] tracking-tight">
            From Source Code to <br />
            <span className="bg-gradient-to-r from-[#1B2A6B] via-[#1B2A6B] to-[#2E3F8F] bg-clip-text text-transparent">
              Production-Ready Reports.
            </span>
          </h2>

          {/* Workspace Preview Card */}
          <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-3xl p-5 lg:p-6 overflow-hidden">
            {/* Card Header */}
            <div className="text-xs font-bold tracking-wider text-slate-500 mb-6">
              📊 WORKSPACE PREVIEW
            </div>

            {/* Dashboard Mockup Container */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-inner"
            >
              {/* Top Row - Repo Info */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-slate-800">facebook / react</span>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold px-2 py-1 rounded-full">
                  Audited
                </span>
              </div>

              {/* Middle Row - Metrics Grid */}
              <div className="mt-5 grid grid-cols-2 gap-4">
                {/* Health Score Box */}
                <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                  <p className="text-[11px] text-slate-400 font-medium mb-1">Health Score</p>
                  <p className="text-emerald-600 text-3xl font-display font-bold">94/100</p>
                </div>

                {/* Tech Stack Box */}
                <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                  <p className="text-[11px] text-slate-400 font-medium mb-2">Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["React", "TS", "Vite"].map((tech) => (
                      <span
                        key={tech}
                        className="font-mono text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded-md"
                      >
                        &lt;{tech}&gt;
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Row - AI Insights */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-slate-700 mb-3">AI Architectural Insights</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-[5px] shrink-0" />
                    <span className="text-[10px] text-slate-600 leading-relaxed">Modular component architecture with clear separation of concerns</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-[5px] shrink-0" />
                    <span className="text-[10px] text-slate-600 leading-relaxed">Strong test coverage across core hooks and utilities</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-[5px] shrink-0" />
                    <span className="text-[10px] text-slate-600 leading-relaxed">Minor: several dependencies trailing behind latest stable versions</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-[11px] text-slate-400 font-medium"
        >
          &copy; {new Date().getFullYear()} RepoSense AI. All privileges preserved.
        </motion.p>
      </div>

      {/* ─── RIGHT COLUMN: Auth Form ─── */}
      <div className="relative flex items-center justify-center p-6 sm:p-8 z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-md w-full"
        >
          {/* Mobile logo */}
          <div className="md:hidden flex items-center justify-between mb-6">
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={onBackToLanding}
            >
              <img src="/logo.svg" alt="RepoSense AI" className="w-9 h-9 rounded-xl shadow-md shadow-blue-500/10" />
              <div>
                <h1 className="font-extrabold text-sm tracking-tight font-display text-slate-900">REPOSENSE AI</h1>
                <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase font-semibold">Workspace Auth</p>
              </div>
            </div>
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#E8D9B8] text-[#7A5C1E] hover:text-[#7A5C1E] bg-[#F5EBD3]/50 hover:bg-[#F5EBD3] text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-98"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl p-6 space-y-4">
            {/* Back button - desktop only */}
            <div className="hidden md:flex justify-end">
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#7A5C1E] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isForgotPassword ? (
                <motion.div
                  key="password-recovery"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsForgotPassword(false)}
                      className="text-xs font-semibold text-[#1B2A6B] hover:text-[#101B4A] transition-colors flex items-center gap-1 mb-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to login</span>
                    </button>
                    <h3 className="font-display font-bold text-2xl text-slate-900 tracking-tight">Recover Credentials</h3>
                    <p className="text-slate-500 text-sm font-sans leading-relaxed">
                      Provide the email associated with your account, and we'll transmit instructions to restore your system access.
                    </p>
                  </div>

                  {errorStr && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorStr}</span>
                    </div>
                  )}

                  {infoStr && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{infoStr}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="developers@org.com"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#1B2A6B] focus:ring-2 focus:ring-[#1B2A6B]/20 focus:bg-[#F5EBD3]/30 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-gradient-to-r from-[#1B2A6B] to-[#2E3F8F] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:opacity-95 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Transmit Instructions</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="auth-forms-holder"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Tab Switcher */}
                  <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                    <button
                      onClick={() => setActiveTab("login")}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === "login"
                          ? "bg-white text-slate-900 font-medium shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Login
                    </button>
                    <button
                      onClick={() => setActiveTab("signup")}
                      className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === "signup"
                          ? "bg-white text-slate-900 font-medium shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      New Account
                    </button>
                  </div>

                  {/* Titles */}
                  <div className="space-y-1.5">
                    {activeTab === "login" ? (
                      <>
                        <h3 className="font-display font-bold text-2xl text-slate-900 tracking-tight">Welcome Back</h3>
                        <p className="text-slate-500 text-sm font-sans">Enter credentials or utilize OAuth to synthesize code reports.</p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-display font-bold text-2xl text-slate-900 tracking-tight">Create Account</h3>
                        <p className="text-slate-500 text-sm font-sans">Join RepoSense AI to compile saved repositories and insights.</p>
                      </>
                    )}
                  </div>

                  {errorStr && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorStr}</span>
                    </div>
                  )}

                  {activeTab === "login" ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="developers@example.com"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-[#1B2A6B] focus:ring-2 focus:ring-[#1B2A6B]/20 focus:bg-[#F5EBD3]/30 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Password</label>
                          <button
                            type="button"
                            onClick={() => setIsForgotPassword(true)}
                            className="text-xs font-semibold text-[#1B2A6B] hover:text-[#101B4A] transition-colors"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-[#1B2A6B] focus:ring-2 focus:ring-[#1B2A6B]/20 focus:bg-[#F5EBD3]/30 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>



                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-[#1B2A6B] to-[#2E3F8F] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:opacity-95 active:scale-98 disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Sign In</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleSignupSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Linus Torvalds"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-[#1B2A6B] focus:ring-2 focus:ring-[#1B2A6B]/20 focus:bg-[#F5EBD3]/30 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="linus@git.org"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-[#1B2A6B] focus:ring-2 focus:ring-[#1B2A6B]/20 focus:bg-[#F5EBD3]/30 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="•••••••• (Min 6 chars)"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-[#1B2A6B] focus:ring-2 focus:ring-[#1B2A6B]/20 focus:bg-[#F5EBD3]/30 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Confirm Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-[#1B2A6B] focus:ring-2 focus:ring-[#1B2A6B]/20 focus:bg-[#F5EBD3]/30 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="py-1">
                        <label className="flex items-start gap-2.5 text-xs text-slate-500 font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            className="rounded border-slate-200 text-[#1B2A6B] focus:ring-[#1B2A6B] w-4 h-4 mt-0.5 cursor-pointer"
                            required
                          />
                          <span className="leading-relaxed">
                            I agree to the <span className="text-slate-800 underline hover:text-[#1B2A6B]">Terms of Service</span> and <span className="text-slate-800 underline hover:text-[#1B2A6B]">Privacy Policy</span>.
                          </span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-[#1B2A6B] to-[#2E3F8F] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:opacity-95 active:scale-98 disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Create Account</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Divider */}
                  <div className="relative py-2 shrink-0">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 bg-white text-slate-400 font-bold tracking-wider uppercase text-[10px]">Or Continue With</span>
                    </div>
                  </div>

                  {/* Social OAuth */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSocialLogin("google")}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[#E8D9B8] hover:bg-[#F5EBD3]/30 text-slate-700 rounded-xl py-2.5 font-medium flex items-center justify-center gap-2 shadow-sm transition-all text-xs active:scale-98 select-none cursor-pointer"
                    >
                      <Chrome className="w-4 h-4 text-red-500" />
                      <span>Google</span>
                    </button>
                    <button
                      onClick={() => handleSocialLogin("github")}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[#E8D9B8] hover:bg-[#F5EBD3]/30 text-slate-700 rounded-xl py-2.5 font-medium flex items-center justify-center gap-2 shadow-sm transition-all text-xs active:scale-98 select-none cursor-pointer"
                    >
                      <Github className="w-4 h-4 text-slate-800" />
                      <span>GitHub</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Demo hint */}
            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                Demo Mode: Use <code className="bg-slate-100 px-1 py-0.5 rounded text-[#1B2A6B] font-mono">demo@example.com</code> / <code className="bg-slate-100 px-1 py-0.5 rounded text-[#1B2A6B] font-mono">password</code> for a quick tour. Any other email will use Supabase authentication or fall back to offline mode.
              </p>
            </div>
          </div>

          {/* Mobile footer */}
          <div className="md:hidden mt-4 text-center text-[11px] text-slate-400 font-medium">
            <span>&copy; {new Date().getFullYear()} RepoSense AI. All privileges preserved.</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

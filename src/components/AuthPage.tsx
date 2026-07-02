import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { 
  Sparkles, 
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
  Shield,
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
  
  // Custom screen states for Password Reset and Email Verification Simulation
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Auto focus input
  useEffect(() => {
    setErrorStr(null);
    setInfoStr(null);
  }, [activeTab, isForgotPassword]);

  // Handle Login submission
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
      // Support demo account as local fallback so the user is never stuck
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

      if (error) throw error;

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
      setErrorStr(err?.message || "An authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Signup submission
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

      if (error) throw error;

      if (data?.user) {
        // Direct seamless user session creation with zero onboarding block or email confirmation holding
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
      setErrorStr(err?.message || "Failed to finalize registration.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle social logins via real Supabase third-party providers
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
      // The browser will redirect to Supabase then back to the origin, 
      // which will then trigger our listener in App.tsx!
    } catch (err: any) {
      setErrorStr(err?.message || `Social login via ${provider} failed.`);
      setIsLoading(false);
    }
  };

  // Real forgot password request via Supabase
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
      setErrorStr(err?.message || "Failed to process recovery request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-page-root" className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-50 via-slate-100/60 to-purple-55/40">
      
      {/* FLOATING DECORATIONS */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none" />

      {/* TOP HEADER: Clean centered logo */}
      <div className="w-full max-w-[460px] mx-auto flex items-center justify-between z-10 shrink-0 mb-6">
        <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={onBackToLanding}>
          <img src="/logo.svg" alt="RepoSense AI" className="w-9 h-9 rounded-xl shadow-md shadow-purple-500/10" />
          <div>
            <h1 className="font-extrabold text-sm tracking-tight font-display text-slate-900">
              REPOSENSE AI
            </h1>
            <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase font-semibold">Workspace Auth</p>
          </div>
        </div>

        <button 
          onClick={onBackToLanding}
          className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200/80 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-98"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* CENTRAL HERO AUTHENTICATION MATRIX IN A BEAUTIFUL PROFESSIONAL CARD */}
      <div className="my-auto w-full max-w-[465px] mx-auto z-10 shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/30 p-6 sm:p-8 space-y-6">
          
          <AnimatePresence mode="wait">
            
            {isForgotPassword ? (
              
              /* SCREEN 2: FORGOT PASSWORD FORM */
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
                    className="text-xs font-semibold text-[#7C3AED] hover:text-[#5B21B6] transition-colors flex items-center gap-1 mb-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to login</span>
                  </button>
                  <h3 className="font-display font-black text-2xl text-slate-900 tracking-tight">Recover Credentials</h3>
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
                      <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="developers@org.com"
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#7C3AED] rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/10 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
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
              
              /* SCREEN 3: TABBED LOGIN & SIGNUP CAROUSEL */
              <motion.div
                key="auth-forms-holder"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Visual Tab Selector */}
                <div className="p-1.5 bg-slate-100 rounded-xl flex items-center border border-slate-200/40">
                  <button
                    onClick={() => setActiveTab("login")}
                    className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === "login"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setActiveTab("signup")}
                    className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === "signup"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    New Account
                  </button>
                </div>

                {/* Main titles and subtitles */}
                <div className="space-y-1.5 text-center sm:text-left">
                  {activeTab === "login" ? (
                    <>
                      <h3 className="font-display font-black text-2xl text-slate-900 tracking-tight">Welcome Back</h3>
                      <p className="text-slate-500 text-sm font-sans">Enter credentials or utilize OAuth to synthesize code reports.</p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-display font-black text-2xl text-slate-900 tracking-tight">Create Your Account</h3>
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

                {/* FORM IMPLEMENTATION */}
                {activeTab === "login" ? (
                  
                  /* A: LOGIN FORM */
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
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#7C3AED] rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
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
                          className="text-xs font-semibold text-[#7C3AED] hover:text-[#5B21B6] transition-colors"
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
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#7C3AED] rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
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

                    <div className="flex items-center justify-between py-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-slate-200 text-[#7C3AED] focus:ring-[#7C3AED] w-4 h-4 cursor-pointer"
                        />
                        <span>Remember Me</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      ) : (
                        <>
                          <span>Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  
                  /* B: SIGNUP FORM */
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
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#7C3AED] rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
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
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#7C3AED] rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
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
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#7C3AED] rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
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
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#7C3AED] rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
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
                          className="rounded border-slate-200 text-[#7C3AED] focus:ring-[#7C3AED] w-4.5 h-4.5 mt-0.5 cursor-pointer"
                          required
                        />
                        <span className="leading-relaxed">
                          I agree to the <span className="text-slate-800 underline hover:text-[#7C3AED]">Terms of Service</span> and <span className="text-slate-800 underline hover:text-[#7C3AED]">Privacy Policy</span>.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      ) : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Form separating line */}
                <div className="relative py-2 shrink-0">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-slate-405 font-bold tracking-wider uppercase text-[10px]">Or Continue With</span>
                  </div>
                </div>

                {/* Third-Party Social OAuth Matrix (Google / GitHub) */}
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    onClick={() => handleSocialLogin("google")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50/75 text-xs font-bold rounded-xl transition-all shadow-sm hover:border-slate-300 active:scale-98 select-none cursor-pointer"
                  >
                    <Chrome className="w-4.5 h-4.5 text-red-500" />
                    <span>Google</span>
                  </button>
                  <button
                    onClick={() => handleSocialLogin("github")}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50/75 text-xs font-bold rounded-xl transition-all shadow-sm hover:border-slate-300 active:scale-98 select-none cursor-pointer"
                  >
                    <Github className="w-4.5 h-4.5 text-slate-800" />
                    <span>GitHub</span>
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick instructions / sandbox hints */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
              🔑 Demo Mode: Use any email and password or standard OAuth buttons. Enter demo account <code className="bg-slate-100 p-0.5 rounded text-[#7C3AED] font-mono">demo@example.com</code> / <code className="bg-slate-100 p-0.5 rounded text-[#7C3AED] font-mono">password</code> to restore sessions!
            </p>
          </div>

        </div>
      </div>

      {/* Footer legalities */}
      <div className="w-full max-w-[460px] mx-auto pt-6 border-t border-slate-200/50 flex flex-col sm:flex-row justify-between text-[11px] text-slate-400 gap-2 shrink-0 z-10">
        <span>&copy; {new Date().getFullYear()} RepoSense AI. All privileges preserved.</span>
        <div className="flex gap-4">
          <span className="hover:text-slate-600 cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-slate-600 cursor-pointer transition-colors">Terms of Use</span>
        </div>
      </div>

    </div>
  );
}

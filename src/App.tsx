import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import AuthPage from "./components/AuthPage";
import { supabase } from "./lib/supabase";

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export default function App() {
  // Session persistence and state management
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("reposense_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [view, setView] = useState<"landing" | "auth" | "preparing" | "dashboard">(() => {
    try {
      const stored = localStorage.getItem("reposense_user");
      return stored ? "dashboard" : "landing";
    } catch {
      return "landing";
    }
  });

  const [initialUrl, setInitialUrl] = useState<string>("");
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");

  // Supabase Auth listener to handle redirects, email confirmations, or active user session restores
  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userEmail = session.user.email || "";
        const fullName = session.user.user_metadata?.full_name || userEmail.split("@")[0];
        const loggedInUser: User = {
          id: session.user.id,
          email: userEmail,
          fullName: fullName,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${session.user.id}`,
        };
        setUser(loggedInUser);
        localStorage.setItem("reposense_user", JSON.stringify(loggedInUser));
        if (view === "landing" || view === "auth") {
          setView("dashboard");
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userEmail = session.user.email || "";
        const fullName = session.user.user_metadata?.full_name || userEmail.split("@")[0];
        const loggedInUser: User = {
          id: session.user.id,
          email: userEmail,
          fullName: fullName,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${session.user.id}`,
        };
        setUser(loggedInUser);
        localStorage.setItem("reposense_user", JSON.stringify(loggedInUser));
        if (view === "landing" || view === "auth") {
          setView("dashboard");
        }
      } else {
        // Fallback: If it's a demo mode user, do not sign out
        const stored = localStorage.getItem("reposense_user");
        if (stored) {
          const parse = JSON.parse(stored);
          if (parse && parse.id && parse.id.startsWith("usr_demo")) {
            return;
          }
        }
        setUser(null);
        localStorage.removeItem("reposense_user");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // When user clicks Get Started
  const handleGetStarted = (url?: string) => {
    if (url) {
      setInitialUrl(url);
    } else {
      setInitialUrl("");
    }
    
    // If user is already logged in, skip auth and route straight to workspace dashboard
    if (user) {
      setView("dashboard");
    } else {
      setAuthTab("login");
      setView("auth");
    }
  };

  // When signup is specifically triggered (e.g. from call-to-actions)
  const handleGetStartedSignup = () => {
    setInitialUrl("");
    if (user) {
      setView("dashboard");
    } else {
      setAuthTab("signup");
      setView("auth");
    }
  };

  // Back to Landing requested from Auth form or logo click
  const handleBackToLanding = () => {
    setView("landing");
  };

  // Successful Login callback
  const handleLoginSuccess = (loggedInUser: User) => {
    try {
      localStorage.setItem("reposense_user", JSON.stringify(loggedInUser));
    } catch (e) {
      console.error("Failed to store user session:", e);
    }
    
    setUser(loggedInUser);
    setView("preparing");
    
    // Delay to let the loading screen do its magic
    setTimeout(() => {
      setView("dashboard");
    }, 2000);
  };

  // Logout request from sidebar
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Failed to sign out from Supabase:", e);
    }
    try {
      localStorage.removeItem("reposense_user");
      // Clean up old shared keys that are no longer used (pre-user-scoping)
      localStorage.removeItem("reposense_history");
      localStorage.removeItem("reposense_favorites");
    } catch (e) {
      console.error("Failed to remove user session:", e);
    }
    setUser(null);
    setInitialUrl("");
    setView("landing");
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {view === "landing" && (
          <motion.div
            key="landing-page-parent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <LandingPage onGetStarted={handleGetStarted} />
          </motion.div>
        )}

        {view === "auth" && (
          <motion.div
            key="auth-page-parent"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            <AuthPage 
              initialTab={authTab}
              onLoginSuccess={handleLoginSuccess} 
              onBackToLanding={handleBackToLanding} 
            />
          </motion.div>
        )}

        {view === "preparing" && (
          <motion.div
            key="preparing-page-parent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 bg-[#0A1628] flex flex-col items-center justify-center text-white z-50 overflow-hidden"
          >
            {/* Dark professional gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#0F2240] to-[#132D54]" />
            
            {/* Subtle radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(30,64,175,0.15)_0%,_transparent_70%)]" />

            {/* Content centered */}
            <div className="relative z-10 flex flex-col items-center px-6 text-center select-none w-full max-w-lg">
              {/* RepoSense Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-8"
              >
                <img src="/logo.svg" alt="RepoSense AI" className="w-16 h-16 rounded-2xl shadow-lg shadow-blue-500/20" />
              </motion.div>

              {/* Animated heading */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-white mb-4"
              >
                Preparing Your Workspace
                <span className="inline-flex w-12 text-left">
                  <span className="animate-[loadDot_1.4s_ease-in-out_0s_infinite]">.</span>
                  <span className="animate-[loadDot_1.4s_ease-in-out_0.2s_infinite]">.</span>
                  <span className="animate-[loadDot_1.4s_ease-in-out_0.4s_infinite]">.</span>
                </span>
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
                className="text-slate-400 text-sm leading-relaxed font-sans max-w-sm mb-10"
              >
                Authenticating credentials, loading profiles, and configuring analysis panels.
              </motion.p>

              {/* Progress bar */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0.8 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="w-64 sm:w-80"
              >
                <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden relative">
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(30,64,175,0.9), rgba(59,130,246,1), rgba(30,64,175,0.9), transparent)",
                      backgroundSize: "200% 100%",
                    }}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.8, ease: "easeInOut" }}
                  />
                </div>
                {/* Shimmer text */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.4 }}
                  className="mt-3 text-[11px] text-slate-500 font-mono tracking-widest uppercase animate-shimmer"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #475569 0%, #3B82F6 50%, #475569 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                    backgroundSize: "200% auto",
                  }}
                >
                  Loading
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {view === "dashboard" && (
          <motion.div
            key="dashboard-page-parent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Dashboard 
              initialUrl={initialUrl} 
              onLogout={handleLogout} 
              user={user}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

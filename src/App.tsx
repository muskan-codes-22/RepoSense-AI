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
            className="fixed inset-0 bg-[#0A0F2E] flex flex-col items-center justify-end text-white z-50 overflow-hidden"
          >
            {/* Background image with slow zoom */}
            <div className="absolute inset-0 animate-slow-zoom">
              <img
                src="/preparing-bg.jpg"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F2E] via-[#0A0F2E]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F2E]/40 via-transparent to-transparent" />

            {/* Content at bottom */}
            <div className="relative z-10 flex flex-col items-center pb-20 px-6 text-center select-none w-full max-w-lg">
              {/* Animated heading with glow */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-white animate-text-glow mb-3"
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
                transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
                className="text-slate-300/80 text-sm leading-relaxed font-sans max-w-sm mb-8"
              >
                Authenticating credentials, loading profiles, and configuring analysis panels.
              </motion.p>

              {/* Progress bar */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0.8 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="w-64 sm:w-80"
              >
                <div className="h-[3px] bg-white/10 rounded-full overflow-hidden relative">
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(27,42,107,0.8), rgba(46,63,143,1), rgba(27,42,107,0.8), transparent)",
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
                    backgroundImage: "linear-gradient(90deg, #6B6F80 0%, #2E3F8F 50%, #6B6F80 100%)",
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

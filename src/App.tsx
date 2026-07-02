import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";
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
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-[#040815] flex flex-col items-center justify-center text-white z-50 overflow-hidden"
          >
            {/* Ambient cyber grid in backdrop to fit style */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-30" />
            <div className="absolute bottom-[20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />

            <div className="relative flex flex-col items-center space-y-6 max-w-sm px-6 text-center select-none z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-white shadow-2xl shadow-purple-500/20 animate-bounce">
                <Sparkles className="w-8 h-8 fill-white/10" />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-xl tracking-tight text-white">Preparing Your Workspace...</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-sans max-w-xs">
                  Authenticating credentials, loading historical profiles, and configuring diagnostic analysis panels. See you inside!
                </p>
              </div>

              {/* Progress bar animated beautifully */}
              <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden relative">
                <motion.div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                />
              </div>
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

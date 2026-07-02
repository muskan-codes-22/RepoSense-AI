import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, X, Sparkles } from "lucide-react";

interface TooltipStep {
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
}

const STEPS: TooltipStep[] = [
  {
    target: '[data-tutorial="url-input"]',
    title: "Paste a GitHub URL",
    description: "Enter any GitHub repository URL here to get started with AI-powered analysis.",
    placement: "bottom",
  },
  {
    target: '[data-tutorial="analyze-btn"]',
    title: "Analyze the Repo",
    description: "Click Analyze and our AI will examine the repository structure, tech stack, and more.",
    placement: "bottom",
  },
  {
    target: '[data-tutorial="tab-history"]',
    title: "Your History",
    description: "All your past analyses are saved here. Access them anytime from the sidebar.",
    placement: "right",
  },
  {
    target: '[data-tutorial="tab-favorites"]',
    title: "Star Your Favorites",
    description: "Bookmark repositories you love. They'll appear in the Favorites tab for quick access.",
    placement: "right",
  },
  {
    target: '[data-tutorial="tab-help"]',
    title: "Need Help?",
    description: "Check the Help Center anytime for FAQs and guides on using RepoSense AI.",
    placement: "right",
  },
];

interface OnboardingTooltipProps {
  userId: string;
  onComplete: () => void;
}

export default function OnboardingTooltip({ userId, onComplete }: OnboardingTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = STEPS[currentStep];

  const findTarget = useCallback(() => {
    if (!step) return null;
    return document.querySelector(step.target) as HTMLElement | null;
  }, [step]);

  // Position the tooltip relative to the target element
  useEffect(() => {
    const updatePosition = () => {
      const el = findTarget();
      if (el) {
        // Scroll the target into view smoothly
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        // Wait for scroll to settle, then measure
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
          setIsVisible(true);
        }, 350);
      } else {
        // Target not found (e.g. on mobile sidebar) - skip to next step
        if (currentStep < STEPS.length - 1) {
          setCurrentStep((s) => s + 1);
        } else {
          onComplete();
        }
      }
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [currentStep, findTarget, onComplete]);

  // On mobile (< 768px), the sidebar is hidden by default, so tabs won't be found.
  // We detect this and open the sidebar, or skip tab steps on mobile.
  useEffect(() => {
    if (step && (step.target.includes("tab-history") || step.target.includes("tab-favorites") || step.target.includes("tab-help"))) {
      const el = findTarget();
      if (!el) {
        // Try opening mobile sidebar
        const sidebarBtn = document.querySelector('[data-tutorial="sidebar-toggle"]') as HTMLElement | null;
        if (sidebarBtn && window.innerWidth < 768) {
          sidebarBtn.click();
          setTimeout(() => {
            const retryEl = findTarget();
            if (retryEl) {
              retryEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
              setTimeout(() => {
                setTargetRect(retryEl.getBoundingClientRect());
                setIsVisible(true);
              }, 350);
            }
          }, 200);
        }
      }
    }
  }, [currentStep, step, findTarget]);

  const handleNext = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        localStorage.setItem("reposense_onboarded_" + userId, "true");
        onComplete();
      }
    }, 200);
  };

  const handleSkip = () => {
    localStorage.setItem("reposense_onboarded_" + userId, "true");
    setIsVisible(false);
    setTimeout(onComplete, 200);
  };

  if (!step || !targetRect) return null;

  const getTooltipPosition = () => {
    const gap = 12;
    const placement = step.placement || "bottom";

    switch (placement) {
      case "bottom":
        return {
          top: targetRect.bottom + gap,
          left: targetRect.left + targetRect.width / 2,
          transform: "translateX(-50%)",
        };
      case "top":
        return {
          top: targetRect.top - gap,
          left: targetRect.left + targetRect.width / 2,
          transform: "translateX(-50%) translateY(-100%)",
        };
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + gap,
          transform: "translateY(-50%)",
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - gap,
          transform: "translate(-100%, -50%)",
        };
    }
  };

  const pos = getTooltipPosition();

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop spotlight cutout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent 60px, rgba(0,0,0,0.5) 60px)`,
            }}
          />

          {/* Highlight ring around target */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[9999] pointer-events-none rounded-xl border-2 border-[#7C3AED] shadow-[0_0_0_4px_rgba(124,58,237,0.2)]"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
            }}
          />

          {/* Tooltip card */}
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed z-[10000] w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-300/40 p-5"
            style={{
              top: pos.top,
              left: pos.left,
              transform: pos.transform,
            }}
          >
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
              </div>
              <button
                onClick={handleSkip}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content */}
            <h4 className="font-display font-extrabold text-base text-slate-900 tracking-tight mb-1.5">
              {step.title}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              {step.description}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip Tour
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] text-white font-semibold text-xs rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all active:scale-95"
              >
                <span>{currentStep === STEPS.length - 1 ? "Get Started" : "Next"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Step dots */}
            <div className="flex justify-center gap-1.5 mt-4 pt-3 border-t border-slate-100">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentStep
                      ? "bg-[#7C3AED] w-4"
                      : i < currentStep
                      ? "bg-purple-300"
                      : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

# Plan: Fix Stage Progression — Advance One Step at a Time

## Problem
Backend fires all 4 stage events + start within ~0.5s. The old `scheduleStage` schedules independent `setTimeout` calls for each, all resolving at ~3s simultaneously → instant cascade to stage 5/6.

## Solution
Replace the independent-timeout `scheduleStage` with a **step-by-step advancement**. Backend events just set a `targetStage` — the frontend catches up one step at a time with a 3s gap between each.

## Code Change in `src/components/Dashboard.tsx`

Replace the block at ~line 471-493 (the `scheduleStage`/`showStage`/`clearAllTimers` definitions):

```typescript
    // Minimum 3s per stage, backend-driven. Backend events set a target;
    // frontend advances one step at a time, each waiting 3s from the previous.
    let currentStep = 0;
    let lastStageTime = Date.now();
    let targetStage = 0;
    let advanceTimer: ReturnType<typeof setTimeout> | null = null;
    const MIN_STAGE_MS = 3000;
    const tryAdvance = () => {
      if (advanceTimer) return;
      if (targetStage <= currentStep) return;
      const elapsed = Date.now() - lastStageTime;
      if (elapsed >= MIN_STAGE_MS) {
        currentStep++;
        setAnalysisStep(currentStep);
        lastStageTime = Date.now();
        tryAdvance();
      } else {
        advanceTimer = setTimeout(() => {
          advanceTimer = null;
          currentStep++;
          setAnalysisStep(currentStep);
          lastStageTime = Date.now();
          tryAdvance();
        }, MIN_STAGE_MS - elapsed);
      }
    };
    const scheduleStage = (step: number) => {
      targetStage = Math.max(targetStage, step);
      tryAdvance();
    };
    const clearAllTimers = () => {
      if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    };
```

The SSE event handlers (stage/start/chunk/done/error) and catch/finally blocks remain unchanged — they already call `scheduleStage()`, `clearAllTimers()` correctly.

## Expected Behavior
- Stage 1 appears immediately on first backend event
- 3s later → Stage 2
- 3s later → Stage 3
- 3s later → Stage 4
- 3s later → Stage 5 (AI insights, streams tokens)
- `done` event → Stage 6 (immediate)

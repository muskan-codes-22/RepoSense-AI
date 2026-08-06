# Fix: Report shown before stages 4-6 are displayed

## Problem
When `done` arrives, `scheduleStage(6)` starts the advancement chain, but `setActiveReport()` + `setActiveTab(SidebarTab.DASHBOARD)` execute immediately after — switching UI to dashboard before stages 4-6 get their 2s turns.

## Fix (2 changes in `src/components/Dashboard.tsx`)

### Change 1: Add `pendingReport` variable
After `clearAllTimers` definition (~line 493), add:
```typescript
let pendingReport: AnalysisReport | null = null;
```

### Change 2: Modify `tryAdvance` to process report at stage 6
In `tryAdvance()`, after `setAnalysisStep(currentStep)` for each advance, add a check:
```typescript
if (currentStep === 6 && pendingReport) {
  setActiveReport(pendingReport);
  saveToHistory(pendingReport);
  setActiveTab(SidebarTab.DASHBOARD);
  pendingReport = null;
}
```

### Change 3: Modify `done` handler
Replace lines 590-600:
```typescript
} else if (event.type === "done") {
  scheduleStage(6);
  const rawReport = event.report;
  pendingReport = {
    ...rawReport,
    id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    analyzedAt: rawReport.analyzedAt || new Date().toISOString(),
  };
```
Remove the `setActiveReport`, `saveToHistory`, `setActiveTab` calls from here — they now live in `tryAdvance`.

'use client';

/**
 * Main application page for CodeVision AI.
 * Single-page layout — all sections visible simultaneously.
 * Each section supports collapse/expand and maximize/restore.
 * Heavy components are lazy-loaded (React.lazy + Suspense) so they only
 * load when the section is first opened, reducing initial bundle size
 * and improving Time-to-Interactive.
 */
import { useState, useRef, useCallback, Suspense, lazy } from 'react';
import { useCodeVision } from '@/hooks/useCodeVision';
import { useTheme } from '@/hooks/useTheme';
import Sidebar from '@/components/ui/Sidebar';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import type { ActiveSection } from '@/types';

// --- Lazy-loaded heavy components (only fetched when section is first opened) ---
const CodeInput = lazy(() => import('@/components/code-editor/CodeInput'));
const ExplanationView = lazy(() => import('@/components/code-editor/ExplanationView'));
const OptimizationView = lazy(() => import('@/components/complexity/OptimizationView'));
const CodeAnimationPlayer = lazy(() => import('@/components/algorithm-animation/CodeAnimationPlayer'));
const CombinedAnimationPlayer = lazy(() => import('@/components/algorithm-animation/CombinedAnimationPlayer'));
const AnimationGenerator = lazy(() => import('@/components/algorithm-animation/AnimationGenerator'));
const StoryboardPlayer = lazy(() => import('@/components/storyboard/StoryboardPlayer'));
const ProblemInput = lazy(() => import('@/components/problem-solver/ProblemInput'));
const ProblemResultView = lazy(() => import('@/components/problem-solver/ProblemResultView'));
const DataStructurePlayground = lazy(() => import('@/components/data-structures/DataStructurePlayground'));
const LogicBuilder = lazy(() => import('@/components/logic-builder/LogicBuilder'));

/** Inline fallback spinner shown while a lazy component is loading */
function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-12 text-foreground/40">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mr-3" />
      Loading section...
    </div>
  );
}

export default function Home() {
  const state = useCodeVision();
  const { theme, toggleTheme } = useTheme();

  // Track which section is maximized (null = none)
  const [maximizedSection, setMaximizedSection] = useState<string | null>(null);

  // Refs for scrolling to sections
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sidebar click scrolls to the section instead of switching views
  const handleSectionChange = useCallback((section: ActiveSection) => {
    state.setActiveSection(section);
    // Restore from maximize when navigating
    setMaximizedSection(null);
    // Scroll to the section
    const ref = sectionRefs.current[section];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state]);

  // Assign a ref to a section div
  const setSectionRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left sidebar with theme toggle */}
      <Sidebar
        activeSection={state.activeSection}
        language={state.language}
        difficulty={state.difficulty}
        theme={theme}
        onSectionChange={handleSectionChange}
        onLanguageChange={state.setLanguage}
        onDifficultyChange={state.setDifficulty}
        onThemeToggle={toggleTheme}
      />

      {/* Main content area — single scrollable page with all sections */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-4">
          {/* Error banner */}
          {state.error && (
            <div className="mb-4">
              <ErrorBanner message={state.error} onDismiss={state.clearError} />
            </div>
          )}

          {/* Loading indicator (non-blocking — shown inline) */}
          {state.loading && <LoadingSpinner />}

          {/* ===== CODE INPUT — lazy-loaded, always visible at top ===== */}
          <div ref={setSectionRef('code-input')}>
            <CollapsibleSection
              title="Code Input"
              icon="📝"
              defaultOpen={true}
              sectionId="code-input"
              maximizedSection={maximizedSection}
              onMaximizeToggle={setMaximizedSection}
            >
              <Suspense fallback={<SectionLoader />}>
                <CodeInput
                  code={state.code}
                  language={state.language}
                  difficulty={state.difficulty}
                  loading={state.loading}
                  onCodeChange={state.setCode}
                  onAnalyze={state.analyzeCode}
                  onExplain={state.explainCode}
                  onOptimize={state.optimizeCode}
                  onAnimate={() => state.generateAnimation('auto_detect', undefined)}
                  onStoryboard={state.generateStoryboard}
                />
              </Suspense>
            </CollapsibleSection>
          </div>

          {/* ===== ANIMATION — lazy-loaded, shown when results exist ===== */}
          {state.animationResult && (
            <div ref={setSectionRef('animation')}>
              <CollapsibleSection
                title="Code Execution View"
                icon="▶"
                defaultOpen={true}
                sectionId="animation"
                maximizedSection={maximizedSection}
                onMaximizeToggle={setMaximizedSection}
              >
                {/* Show detected algorithm name and data structures */}
                {state.animationResult.algorithmName && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                      {state.animationResult.algorithmName}
                    </span>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(state.animationResult as any).codeAnalysis?.detectedDS?.map((ds: { key: string; label: string }) => (
                      <span key={ds.key} className="px-2 py-0.5 bg-surface-light text-foreground/60 text-[10px] font-mono rounded-full border border-border">
                        {ds.label}
                      </span>
                    ))}
                  </div>
                )}
                <Suspense fallback={<SectionLoader />}>
                  {/* Combined player for tree/linked-list/graph (multiple data structures), otherwise standard player */}
                  {state.animationResult.combined ? (
                    <CombinedAnimationPlayer result={state.animationResult} code={state.code || ''} />
                  ) : (
                    <CodeAnimationPlayer result={state.animationResult} code={state.code || ''} />
                  )}
                </Suspense>
              </CollapsibleSection>
            </div>
          )}

          {/* ===== EXPLANATION — lazy-loaded, shown when results exist ===== */}
          {state.explanationResult && (
            <div ref={setSectionRef('explanation')}>
              <CollapsibleSection
                title="Line-by-Line Explanation"
                icon="📖"
                defaultOpen={true}
                sectionId="explanation"
                maximizedSection={maximizedSection}
                onMaximizeToggle={setMaximizedSection}
              >
                <Suspense fallback={<SectionLoader />}>
                  <ExplanationView result={state.explanationResult} />
                </Suspense>
              </CollapsibleSection>
            </div>
          )}

          {/* ===== OPTIMIZATION — lazy-loaded, shown when results exist ===== */}
          {state.optimizationResult && (
            <div ref={setSectionRef('optimization')}>
              <CollapsibleSection
                title="Optimization Suggestions"
                icon="⚡"
                defaultOpen={true}
                sectionId="optimization"
                maximizedSection={maximizedSection}
                onMaximizeToggle={setMaximizedSection}
              >
                <Suspense fallback={<SectionLoader />}>
                  <OptimizationView
                    result={state.optimizationResult}
                    language={state.language}
                    originalCode={state.code}
                  />
                </Suspense>
              </CollapsibleSection>
            </div>
          )}

          {/* ===== PROBLEM SOLVER — lazy-loaded on expand ===== */}
          <div ref={setSectionRef('problem-input')}>
            <CollapsibleSection
              title="Problem Solver"
              icon="🧩"
              defaultOpen={false}
              sectionId="problem-input"
              maximizedSection={maximizedSection}
              onMaximizeToggle={setMaximizedSection}
            >
              <Suspense fallback={<SectionLoader />}>
                <ProblemInput
                  problem={state.problemStatement}
                  loading={state.loading}
                  onProblemChange={state.setProblemStatement}
                  onSolve={state.solveProblem}
                />
              </Suspense>
            </CollapsibleSection>
          </div>

          {/* Problem solution — lazy-loaded, shown when results exist */}
          {state.problemResult && (
            <div>
              <CollapsibleSection
                title="Solution"
                icon="💡"
                defaultOpen={true}
                sectionId="problem-solution"
                maximizedSection={maximizedSection}
                onMaximizeToggle={setMaximizedSection}
              >
                <Suspense fallback={<SectionLoader />}>
                  <ProblemResultView result={state.problemResult} language={state.language} />
                </Suspense>
              </CollapsibleSection>
            </div>
          )}

          {/* ===== ALGORITHM SELECTOR — lazy-loaded on expand ===== */}
          <div ref={setSectionRef('algorithm-selector')}>
            <CollapsibleSection
              title="Select Algorithm"
              icon="🎬"
              defaultOpen={!state.animationResult}
              sectionId="algorithm-selector"
              maximizedSection={maximizedSection}
              onMaximizeToggle={setMaximizedSection}
            >
              <Suspense fallback={<SectionLoader />}>
                <AnimationGenerator
                  onGenerate={state.generateAnimation}
                  loading={state.loading}
                />
              </Suspense>
            </CollapsibleSection>
          </div>

          {/* ===== STORYBOARD — lazy-loaded, shown when results exist ===== */}
          {state.storyboardResult && (
            <div ref={setSectionRef('storyboard')}>
              <CollapsibleSection
                title="Teaching Storyboard"
                icon="🎓"
                defaultOpen={true}
                sectionId="storyboard"
                maximizedSection={maximizedSection}
                onMaximizeToggle={setMaximizedSection}
              >
                <Suspense fallback={<SectionLoader />}>
                  <StoryboardPlayer result={state.storyboardResult} language={state.language} />
                </Suspense>
              </CollapsibleSection>
            </div>
          )}

          {/* ===== DATA STRUCTURE PLAYGROUND — lazy-loaded on expand ===== */}
          <div ref={setSectionRef('playground')}>
            <CollapsibleSection
              title="Data Structure Playground"
              icon="🔧"
              defaultOpen={false}
              sectionId="playground"
              maximizedSection={maximizedSection}
              onMaximizeToggle={setMaximizedSection}
            >
              <Suspense fallback={<SectionLoader />}>
                <DataStructurePlayground
                  language={state.language}
                  difficulty={state.difficulty}
                />
              </Suspense>
            </CollapsibleSection>
          </div>

          {/* ===== LOGIC BUILDER — lazy-loaded on expand ===== */}
          <div ref={setSectionRef('logic-builder')}>
            <CollapsibleSection
              title="Logic Builder"
              icon="🧱"
              defaultOpen={false}
              sectionId="logic-builder"
              maximizedSection={maximizedSection}
              onMaximizeToggle={setMaximizedSection}
            >
              <Suspense fallback={<SectionLoader />}>
                <LogicBuilder language={state.language} />
              </Suspense>
            </CollapsibleSection>
          </div>
        </div>
      </main>
    </div>
  );
}

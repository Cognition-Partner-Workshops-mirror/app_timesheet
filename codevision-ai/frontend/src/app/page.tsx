'use client';

/**
 * Main application page for CodeVision AI.
 * Single-page layout — all sections visible simultaneously.
 * Each section supports collapse/expand and maximize/restore.
 * When a section is maximized, others hide and it takes full width.
 * Sidebar navigates by scrolling to the section instead of switching views.
 */
import { useState, useRef, useCallback } from 'react';
import { useCodeVision } from '@/hooks/useCodeVision';
import { useTheme } from '@/hooks/useTheme';
import Sidebar from '@/components/ui/Sidebar';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import CodeInput from '@/components/code-editor/CodeInput';
import ExplanationView from '@/components/code-editor/ExplanationView';
import OptimizationView from '@/components/complexity/OptimizationView';
import CodeAnimationPlayer from '@/components/algorithm-animation/CodeAnimationPlayer';
import CombinedAnimationPlayer from '@/components/algorithm-animation/CombinedAnimationPlayer';
import AnimationGenerator from '@/components/algorithm-animation/AnimationGenerator';
import StoryboardPlayer from '@/components/storyboard/StoryboardPlayer';
import ProblemInput from '@/components/problem-solver/ProblemInput';
import ProblemResultView from '@/components/problem-solver/ProblemResultView';
import DataStructurePlayground from '@/components/data-structures/DataStructurePlayground';
import LogicBuilder from '@/components/logic-builder/LogicBuilder';
import type { ActiveSection } from '@/types';

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

          {/* ===== CODE INPUT — always visible at the top ===== */}
          <div ref={setSectionRef('code-input')}>
            <CollapsibleSection
              title="Code Input"
              icon="📝"
              defaultOpen={true}
              sectionId="code-input"
              maximizedSection={maximizedSection}
              onMaximizeToggle={setMaximizedSection}
            >
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
            </CollapsibleSection>
          </div>

          {/* ===== ANIMATION — shown below code when results exist (code may be empty when using algorithm selector) ===== */}
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
                {/* Use combined player for tree traversals (multiple data structures), otherwise standard player */}
                {state.animationResult.combined ? (
                  <CombinedAnimationPlayer result={state.animationResult} code={state.code || ''} />
                ) : (
                  <CodeAnimationPlayer result={state.animationResult} code={state.code || ''} />
                )}
              </CollapsibleSection>
            </div>
          )}

          {/* ===== EXPLANATION — shown when results exist ===== */}
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
                <ExplanationView result={state.explanationResult} />
              </CollapsibleSection>
            </div>
          )}

          {/* ===== OPTIMIZATION — shown when results exist ===== */}
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
                <OptimizationView
                  result={state.optimizationResult}
                  language={state.language}
                  originalCode={state.code}
                />
              </CollapsibleSection>
            </div>
          )}

          {/* ===== PROBLEM SOLVER — moved above algorithm selector ===== */}
          <div ref={setSectionRef('problem-input')}>
            <CollapsibleSection
              title="Problem Solver"
              icon="🧩"
              defaultOpen={false}
              sectionId="problem-input"
              maximizedSection={maximizedSection}
              onMaximizeToggle={setMaximizedSection}
            >
              <ProblemInput
                problem={state.problemStatement}
                loading={state.loading}
                onProblemChange={state.setProblemStatement}
                onSolve={state.solveProblem}
              />
            </CollapsibleSection>
          </div>

          {/* Problem solution — shown when results exist */}
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
                <ProblemResultView result={state.problemResult} language={state.language} />
              </CollapsibleSection>
            </div>
          )}

          {/* ===== ALGORITHM SELECTOR — now below problem solver ===== */}
          <div ref={setSectionRef('algorithm-selector')}>
            <CollapsibleSection
              title="Select Algorithm"
              icon="🎬"
              defaultOpen={!state.animationResult}
              sectionId="algorithm-selector"
              maximizedSection={maximizedSection}
              onMaximizeToggle={setMaximizedSection}
            >
              <AnimationGenerator
                onGenerate={state.generateAnimation}
                loading={state.loading}
              />
            </CollapsibleSection>
          </div>

          {/* ===== STORYBOARD — shown when results exist ===== */}
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
                <StoryboardPlayer result={state.storyboardResult} language={state.language} />
              </CollapsibleSection>
            </div>
          )}

          {/* ===== DATA STRUCTURE PLAYGROUND ===== */}
          <div ref={setSectionRef('playground')}>
            <CollapsibleSection
              title="Data Structure Playground"
              icon="🔧"
              defaultOpen={false}
              sectionId="playground"
              maximizedSection={maximizedSection}
              onMaximizeToggle={setMaximizedSection}
            >
              <DataStructurePlayground
                language={state.language}
                difficulty={state.difficulty}
              />
            </CollapsibleSection>
          </div>

          {/* ===== LOGIC BUILDER ===== */}
          <div ref={setSectionRef('logic-builder')}>
            <CollapsibleSection
              title="Logic Builder"
              icon="🧱"
              defaultOpen={false}
              sectionId="logic-builder"
              maximizedSection={maximizedSection}
              onMaximizeToggle={setMaximizedSection}
            >
              <LogicBuilder language={state.language} />
            </CollapsibleSection>
          </div>
        </div>
      </main>
    </div>
  );
}

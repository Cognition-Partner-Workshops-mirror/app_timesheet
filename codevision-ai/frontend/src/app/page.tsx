'use client';

/**
 * Main application page for CodeVision AI.
 * Orchestrates all sections: code input, problem solver, explanation,
 * optimization, animation, storyboard, playground, and logic builder.
 */
import { useCodeVision } from '@/hooks/useCodeVision';
import Sidebar from '@/components/ui/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import CodeInput from '@/components/code-editor/CodeInput';
import ExplanationView from '@/components/code-editor/ExplanationView';
import OptimizationView from '@/components/complexity/OptimizationView';
import AnimationPlayer from '@/components/algorithm-animation/AnimationPlayer';
import AnimationGenerator from '@/components/algorithm-animation/AnimationGenerator';
import StoryboardPlayer from '@/components/storyboard/StoryboardPlayer';
import ProblemInput from '@/components/problem-solver/ProblemInput';
import ProblemResultView from '@/components/problem-solver/ProblemResultView';
import DataStructurePlayground from '@/components/data-structures/DataStructurePlayground';
import LogicBuilder from '@/components/logic-builder/LogicBuilder';

export default function Home() {
  const state = useCodeVision();

  // Renders the active section based on sidebar selection
  const renderContent = () => {
    switch (state.activeSection) {
      case 'code-input':
        return (
          <CodeInput
            code={state.code}
            language={state.language}
            difficulty={state.difficulty}
            loading={state.loading}
            onCodeChange={state.setCode}
            onAnalyze={state.analyzeCode}
            onExplain={state.explainCode}
            onOptimize={state.optimizeCode}
            onAnimate={() => state.generateAnimation('auto_detect')}
            onStoryboard={state.generateStoryboard}
          />
        );

      case 'problem-input':
        return (
          <div className="space-y-6">
            <ProblemInput
              problem={state.problemStatement}
              loading={state.loading}
              onProblemChange={state.setProblemStatement}
              onSolve={state.solveProblem}
            />
            {state.problemResult && (
              <ProblemResultView result={state.problemResult} language={state.language} />
            )}
          </div>
        );

      case 'explanation':
        return state.explanationResult ? (
          <ExplanationView result={state.explanationResult} />
        ) : (
          <EmptyState
            title="No Explanation Yet"
            description="Enter code in the Code Input section and click 'Explain' to get a line-by-line explanation."
            onAction={() => state.setActiveSection('code-input')}
            actionLabel="Go to Code Input"
          />
        );

      case 'optimization':
        return state.optimizationResult ? (
          <OptimizationView
            result={state.optimizationResult}
            language={state.language}
            originalCode={state.code}
          />
        ) : (
          <EmptyState
            title="No Optimization Yet"
            description="Enter code in the Code Input section and click 'Optimize' to see optimization suggestions."
            onAction={() => state.setActiveSection('code-input')}
            actionLabel="Go to Code Input"
          />
        );

      case 'animation':
        return (
          <div className="space-y-6">
            <AnimationGenerator
              onGenerate={state.generateAnimation}
              loading={state.loading}
            />
            {state.animationResult && (
              <AnimationPlayer result={state.animationResult} />
            )}
          </div>
        );

      case 'storyboard':
        return state.storyboardResult ? (
          <StoryboardPlayer result={state.storyboardResult} />
        ) : (
          <EmptyState
            title="No Storyboard Yet"
            description="Enter code in the Code Input section and click 'Storyboard' to generate a teaching presentation."
            onAction={() => state.setActiveSection('code-input')}
            actionLabel="Go to Code Input"
          />
        );

      case 'playground':
        return (
          <DataStructurePlayground
            language={state.language}
            difficulty={state.difficulty}
          />
        );

      case 'logic-builder':
        return <LogicBuilder language={state.language} />;

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left sidebar navigation */}
      <Sidebar
        activeSection={state.activeSection}
        language={state.language}
        difficulty={state.difficulty}
        onSectionChange={state.setActiveSection}
        onLanguageChange={state.setLanguage}
        onDifficultyChange={state.setDifficulty}
      />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {/* Error banner - shown at top when errors occur */}
          {state.error && (
            <div className="mb-4">
              <ErrorBanner message={state.error} onDismiss={state.clearError} />
            </div>
          )}

          {/* Loading overlay */}
          {state.loading && <LoadingSpinner />}

          {/* Active section content */}
          {!state.loading && renderContent()}
        </div>
      </main>
    </div>
  );
}

/**
 * Empty state placeholder shown when a section has no data yet.
 * Guides users to the appropriate input section.
 */
function EmptyState({
  title,
  description,
  onAction,
  actionLabel,
}: {
  title: string;
  description: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-surface-light rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl text-foreground/20">💡</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground/60 mb-2">{title}</h3>
      <p className="text-sm text-foreground/40 max-w-md mb-4">{description}</p>
      <button
        onClick={onAction}
        className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-medium transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  );
}

'use client';

/**
 * Code-based animation player.
 * User enters code, and the player highlights the currently executing line
 * with step-by-step explanations below the code view.
 * Also shows data state visualization (array bars) alongside the code.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnimationResult, AnimationStep } from '@/types';

interface CodeAnimationPlayerProps {
  result: AnimationResult;
  code: string;
}

// Speed presets in milliseconds between steps
const SPEED_OPTIONS = [
  { label: '0.5x', ms: 2000 },
  { label: '1x', ms: 1000 },
  { label: '1.5x', ms: 667 },
  { label: '2x', ms: 500 },
];

export default function CodeAnimationPlayer({ result, code }: CodeAnimationPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = result.steps.length;
  const step: AnimationStep | undefined = result.steps[currentStep];
  const elements = step?.state?.elements ?? result.initialState.elements;
  const codeLines = code.split('\n');

  // Determine which line is currently executing based on step description
  const executingLine = getExecutingLine(step, codeLines);

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, SPEED_OPTIONS[speedIndex].ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speedIndex, totalSteps]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const nextStep = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);
  const prevStep = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  // Bar visualization values
  const numericElements = elements.map(e => typeof e === 'number' ? e : 0);
  const maxVal = Math.max(...numericElements, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Two-column layout: code on left, visualization on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code panel with line highlighting */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="bg-surface-light px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold text-foreground/60 uppercase">Code Execution</span>
          </div>
          <div className="p-0 font-mono text-sm overflow-x-auto max-h-[400px] overflow-y-auto">
            {codeLines.map((line, i) => {
              const lineNum = i + 1;
              const isExecuting = executingLine === lineNum;
              return (
                <div
                  key={i}
                  className={`flex items-stretch border-l-3 transition-all duration-300 ${
                    isExecuting
                      ? 'bg-primary/10 border-l-primary'
                      : 'border-l-transparent hover:bg-surface-light/50'
                  }`}
                >
                  {/* Line number */}
                  <span className={`w-10 flex-shrink-0 text-right pr-3 py-1 text-xs select-none ${
                    isExecuting ? 'text-primary font-bold' : 'text-foreground/30'
                  }`}>
                    {lineNum}
                  </span>
                  {/* Code content */}
                  <span className={`py-1 pl-3 pr-4 whitespace-pre ${
                    isExecuting ? 'text-foreground font-medium' : 'text-foreground/70'
                  }`}>
                    {line || ' '}
                  </span>
                  {/* Executing indicator */}
                  {isExecuting && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-auto pr-3 py-1 text-xs text-primary font-semibold"
                    >
                      ◀ executing
                    </motion.span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Data visualization panel */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="bg-surface-light px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold text-foreground/60 uppercase">
              {result.algorithmName} — Data State
            </span>
          </div>
          <div className="p-4 min-h-[200px] flex items-end justify-center gap-2">
            <AnimatePresence mode="popLayout">
              {elements.map((element, i) => {
                const numVal = typeof element === 'number' ? element : 0;
                const height = Math.max((numVal / maxVal) * 180, 20);
                const isHighlighted = step?.highlightIndices?.includes(i);
                const isActive = step?.activeElements?.includes(i);

                return (
                  <motion.div
                    key={`${i}-${element}`}
                    layout
                    animate={{
                      height,
                      backgroundColor: isActive
                        ? '#dc2626'
                        : isHighlighted
                          ? '#6366f1'
                          : '#cbd5e1',
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="relative flex flex-col items-center justify-end rounded-t-md min-w-[36px]"
                    style={{ height }}
                  >
                    <span className={`text-xs font-mono font-bold mb-1 ${
                      isActive || isHighlighted ? 'text-white' : 'text-foreground/70'
                    }`}>
                      {element}
                    </span>
                    <span className="absolute -bottom-5 text-[10px] text-foreground/40">
                      [{i}]
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Variable state display */}
          {step?.state?.variables && Object.keys(step.state.variables).length > 0 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {Object.entries(step.state.variables).map(([key, val]) => (
                <span key={key} className="px-2 py-1 bg-surface-light border border-border rounded text-xs font-mono">
                  <span className="text-secondary">{key}</span>
                  <span className="text-foreground/40"> = </span>
                  <span className="text-accent">{String(val)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Explanation under the animation */}
      {step && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded uppercase">{step.operation}</span>
            <span className="text-xs text-foreground/50">Step {step.stepNumber} of {totalSteps}</span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{step.explanation || step.description}</p>
        </div>
      )}

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-3 bg-surface border border-border rounded-xl px-4 py-3">
        <button onClick={reset} className="p-2 hover:bg-surface-light rounded-lg text-foreground/50 hover:text-foreground transition-colors" title="Reset">⏮</button>
        <button onClick={prevStep} disabled={currentStep === 0} className="p-2 hover:bg-surface-light rounded-lg text-foreground/50 hover:text-foreground transition-colors disabled:opacity-30" title="Previous step">⏪</button>
        <button
          onClick={isPlaying ? pause : play}
          className="px-5 py-2 bg-primary hover:bg-primary-light text-white rounded-lg font-medium transition-colors"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={nextStep} disabled={currentStep >= totalSteps - 1} className="p-2 hover:bg-surface-light rounded-lg text-foreground/50 hover:text-foreground transition-colors disabled:opacity-30" title="Next step">⏩</button>

        <div className="ml-4 flex items-center gap-2">
          <span className="text-xs text-foreground/40">Speed:</span>
          {SPEED_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setSpeedIndex(i)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                speedIndex === i ? 'bg-primary text-white' : 'bg-surface-light text-foreground/60 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-light rounded-full h-1.5">
        <motion.div
          className="bg-primary h-1.5 rounded-full"
          animate={{ width: `${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Complexity info */}
      {result.complexity && (
        <div className="flex gap-4">
          <div className="bg-surface border border-border rounded-xl px-4 py-2">
            <span className="text-xs text-foreground/50">Time Complexity</span>
            <p className="text-sm font-mono text-accent font-semibold">{result.complexity.time}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl px-4 py-2">
            <span className="text-xs text-foreground/50">Space Complexity</span>
            <p className="text-sm font-mono text-accent font-semibold">{result.complexity.space}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Heuristic to determine which code line is currently executing.
 * Maps step operations/descriptions to likely code line numbers.
 */
function getExecutingLine(step: AnimationStep | undefined, codeLines: string[]): number | null {
  if (!step) return null;
  const desc = (step.description || step.explanation || '').toLowerCase();
  const op = step.operation;

  // Try to find line by matching keywords in the description to code content
  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i].trim().toLowerCase();
    if (!line) continue;

    // Match swap operations to swap lines
    if ((op === 'swap' || desc.includes('swap')) && (line.includes('swap') || line.includes(', arr[') || line.includes('= arr['))) {
      return i + 1;
    }
    // Match compare operations to comparison lines
    if ((op === 'compare' || desc.includes('compare')) && (line.includes('if ') || line.includes('>') || line.includes('<'))) {
      return i + 1;
    }
    // Match loop operations
    if ((desc.includes('pass') || desc.includes('iterate') || op === 'sorted') && line.includes('for ')) {
      return i + 1;
    }
  }

  // Fallback: cycle through lines based on step number
  if (codeLines.length > 0) {
    const nonEmptyLines = codeLines.map((l, i) => ({ line: l, num: i + 1 })).filter(l => l.line.trim());
    if (nonEmptyLines.length > 0) {
      return nonEmptyLines[step.stepNumber % nonEmptyLines.length].num;
    }
  }
  return null;
}

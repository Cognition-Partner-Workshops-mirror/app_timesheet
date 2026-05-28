'use client';

/**
 * Algorithm animation player with SVG-based visualization.
 * Supports play, pause, step forward/backward, and speed controls.
 * Renders array elements as animated bars with highlighting.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnimationResult, AnimationStep } from '@/types';

interface AnimationPlayerProps {
  result: AnimationResult;
}

// Speed presets in milliseconds between steps
const SPEED_OPTIONS = [
  { label: '0.5x', ms: 2000 },
  { label: '1x', ms: 1000 },
  { label: '1.5x', ms: 667 },
  { label: '2x', ms: 500 },
];

export default function AnimationPlayer({ result }: AnimationPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = result.steps.length;
  const step: AnimationStep | undefined = result.steps[currentStep];
  const elements = step?.state?.elements ?? result.initialState.elements;

  // Handle play/pause auto-advance via interval.
  // totalSteps is included in deps so the interval restarts if it changes.
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

  // Calculate max value for bar height normalization
  const numericElements = elements.map(e => typeof e === 'number' ? e : 0);
  const maxVal = Math.max(...numericElements, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">{result.algorithmName}</h2>
        <p className="text-sm text-foreground/60">{result.description}</p>
      </div>

      {/* SVG visualization area - renders array elements as animated bars */}
      <div className="bg-surface border border-border rounded-lg p-6 min-h-[300px] flex items-end justify-center gap-2">
        <AnimatePresence mode="popLayout">
          {elements.map((element, i) => {
            const numVal = typeof element === 'number' ? element : 0;
            const height = Math.max((numVal / maxVal) * 220, 20);
            const isHighlighted = step?.highlightIndices?.includes(i);
            const isActive = step?.activeElements?.includes(i);

            return (
              <motion.div
                key={`${i}-${element}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  height,
                  backgroundColor: isActive
                    ? '#dc2626'
                    : isHighlighted
                      ? '#6366f1'
                      : '#cbd5e1',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative flex flex-col items-center justify-end rounded-t-md min-w-[40px]"
                style={{ height }}
              >
                {/* Element value label */}
                <span className={`text-xs font-mono font-bold mb-1 ${
                  isActive || isHighlighted ? 'text-white' : 'text-foreground/70'
                }`}>
                  {element}
                </span>
                {/* Index label below the bar */}
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
        <div className="flex flex-wrap gap-2">
          {Object.entries(step.state.variables).map(([key, val]) => (
            <span key={key} className="px-2 py-1 bg-surface-light border border-border rounded text-xs font-mono">
              <span className="text-secondary">{key}</span>
              <span className="text-foreground/40"> = </span>
              <span className="text-accent">{String(val)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Step explanation */}
      {step && (
        <div className="bg-surface-light border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-primary-light uppercase">{step.operation}</span>
            <span className="text-xs text-foreground/40">Step {step.stepNumber} of {totalSteps}</span>
          </div>
          <p className="text-sm text-foreground/80">{step.explanation || step.description}</p>
        </div>
      )}

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-3 bg-surface border border-border rounded-lg px-4 py-3">
        <button onClick={reset} className="p-2 hover:bg-surface-light rounded-lg text-foreground/60 hover:text-foreground transition-colors" title="Reset">
          ⏮
        </button>
        <button onClick={prevStep} disabled={currentStep === 0} className="p-2 hover:bg-surface-light rounded-lg text-foreground/60 hover:text-foreground transition-colors disabled:opacity-30" title="Previous step">
          ⏪
        </button>
        <button
          onClick={isPlaying ? pause : play}
          className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg font-medium transition-colors"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={nextStep} disabled={currentStep >= totalSteps - 1} className="p-2 hover:bg-surface-light rounded-lg text-foreground/60 hover:text-foreground transition-colors disabled:opacity-30" title="Next step">
          ⏩
        </button>

        {/* Speed control */}
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
      <div className="flex gap-4">
        <div className="bg-surface border border-border rounded-lg px-4 py-2">
          <span className="text-xs text-foreground/50">Time Complexity</span>
          <p className="text-sm font-mono text-accent">{result.complexity.time}</p>
        </div>
        <div className="bg-surface border border-border rounded-lg px-4 py-2">
          <span className="text-xs text-foreground/50">Space Complexity</span>
          <p className="text-sm font-mono text-accent">{result.complexity.space}</p>
        </div>
      </div>
    </motion.div>
  );
}

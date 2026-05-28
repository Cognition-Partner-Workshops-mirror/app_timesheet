'use client';

/**
 * Combined data structure animation player.
 * Renders multiple data structures (Tree, Stack, ArrayList) side by side.
 * Each structure updates simultaneously at every animation step.
 * Used for algorithms that involve multiple data structures (e.g., tree inorder traversal).
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnimationResult, AnimationStep } from '@/types';

interface CombinedAnimationPlayerProps {
  result: AnimationResult;
  code: string;
}

// Speed presets
const SPEED_OPTIONS = [
  { label: '0.5x', ms: 2000 },
  { label: '1x', ms: 1000 },
  { label: '1.5x', ms: 667 },
  { label: '2x', ms: 500 },
];

// Extended step type with dataStructures field — supports tree, stack, linked list,
// graph, map, set, array with pointers, and more.
interface CombinedStep extends AnimationStep {
  dataStructures?: {
    tree?: { nodes: number[]; highlighted: number[]; label: string };
    stack?: { elements: number[]; highlighted: number[]; label: string };
    resultList?: { elements: (number | string)[]; highlighted: number[]; label: string };
    linkedList?: {
      nodes: Array<{ val: number; nextIdx: number }>;
      highlighted: number[];
      pointers: { curr: number; prev: number; temp: number };
      label: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pointerState?: Record<string, any> & { label: string };
    graph?: { nodes: number; edges: number[][]; highlighted: number[]; label: string };
    queue?: { elements: number[]; highlighted: number[]; label: string };
    set?: { elements: (number | string)[]; highlighted: number[]; label: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map?: { entries: Record<string, any>; highlighted: string[]; label: string };
    array?: { elements: (number | string)[]; highlighted: number[]; label: string };
  };
}

export default function CombinedAnimationPlayer({ result, code }: CombinedAnimationPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = result.steps.length;
  const step = result.steps[currentStep] as CombinedStep | undefined;
  const codeLines = code.split('\n');
  const executingLine = step?.codeLineHighlight ?? null;

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

  // Extract data structures state from current step
  const ds = step?.dataStructures;
  const treeData = ds?.tree;
  const stackData = ds?.stack;
  const resultData = ds?.resultList;
  const linkedListData = ds?.linkedList;
  const pointerData = ds?.pointerState;
  const graphData = ds?.graph;
  const queueData = ds?.queue;
  const setData = ds?.set;
  const mapData = ds?.map;
  const arrayData = ds?.array;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Code panel with line highlighting */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="bg-surface-light px-4 py-2 border-b border-border">
          <span className="text-xs font-semibold text-foreground/60 uppercase">Code Execution</span>
        </div>
        <div className="p-0 font-mono text-sm overflow-x-auto max-h-[300px] overflow-y-auto">
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
                <span className={`w-10 flex-shrink-0 text-right pr-3 py-1 text-xs select-none ${
                  isExecuting ? 'text-primary font-bold' : 'text-foreground/30'
                }`}>
                  {lineNum}
                </span>
                <span className={`py-1 pl-3 pr-4 whitespace-pre ${
                  isExecuting ? 'text-foreground font-medium' : 'text-foreground/70'
                }`}>
                  {line || ' '}
                </span>
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

      {/* Linked list visualization (full width, shown for linked list algorithms) */}
      {linkedListData && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="bg-blue-500/10 px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
              🔗 {linkedListData.label}
            </span>
          </div>
          <div className="p-4 min-h-[120px] overflow-x-auto">
            <LinkedListVisualization
              nodes={linkedListData.nodes}
              highlighted={linkedListData.highlighted}
              pointers={linkedListData.pointers}
            />
          </div>
        </div>
      )}

      {/* Pointer state + result side by side (for linked list algorithms) */}
      {(pointerData || (linkedListData && resultData)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Pointer variables panel */}
          {pointerData && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="bg-violet-500/10 px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase">
                  🎯 {pointerData.label}
                </span>
              </div>
              <div className="p-3 min-h-[80px] flex flex-wrap gap-3 items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-1 px-4 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20"
                >
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">curr</span>
                  <span className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                    {String(pointerData.curr)}
                  </span>
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="flex flex-col items-center gap-1 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20"
                >
                  <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase">prev</span>
                  <span className="text-lg font-mono font-bold text-red-600 dark:text-red-400">
                    {String(pointerData.prev)}
                  </span>
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex flex-col items-center gap-1 px-4 py-2 bg-amber-500/10 rounded-lg border border-amber-500/20"
                >
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">temp</span>
                  <span className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                    {String(pointerData.temp)}
                  </span>
                </motion.div>
              </div>
            </div>
          )}

          {/* Result list (reversed portion) for linked list algorithms */}
          {linkedListData && resultData && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="bg-emerald-500/10 px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                  📋 {resultData.label}
                </span>
              </div>
              <div className="p-3 min-h-[80px]">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <AnimatePresence mode="popLayout">
                    {resultData.elements.length === 0 ? (
                      <span className="text-xs text-foreground/30 italic">Empty</span>
                    ) : (
                      resultData.elements.map((el, idx) => {
                        const isHighlighted = resultData.highlighted?.includes(idx);
                        return (
                          <motion.div
                            key={`ll-result-${idx}`}
                            initial={{ opacity: 0, scale: 0.5, y: 10 }}
                            animate={{
                              opacity: 1, scale: 1, y: 0,
                              backgroundColor: isHighlighted ? '#10b981' : 'var(--surface-light)',
                            }}
                            transition={{ duration: 0.3 }}
                            className="px-3 py-2 rounded-lg border border-border text-sm font-mono font-bold"
                            style={{ color: isHighlighted ? '#ffffff' : 'var(--foreground)' }}
                          >
                            {String(el)}
                            {idx < resultData.elements.length - 1 && (
                              <span className="text-foreground/30 ml-1">→</span>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                    {resultData.elements.length > 0 && (
                      <span className="text-xs text-foreground/30 font-mono">→ null</span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Graph visualization (for BFS/DFS) */}
      {graphData && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="bg-cyan-500/10 px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase">
              🔀 {graphData.label}
            </span>
          </div>
          <div className="p-4 min-h-[160px]">
            <GraphVisualization nodes={graphData.nodes} edges={graphData.edges} highlighted={graphData.highlighted} />
          </div>
        </div>
      )}

      {/* Array visualization with highlighted indices (for DP, sliding window, two-pointer) */}
      {arrayData && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="bg-indigo-500/10 px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
              📊 {arrayData.label}
            </span>
          </div>
          <div className="p-3 min-h-[60px]">
            <div className="flex flex-wrap gap-1">
              {arrayData.elements.map((el, idx) => {
                const isHigh = arrayData.highlighted?.includes(idx);
                return (
                  <motion.div
                    key={`arr-${idx}`}
                    animate={{
                      backgroundColor: isHigh ? '#6366f1' : 'var(--surface-light)',
                      scale: isHigh ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                    className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-mono font-bold min-w-[36px] text-center"
                    style={{ color: isHigh ? '#ffffff' : 'var(--foreground)' }}
                  >
                    {String(el)}
                    <div className="text-[9px] opacity-50">[{idx}]</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Generic pointer state panel (for two-pointer, sliding window, etc.) — when not linked list */}
      {pointerData && !linkedListData && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="bg-violet-500/10 px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase">
              🎯 {pointerData.label}
            </span>
          </div>
          <div className="p-3 flex flex-wrap gap-3 items-center justify-center">
            {Object.entries(pointerData).filter(([k]) => k !== 'label').map(([key, val]) => (
              <motion.div
                key={`ptr-${key}`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-1 px-3 py-2 bg-violet-500/10 rounded-lg border border-violet-500/20"
              >
                <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase">{key}</span>
                <span className="text-sm font-mono font-bold text-violet-600 dark:text-violet-400">
                  {String(val)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Flexible DS grid: graph queue/set/map + resultList */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Queue visualization (for BFS) */}
        {queueData && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="bg-orange-500/10 px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase">
                📥 {queueData.label}
              </span>
            </div>
            <div className="p-3 min-h-[100px]">
              <div className="flex flex-wrap gap-1">
                <AnimatePresence mode="popLayout">
                  {queueData.elements.length === 0 ? (
                    <span className="text-xs text-foreground/30 italic">Empty</span>
                  ) : (
                    queueData.elements.map((el, idx) => {
                      const isHigh = queueData.highlighted?.includes(idx);
                      const isFront = idx === 0;
                      return (
                        <motion.div
                          key={`q-${idx}-${el}`}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0, backgroundColor: isHigh ? '#f97316' : isFront ? '#fb923c' : 'var(--surface-light)' }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.3 }}
                          className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-mono font-bold"
                          style={{ color: isHigh || isFront ? '#ffffff' : 'var(--foreground)' }}
                        >
                          {el}{isFront && <span className="text-[9px] ml-1 opacity-70">←front</span>}
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Set visualization */}
        {setData && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="bg-teal-500/10 px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase">
                🔹 {setData.label}
              </span>
            </div>
            <div className="p-3 min-h-[100px]">
              <div className="flex flex-wrap gap-1">
                <AnimatePresence mode="popLayout">
                  {setData.elements.length === 0 ? (
                    <span className="text-xs text-foreground/30 italic">Empty</span>
                  ) : (
                    setData.elements.map((el, idx) => {
                      const isHigh = setData.highlighted?.includes(idx);
                      return (
                        <motion.div
                          key={`set-${idx}-${el}`}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1, backgroundColor: isHigh ? '#14b8a6' : 'var(--surface-light)' }}
                          transition={{ duration: 0.3 }}
                          className="px-2.5 py-1.5 rounded-full border border-border text-xs font-mono font-bold"
                          style={{ color: isHigh ? '#ffffff' : 'var(--foreground)' }}
                        >
                          {String(el)}
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* HashMap visualization */}
        {mapData && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="bg-pink-500/10 px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase">
                🗂 {mapData.label}
              </span>
            </div>
            <div className="p-3 min-h-[100px]">
              <div className="flex flex-wrap gap-1">
                <AnimatePresence mode="popLayout">
                  {Object.keys(mapData.entries).length === 0 ? (
                    <span className="text-xs text-foreground/30 italic">Empty</span>
                  ) : (
                    Object.entries(mapData.entries).map(([key, val], idx) => {
                      const isHigh = mapData.highlighted?.includes(key);
                      return (
                        <motion.div
                          key={`map-${key}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1, backgroundColor: isHigh ? '#ec4899' : 'var(--surface-light)' }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border text-xs font-mono"
                          style={{ color: isHigh ? '#ffffff' : 'var(--foreground)' }}
                        >
                          <span className="font-bold">{key}</span>
                          <span className="opacity-50">→</span>
                          <span className="font-bold">{String(val)}</span>
                          <span className="text-[9px] opacity-40">[{idx}]</span>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Result list — shared across all combined animations (when not tree or linked list specific) */}
        {resultData && !linkedListData && !treeData && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="bg-emerald-500/10 px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                📋 {resultData.label}
              </span>
            </div>
            <div className="p-3 min-h-[100px]">
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence mode="popLayout">
                  {resultData.elements.length === 0 ? (
                    <span className="text-xs text-foreground/30 italic">Empty</span>
                  ) : (
                    resultData.elements.map((el, idx) => {
                      const isHigh = resultData.highlighted?.includes(idx);
                      return (
                        <motion.div
                          key={`res-${idx}`}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1, backgroundColor: isHigh ? '#10b981' : 'var(--surface-light)' }}
                          transition={{ duration: 0.3 }}
                          className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-mono font-bold"
                          style={{ color: isHigh ? '#ffffff' : 'var(--foreground)' }}
                        >
                          {String(el)}
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Three data structures side by side (for tree traversals) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tree visualization */}
        {treeData && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="bg-indigo-500/10 px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                🌳 {treeData.label}
              </span>
            </div>
            <div className="p-3 min-h-[180px]">
              <TreeVisualization nodes={treeData.nodes} highlighted={treeData.highlighted} />
            </div>
          </div>
        )}

        {/* Stack visualization */}
        {stackData && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="bg-amber-500/10 px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
                📚 {stackData.label}
              </span>
            </div>
            <div className="p-3 min-h-[180px] flex flex-col-reverse items-center gap-1">
              <AnimatePresence mode="popLayout">
                {stackData.elements.length === 0 ? (
                  <span className="text-xs text-foreground/30 italic">Empty</span>
                ) : (
                  stackData.elements.map((el, idx) => {
                    const isHighlighted = stackData.highlighted?.includes(idx);
                    const isTop = idx === stackData.elements.length - 1;
                    return (
                      <motion.div
                        key={`stack-${idx}-${el}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          backgroundColor: isHighlighted ? '#6366f1' : isTop ? '#f59e0b' : 'var(--surface-light)',
                        }}
                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-[120px] px-3 py-2 rounded-lg border border-border text-center text-sm font-mono font-bold"
                        style={{
                          color: isHighlighted || isTop ? '#ffffff' : 'var(--foreground)',
                        }}
                      >
                        {el}
                        {isTop && <span className="text-[10px] ml-1 opacity-70">← top</span>}
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Result ArrayList visualization (only for tree traversals — others use the flexible grid) */}
        {resultData && !linkedListData && treeData && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="bg-emerald-500/10 px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                📋 {resultData.label}
              </span>
            </div>
            <div className="p-3 min-h-[180px]">
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence mode="popLayout">
                  {resultData.elements.length === 0 ? (
                    <span className="text-xs text-foreground/30 italic">Empty</span>
                  ) : (
                    resultData.elements.map((el, idx) => {
                      const isHighlighted = resultData.highlighted?.includes(idx);
                      return (
                        <motion.div
                          key={`result-${idx}`}
                          initial={{ opacity: 0, scale: 0.5, y: 10 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            backgroundColor: isHighlighted ? '#10b981' : 'var(--surface-light)',
                          }}
                          transition={{ duration: 0.3 }}
                          className="px-3 py-2 rounded-lg border border-border text-sm font-mono font-bold"
                          style={{
                            color: isHighlighted ? '#ffffff' : 'var(--foreground)',
                          }}
                        >
                          {el}
                          <span className="text-[10px] text-foreground/30 ml-0.5">[{idx}]</span>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step description */}
      {step && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase ${
              step.operation === 'push' ? 'bg-amber-500/10 text-amber-600' :
              step.operation === 'pop' ? 'bg-red-500/10 text-red-600' :
              step.operation === 'add_result' ? 'bg-emerald-500/10 text-emerald-600' :
              step.operation === 'visit' ? 'bg-indigo-500/10 text-indigo-600' :
              step.operation === 'reverse_link' ? 'bg-red-500/10 text-red-600' :
              step.operation === 'assign' ? 'bg-amber-500/10 text-amber-600' :
              step.operation === 'move_prev' ? 'bg-red-500/10 text-red-600' :
              step.operation === 'move_curr' ? 'bg-blue-500/10 text-blue-600' :
              'bg-primary/10 text-primary'
            }`}>
              {step.operation}
            </span>
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

      {/* Detailed Complexity Analysis */}
      {result.complexity && (
        <ComplexityExplainer complexity={result.complexity} />
      )}
    </motion.div>
  );
}

/**
 * Detailed complexity breakdown component.
 * Shows time/space with best/worst/avg cases, explanations, and analogy.
 * Collapsible to keep the UI clean.
 */
function ComplexityExplainer({ complexity }: { complexity: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = complexity.timeExplain || complexity.best || complexity.analogy;

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header row: always visible */}
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-surface-light/50 transition-colors"
      >
        {/* Time complexity badge */}
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-foreground/40 uppercase font-semibold">Time</span>
          <span className="text-lg font-mono font-bold text-primary">{complexity.time}</span>
        </div>
        {/* Space complexity badge */}
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-foreground/40 uppercase font-semibold">Space</span>
          <span className="text-lg font-mono font-bold text-accent">{complexity.space}</span>
        </div>
        {/* Best/Worst/Avg badges */}
        {complexity.best && (
          <div className="flex gap-2 ml-auto">
            <div className="flex flex-col items-center px-2 py-1 bg-emerald-500/10 rounded-lg">
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">BEST</span>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{complexity.best}</span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 bg-amber-500/10 rounded-lg">
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">AVG</span>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{complexity.average || complexity.time}</span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 bg-red-500/10 rounded-lg">
              <span className="text-[9px] text-red-600 dark:text-red-400 font-semibold">WORST</span>
              <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">{complexity.worst || complexity.time}</span>
            </div>
          </div>
        )}
        {/* Expand/collapse indicator */}
        {hasDetails && (
          <span className="text-foreground/30 text-sm ml-2">{expanded ? '▲' : '▼'}</span>
        )}
      </button>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="px-4 pb-4 border-t border-border"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {/* Time explanation */}
            {complexity.timeExplain && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-primary uppercase flex items-center gap-1">
                  ⏱ Time: {complexity.time}
                </h4>
                <p className="text-xs text-foreground/70 leading-relaxed">{complexity.timeExplain}</p>
              </div>
            )}
            {/* Space explanation */}
            {complexity.spaceExplain && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-accent uppercase flex items-center gap-1">
                  💾 Space: {complexity.space}
                </h4>
                <p className="text-xs text-foreground/70 leading-relaxed">{complexity.spaceExplain}</p>
              </div>
            )}
          </div>
          {/* Real-world analogy */}
          {complexity.analogy && (
            <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
              <h4 className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase mb-1">💡 Real-World Analogy</h4>
              <p className="text-xs text-foreground/70 leading-relaxed">{complexity.analogy}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/**
 * SVG-based linked list visualization.
 * Renders nodes in a horizontal chain with arrows showing next pointers.
 * Pointer labels (curr, prev, temp) appear above nodes.
 */
function LinkedListVisualization({
  nodes,
  highlighted,
  pointers,
}: {
  nodes: Array<{ val: number; nextIdx: number }>;
  highlighted: number[];
  pointers: { curr: number; prev: number; temp: number };
}) {
  if (!nodes || nodes.length === 0) return <span className="text-xs text-foreground/30">No list</span>;

  const nodeWidth = 60;
  const nodeHeight = 36;
  const gap = 40;
  const topPadding = 40;
  const svgWidth = nodes.length * (nodeWidth + gap) + 40;
  const svgHeight = nodeHeight + topPadding + 30;

  // Pointer colors and labels
  const pointerLabels: Array<{ idx: number; label: string; color: string }> = [];
  if (pointers.curr >= 0) pointerLabels.push({ idx: pointers.curr, label: 'curr', color: '#3b82f6' });
  if (pointers.prev >= 0) pointerLabels.push({ idx: pointers.prev, label: 'prev', color: '#ef4444' });
  if (pointers.temp >= 0) pointerLabels.push({ idx: pointers.temp, label: 'temp', color: '#f59e0b' });

  return (
    <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto">
      {/* Pointer labels above nodes */}
      {pointerLabels.map(({ idx, label, color }) => {
        const x = 20 + idx * (nodeWidth + gap) + nodeWidth / 2;
        // Stack labels if multiple pointers point to same node
        const sameIdxLabels = pointerLabels.filter(p => p.idx === idx);
        const yOffset = sameIdxLabels.indexOf(pointerLabels.find(p => p.label === label)!) * 14;
        return (
          <g key={`ptr-${label}`}>
            <motion.text
              x={x} y={12 + yOffset}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={color}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {label}
            </motion.text>
            <motion.line
              x1={x} y1={15 + yOffset} x2={x} y2={topPadding - 2}
              stroke={color} strokeWidth="1.5" strokeDasharray="3,2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
            />
          </g>
        );
      })}

      {/* Draw arrows between nodes based on nextIdx */}
      {nodes.map((node, i) => {
        const x1 = 20 + i * (nodeWidth + gap) + nodeWidth;
        const y = topPadding + nodeHeight / 2;
        if (node.nextIdx >= 0 && node.nextIdx < nodes.length) {
          const x2 = 20 + node.nextIdx * (nodeWidth + gap);
          // Arrow could go forward or backward (for reversed links)
          const isReversed = node.nextIdx < i;
          return (
            <g key={`arrow-${i}`}>
              <motion.line
                x1={x1 + 2} y1={isReversed ? y - 5 : y}
                x2={x2 - 2} y2={isReversed ? y - 5 : y}
                stroke={isReversed ? '#ef4444' : 'var(--border)'}
                strokeWidth={isReversed ? 2 : 1.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                markerEnd={`url(#arrowhead-${isReversed ? 'red' : 'gray'})`}
              />
            </g>
          );
        } else if (node.nextIdx === -1) {
          // Arrow to null
          return (
            <g key={`arrow-null-${i}`}>
              <line
                x1={x1 + 2} y1={y}
                x2={x1 + 20} y2={y}
                stroke="var(--border)" strokeWidth="1.5"
              />
              <text
                x={x1 + 25} y={y + 4}
                fontSize="10" fill="var(--foreground)" opacity={0.4}
                fontFamily="monospace"
              >
                null
              </text>
            </g>
          );
        }
        return null;
      })}

      {/* Draw node boxes */}
      {nodes.map((node, i) => {
        const x = 20 + i * (nodeWidth + gap);
        const y = topPadding;
        const isHigh = highlighted.includes(i);
        const isCurr = pointers.curr === i;
        const isPrev = pointers.prev === i;

        let fillColor = 'var(--surface-light)';
        let strokeColor = 'var(--border)';
        if (isCurr) { fillColor = '#3b82f6'; strokeColor = '#2563eb'; }
        else if (isPrev) { fillColor = '#ef4444'; strokeColor = '#dc2626'; }
        else if (isHigh) { fillColor = '#6366f1'; strokeColor = '#4f46e5'; }

        return (
          <g key={`node-${i}`}>
            <motion.rect
              x={x} y={y}
              width={nodeWidth} height={nodeHeight}
              rx={8} ry={8}
              animate={{ fill: fillColor, stroke: strokeColor }}
              transition={{ duration: 0.3 }}
              strokeWidth="2"
            />
            <text
              x={x + nodeWidth / 2} y={y + nodeHeight / 2 + 5}
              textAnchor="middle"
              fontSize="14" fontWeight="700"
              fontFamily="monospace"
              fill={isCurr || isPrev || isHigh ? '#ffffff' : 'var(--foreground)'}
            >
              {node.val}
            </text>
          </g>
        );
      })}

      {/* SVG arrow markers */}
      <defs>
        <marker id="arrowhead-gray" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--border)" />
        </marker>
        <marker id="arrowhead-red" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
        </marker>
      </defs>
    </svg>
  );
}

/**
 * SVG-based graph visualization for BFS/DFS.
 * Positions nodes in a circular layout with edges between them.
 * Highlighted nodes shown in accent color.
 */
function GraphVisualization({
  nodes: nodeCount,
  edges,
  highlighted,
}: {
  nodes: number;
  edges: number[][];
  highlighted: number[];
}) {
  if (!nodeCount || nodeCount === 0) return <span className="text-xs text-foreground/30">No graph</span>;

  const svgSize = 260;
  const center = svgSize / 2;
  const radius = 90;
  const nodeRadius = 18;

  // Position nodes in a circle
  const positions = Array.from({ length: nodeCount }, (_, i) => {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
  });

  return (
    <svg width="100%" height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="mx-auto">
      {/* Draw edges */}
      {edges.map(([a, b], i) => {
        if (a >= nodeCount || b >= nodeCount) return null;
        const bothHighlighted = highlighted.includes(a) && highlighted.includes(b);
        return (
          <line
            key={`edge-${i}`}
            x1={positions[a].x} y1={positions[a].y}
            x2={positions[b].x} y2={positions[b].y}
            stroke={bothHighlighted ? '#06b6d4' : 'var(--border)'}
            strokeWidth={bothHighlighted ? 2.5 : 1.5}
            opacity={bothHighlighted ? 1 : 0.5}
          />
        );
      })}
      {/* Draw nodes */}
      {positions.map((pos, i) => {
        const isHigh = highlighted.includes(i);
        return (
          <g key={`gnode-${i}`}>
            <motion.circle
              cx={pos.x} cy={pos.y} r={nodeRadius}
              animate={{
                fill: isHigh ? '#06b6d4' : 'var(--surface-light)',
                stroke: isHigh ? '#0891b2' : 'var(--border)',
                scale: isHigh ? 1.15 : 1,
              }}
              transition={{ duration: 0.3 }}
              strokeWidth="2"
            />
            <text
              x={pos.x} y={pos.y + 5}
              textAnchor="middle"
              fontSize="13" fontWeight="700"
              fill={isHigh ? '#ffffff' : 'var(--foreground)'}
            >
              {i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * SVG-based binary tree visualization.
 * Renders nodes in a tree layout with highlighted nodes.
 */
function TreeVisualization({ nodes, highlighted }: { nodes: number[]; highlighted: number[] }) {
  if (!nodes || nodes.length === 0) return <span className="text-xs text-foreground/30">No tree</span>;

  // Calculate tree depth and layout
  const depth = Math.floor(Math.log2(nodes.length)) + 1;
  const svgWidth = 240;
  const svgHeight = Math.max(depth * 60, 120);
  const nodeRadius = 16;

  // Position each node in a binary tree layout
  const positions: Array<{ x: number; y: number; val: number; idx: number } | null> = [];
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i] === null || nodes[i] === undefined) {
      positions.push(null);
      continue;
    }
    const level = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, level) - 1);
    const nodesInLevel = Math.pow(2, level);
    const x = ((posInLevel + 0.5) / nodesInLevel) * svgWidth;
    const y = level * 55 + 25;
    positions.push({ x, y, val: nodes[i], idx: i });
  }

  return (
    <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto">
      {/* Draw edges first */}
      {positions.map((node, i) => {
        if (!node) return null;
        const leftIdx = 2 * i + 1;
        const rightIdx = 2 * i + 2;
        return (
          <g key={`edges-${i}`}>
            {leftIdx < positions.length && positions[leftIdx] && (
              <line
                x1={node.x} y1={node.y}
                x2={positions[leftIdx]!.x} y2={positions[leftIdx]!.y}
                stroke="var(--border)" strokeWidth="1.5"
              />
            )}
            {rightIdx < positions.length && positions[rightIdx] && (
              <line
                x1={node.x} y1={node.y}
                x2={positions[rightIdx]!.x} y2={positions[rightIdx]!.y}
                stroke="var(--border)" strokeWidth="1.5"
              />
            )}
          </g>
        );
      })}
      {/* Draw nodes */}
      {positions.map((node, i) => {
        if (!node) return null;
        const isHigh = highlighted.includes(i);
        return (
          <g key={`node-${i}`}>
            <motion.circle
              cx={node.x} cy={node.y} r={nodeRadius}
              animate={{
                fill: isHigh ? '#6366f1' : 'var(--surface-light)',
                stroke: isHigh ? '#4f46e5' : 'var(--border)',
                scale: isHigh ? 1.15 : 1,
              }}
              transition={{ duration: 0.3 }}
              strokeWidth="2"
            />
            <text
              x={node.x} y={node.y + 4}
              textAnchor="middle"
              className="text-xs font-bold"
              fill={isHigh ? '#ffffff' : 'var(--foreground)'}
            >
              {node.val}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

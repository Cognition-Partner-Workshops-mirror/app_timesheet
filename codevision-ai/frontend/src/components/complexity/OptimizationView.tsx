'use client';

/**
 * Code optimization results display.
 * Shows original vs optimized code with complexity comparison table,
 * hints section for progressive problem solving,
 * improvement details, edge cases, and trade-off analysis.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { OptimizationResult, Language } from '@/types';
import CodeHighlight from '../code-editor/CodeHighlight';

interface OptimizationViewProps {
  result: OptimizationResult;
  language: Language;
  originalCode: string;
}

export default function OptimizationView({ result, language, originalCode }: OptimizationViewProps) {
  // Progressive hints reveal — user clicks to see more hints
  const [hintsRevealed, setHintsRevealed] = useState(0);
  // Toggle showing full optimized solution
  const [showSolution, setShowSolution] = useState(false);

  // Build hints from inefficiencies and improvements
  const hints: string[] = [
    ...(result.originalAnalysis.inefficiencies.length > 0
      ? [`Look at the inefficiency: ${result.originalAnalysis.inefficiencies[0]}`]
      : []),
    ...(result.originalAnalysis.inefficiencies.length > 1
      ? result.originalAnalysis.inefficiencies.slice(1).map(i => `Another issue: ${i}`)
      : []),
    ...(result.optimizedAnalysis.improvements.length > 0
      ? [`Hint: Try ${result.optimizedAnalysis.improvements[0].toLowerCase()}`]
      : []),
    `The optimized solution improves time complexity from ${result.originalAnalysis.timeComplexity} to ${result.optimizedAnalysis.timeComplexity}`,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <h2 className="text-lg font-semibold text-foreground">Code Optimization</h2>

      {/* Original code analysis */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-2">Original Code Analysis</h3>
        <p className="text-sm text-foreground/80 mb-3">{result.originalAnalysis.logic}</p>

        {/* Inefficiencies found */}
        {result.originalAnalysis.inefficiencies.length > 0 && (
          <div className="mb-3">
            <span className="text-xs font-semibold text-danger uppercase">Inefficiencies Found</span>
            <ul className="mt-1 space-y-1">
              {result.originalAnalysis.inefficiencies.map((issue, i) => (
                <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                  <span className="text-danger mt-0.5">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-4">
          <div className="bg-surface-light rounded-lg px-3 py-2">
            <span className="text-xs text-foreground/50">Time</span>
            <p className="text-sm font-mono text-accent">{result.originalAnalysis.timeComplexity}</p>
          </div>
          <div className="bg-surface-light rounded-lg px-3 py-2">
            <span className="text-xs text-foreground/50">Space</span>
            <p className="text-sm font-mono text-accent">{result.originalAnalysis.spaceComplexity}</p>
          </div>
        </div>
      </div>

      {/* Hints section — progressive reveal to help solve before showing solution */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <span>💡</span> Hints to Solve
          </h3>
          <span className="text-[10px] text-foreground/40">
            {hintsRevealed}/{hints.length} hints revealed
          </span>
        </div>

        {/* Revealed hints */}
        <AnimatePresence>
          {hints.slice(0, hintsRevealed).map((hint, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2"
            >
              <div className="flex items-start gap-2 bg-surface border border-border rounded-lg p-3">
                <span className="text-primary text-xs font-bold mt-0.5">#{i + 1}</span>
                <p className="text-sm text-foreground/80">{hint}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Show hint / show solution buttons */}
        <div className="flex gap-2 mt-2">
          {hintsRevealed < hints.length && (
            <button
              onClick={() => setHintsRevealed(prev => prev + 1)}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors"
            >
              Show Next Hint ({hintsRevealed + 1}/{hints.length})
            </button>
          )}
          <button
            onClick={() => {
              setShowSolution(!showSolution);
              setHintsRevealed(hints.length);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              showSolution
                ? 'bg-success/10 text-success hover:bg-success/20'
                : 'bg-surface-light text-foreground/60 hover:bg-surface-light/80'
            }`}
          >
            {showSolution ? 'Hide Solution' : 'Show Full Solution'}
          </button>
        </div>
      </div>

      {/* Side-by-side code comparison — only shown when solution revealed */}
      <AnimatePresence>
        {showSolution && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-danger mb-2">Before (Original)</h3>
                <CodeHighlight code={originalCode} language={language} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-success mb-2">After (Optimized)</h3>
                <CodeHighlight code={result.optimizedCode} language={language} />
              </div>
            </div>

            {/* Complexity comparison table */}
            {result.comparisonTable && result.comparisonTable.length > 0 && (
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider px-4 py-3 bg-surface-light border-b border-border">
                  Complexity Comparison
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-foreground/50 border-b border-border">
                      <th className="text-left px-4 py-2">Aspect</th>
                      <th className="text-left px-4 py-2">Before</th>
                      <th className="text-left px-4 py-2">After</th>
                      <th className="text-left px-4 py-2">Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.comparisonTable.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-4 py-2 text-foreground/80">{row.aspect}</td>
                        <td className="px-4 py-2 font-mono text-danger">{row.before}</td>
                        <td className="px-4 py-2 font-mono text-success">{row.after}</td>
                        <td className="px-4 py-2 text-foreground/60">{row.improvement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Improvements list */}
            {result.optimizedAnalysis.improvements.length > 0 && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-success mb-2">Improvements Made</h3>
                <ul className="space-y-1">
                  {result.optimizedAnalysis.improvements.map((imp, i) => (
                    <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                      <span className="text-success mt-0.5">+</span>
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edge cases — always visible */}
      {result.edgeCases && result.edgeCases.length > 0 && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-secondary mb-2">Edge Cases to Handle</h3>
          <ul className="space-y-1">
            {result.edgeCases.map((edgeCase, i) => (
              <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                <span className="text-secondary mt-0.5">⚠</span>
                {edgeCase}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trade-offs */}
      {result.tradeOffs && result.tradeOffs.length > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-accent mb-2">Trade-offs to Consider</h3>
          <ul className="space-y-1">
            {result.tradeOffs.map((tradeoff, i) => (
              <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                <span className="text-accent mt-0.5">⚖</span>
                {tradeoff}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

'use client';

/**
 * Problem solution results display.
 * Shows multiple approaches (brute-force, better, optimized) with
 * code, complexity analysis, dry runs, edge cases, and interview tips.
 */
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { ProblemResult, Language } from '@/types';
import CodeHighlight from '../code-editor/CodeHighlight';

interface ProblemResultViewProps {
  result: ProblemResult;
  language: Language;
}

export default function ProblemResultView({ result, language }: ProblemResultViewProps) {
  // Track which approach tab is selected
  const [activeApproach, setActiveApproach] = useState(0);
  // Track which section is expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['approaches']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const approach = result.approaches?.[activeApproach];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Problem summary */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Problem Analysis</h2>
        <p className="text-sm text-foreground/80 mt-2">{result.problemSummary}</p>
        {result.realWorldAnalogy && (
          <div className="mt-2 bg-secondary/10 border border-secondary/30 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-secondary">Real-world Analogy:</span>
            <p className="text-sm text-foreground/70 mt-0.5">{result.realWorldAnalogy}</p>
          </div>
        )}
      </div>

      {/* Solution approaches tabs */}
      <div>
        <button
          onClick={() => toggleSection('approaches')}
          className="flex items-center gap-2 text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3"
        >
          <span>{expandedSections.has('approaches') ? '▾' : '▸'}</span>
          Solution Approaches ({result.approaches?.length || 0})
        </button>

        {expandedSections.has('approaches') && result.approaches && (
          <>
            {/* Approach selector tabs */}
            <div className="flex gap-2 mb-4">
              {result.approaches.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setActiveApproach(i)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    activeApproach === i
                      ? 'bg-primary text-white font-medium'
                      : 'bg-surface-light text-foreground/60 hover:bg-primary/20'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>

            {/* Active approach details */}
            {approach && (
              <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
                {/* Intuition */}
                <div>
                  <h4 className="text-xs font-semibold text-primary-light uppercase mb-1">Intuition</h4>
                  <p className="text-sm text-foreground/80">{approach.intuition}</p>
                </div>

                {/* Algorithm steps */}
                {approach.algorithm && approach.algorithm.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-secondary uppercase mb-1">Algorithm Steps</h4>
                    <ol className="space-y-1 list-decimal list-inside">
                      {approach.algorithm.map((step, i) => (
                        <li key={i} className="text-sm text-foreground/70">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Code implementation */}
                {approach.code && (
                  <div>
                    <h4 className="text-xs font-semibold text-accent uppercase mb-1">Code</h4>
                    <CodeHighlight code={approach.code} language={language} />
                  </div>
                )}

                {/* Complexity badges */}
                <div className="flex gap-4">
                  <div className="bg-surface-light rounded-lg px-3 py-2">
                    <span className="text-xs text-foreground/50">Time</span>
                    <p className="text-sm font-mono text-accent">{approach.timeComplexity}</p>
                  </div>
                  <div className="bg-surface-light rounded-lg px-3 py-2">
                    <span className="text-xs text-foreground/50">Space</span>
                    <p className="text-sm font-mono text-accent">{approach.spaceComplexity}</p>
                  </div>
                </div>

                {/* Pros and cons */}
                <div className="grid grid-cols-2 gap-4">
                  {approach.pros && approach.pros.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-success uppercase mb-1">Pros</h4>
                      <ul className="space-y-0.5">
                        {approach.pros.map((pro, i) => (
                          <li key={i} className="text-xs text-foreground/60 flex gap-1">
                            <span className="text-success">+</span> {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {approach.cons && approach.cons.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-danger uppercase mb-1">Cons</h4>
                      <ul className="space-y-0.5">
                        {approach.cons.map((con, i) => (
                          <li key={i} className="text-xs text-foreground/60 flex gap-1">
                            <span className="text-danger">-</span> {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dry run section */}
      {result.dryRun && (
        <div>
          <button
            onClick={() => toggleSection('dryRun')}
            className="flex items-center gap-2 text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3"
          >
            <span>{expandedSections.has('dryRun') ? '▾' : '▸'}</span>
            Dry Run
          </button>
          {expandedSections.has('dryRun') && (
            <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div className="text-sm">
                <span className="text-xs font-semibold text-foreground/50">Input:</span>
                <code className="ml-2 text-accent font-mono">{result.dryRun.input}</code>
              </div>
              {result.dryRun.steps && result.dryRun.steps.map((step, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-xs text-primary-light font-mono w-12 flex-shrink-0">Step {step.step}</span>
                  <div>
                    <span className="text-foreground/60">{step.state}</span>
                    <p className="text-foreground/50 text-xs mt-0.5">{step.explanation}</p>
                  </div>
                </div>
              ))}
              <div className="text-sm">
                <span className="text-xs font-semibold text-foreground/50">Output:</span>
                <code className="ml-2 text-success font-mono">{result.dryRun.output}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edge cases */}
      {result.edgeCases && result.edgeCases.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('edgeCases')}
            className="flex items-center gap-2 text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3"
          >
            <span>{expandedSections.has('edgeCases') ? '▾' : '▸'}</span>
            Edge Cases
          </button>
          {expandedSections.has('edgeCases') && (
            <div className="space-y-2">
              {result.edgeCases.map((ec, i) => (
                <div key={i} className="bg-surface border border-border rounded-lg px-4 py-2">
                  <span className="text-sm text-foreground/80">{ec.case}</span>
                  <p className="text-xs text-foreground/50 mt-0.5">{ec.expectedBehavior}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interview tips */}
      {result.interviewTips && result.interviewTips.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-primary-light mb-2">Interview Tips</h3>
          <ul className="space-y-1">
            {result.interviewTips.map((tip, i) => (
              <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                <span className="text-primary-light mt-0.5">💡</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key takeaways */}
      {result.keyTakeaways && result.keyTakeaways.length > 0 && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-success mb-2">Key Takeaways</h3>
          <ul className="space-y-1">
            {result.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                <span className="text-success mt-0.5">✦</span>
                {takeaway}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

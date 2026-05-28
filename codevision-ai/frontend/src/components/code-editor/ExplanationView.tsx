'use client';

/**
 * Line-by-line code explanation display.
 * Shows each line of code alongside its explanation, purpose,
 * data state, and beginner-friendly analogies.
 */
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { ExplanationResult } from '@/types';

interface ExplanationViewProps {
  result: ExplanationResult;
}

export default function ExplanationView({ result }: ExplanationViewProps) {
  // Track which line the user has selected for detailed view
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Header with title and overview */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">{result.title}</h2>
        <p className="text-sm text-foreground/60 mt-1">{result.overview}</p>
      </div>

      {/* Key concepts badges */}
      {result.keyConcepts && result.keyConcepts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.keyConcepts.map((concept, i) => (
            <span key={i} className="px-2 py-1 bg-primary/20 text-primary-light text-xs rounded-full">
              {concept}
            </span>
          ))}
        </div>
      )}

      {/* Line-by-line explanation cards */}
      <div className="flex flex-col gap-3">
        {result.lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedLine(selectedLine === line.lineNumber ? null : line.lineNumber)}
            className={`bg-surface border rounded-lg overflow-hidden cursor-pointer transition-all ${
              selectedLine === line.lineNumber ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/50'
            }`}
          >
            {/* Code line with line number */}
            <div className="flex items-center gap-3 px-4 py-2 bg-surface-light">
              <span className="text-xs text-foreground/40 w-6 text-right">{line.lineNumber}</span>
              <code className="text-sm font-mono text-foreground flex-1">{line.code}</code>
            </div>

            {/* Explanation section */}
            <div className="px-4 py-3">
              <p className="text-sm text-foreground/80">{line.explanation}</p>

              {/* Expanded details shown on selection */}
              {selectedLine === line.lineNumber && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 space-y-2 border-t border-border pt-3"
                >
                  <div>
                    <span className="text-xs font-semibold text-secondary uppercase">Purpose</span>
                    <p className="text-sm text-foreground/70 mt-0.5">{line.purpose}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-accent uppercase">Data State</span>
                    <p className="text-sm text-foreground/70 mt-0.5">{line.dataState}</p>
                  </div>
                  {line.analogy && (
                    <div>
                      <span className="text-xs font-semibold text-success uppercase">Real-world Analogy</span>
                      <p className="text-sm text-foreground/70 mt-0.5">{line.analogy}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Common mistakes section */}
      {result.commonMistakes && result.commonMistakes.length > 0 && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-danger mb-2">Common Mistakes to Avoid</h3>
          <ul className="space-y-1">
            {result.commonMistakes.map((mistake, i) => (
              <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                <span className="text-danger mt-0.5">•</span>
                {mistake}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

'use client';

/**
 * Code optimization results display.
 * Shows original vs optimized code with complexity comparison table,
 * improvement details, and trade-off analysis.
 */
import { motion } from 'framer-motion';
import type { OptimizationResult, Language } from '@/types';
import CodeHighlight from '../code-editor/CodeHighlight';

interface OptimizationViewProps {
  result: OptimizationResult;
  language: Language;
  originalCode: string;
}

export default function OptimizationView({ result, language, originalCode }: OptimizationViewProps) {
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

      {/* Side-by-side code comparison */}
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

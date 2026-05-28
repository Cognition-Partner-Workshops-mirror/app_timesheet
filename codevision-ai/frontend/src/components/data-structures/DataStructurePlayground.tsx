'use client';

/**
 * Interactive data structure playground.
 * Users can select a data structure, perform operations (insert, delete, search, etc.),
 * and see animated step-by-step visualizations with corresponding code.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import type { Language, Difficulty, PlaygroundOperation } from '@/types';
import * as api from '@/lib/api';
import CodeHighlight from '../code-editor/CodeHighlight';
import LoadingSpinner from '../ui/LoadingSpinner';

// Available data structures with their operations and visual representation configs
const DATA_STRUCTURES = [
  {
    id: 'array', label: 'Array', icon: '📊',
    operations: ['insert', 'delete', 'search', 'sort', 'reverse', 'traverse'],
  },
  {
    id: 'string', label: 'String', icon: '🔤',
    operations: ['reverse', 'search', 'substring', 'concatenate'],
  },
  {
    id: 'linkedList', label: 'Linked List', icon: '🔗',
    operations: ['insert_head', 'insert_tail', 'delete', 'search', 'reverse', 'traverse'],
  },
  {
    id: 'stack', label: 'Stack', icon: '📚',
    operations: ['push', 'pop', 'peek', 'isEmpty'],
  },
  {
    id: 'queue', label: 'Queue', icon: '🚶',
    operations: ['enqueue', 'dequeue', 'front', 'isEmpty'],
  },
  {
    id: 'hashMap', label: 'Hash Map', icon: '🗂',
    operations: ['put', 'get', 'delete', 'contains'],
  },
  {
    id: 'tree', label: 'Binary Tree', icon: '🌳',
    operations: ['insert', 'delete', 'search', 'inorder', 'preorder', 'postorder'],
  },
  {
    id: 'graph', label: 'Graph', icon: '🕸',
    operations: ['add_node', 'add_edge', 'bfs', 'dfs'],
  },
  {
    id: 'heap', label: 'Heap', icon: '⛰',
    operations: ['insert', 'extract_min', 'extract_max', 'heapify'],
  },
];

interface DataStructurePlaygroundProps {
  language: Language;
  difficulty: Difficulty;
}

export default function DataStructurePlayground({ language, difficulty }: DataStructurePlaygroundProps) {
  const [selectedDS, setSelectedDS] = useState<string>('');
  const [selectedOp, setSelectedOp] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [result, setResult] = useState<PlaygroundOperation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const dsConfig = DATA_STRUCTURES.find(ds => ds.id === selectedDS);

  const handleOperate = useCallback(async () => {
    if (!selectedDS || !selectedOp) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);

    try {
      const params: Record<string, unknown> = {};
      if (inputValue) {
        params.value = inputValue;
        // Try parsing as number array if comma-separated
        if (inputValue.includes(',')) {
          params.values = inputValue.split(',').map(v => v.trim());
        }
      }
      const data = await api.playgroundOperate(selectedDS, selectedOp, language, difficulty, params);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  }, [selectedDS, selectedOp, inputValue, language, difficulty]);

  const step = result?.steps?.[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">Data Structure Playground</h2>
        <p className="text-sm text-foreground/60 mt-1">
          Select a data structure and operation to see step-by-step visualization with code.
        </p>
      </div>

      {/* Data structure selection grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {DATA_STRUCTURES.map((ds) => (
          <motion.button
            key={ds.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setSelectedDS(ds.id); setSelectedOp(''); setResult(null); }}
            className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border transition-all ${
              selectedDS === ds.id
                ? 'border-primary bg-primary/20 text-primary-light'
                : 'border-border bg-surface hover:border-primary/50 text-foreground/60'
            }`}
          >
            <span className="text-2xl">{ds.icon}</span>
            <span className="text-xs">{ds.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Operation selection */}
      {dsConfig && (
        <div>
          <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Operations</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {dsConfig.operations.map((op) => (
              <button
                key={op}
                onClick={() => setSelectedOp(op)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                  selectedOp === op
                    ? 'bg-secondary text-white'
                    : 'bg-surface-light text-foreground/60 hover:bg-secondary/20'
                }`}
              >
                {op.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input value and execute */}
      {selectedOp && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value(s), e.g. 5 or 1,2,3,4,5"
            className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOperate}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-medium disabled:opacity-40 transition-all"
          >
            {loading ? 'Running...' : 'Execute'}
          </motion.button>
        </div>
      )}

      {/* Loading state */}
      {loading && <LoadingSpinner message="Generating visualization..." />}

      {/* Error display */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">{error}</div>
      )}

      {/* Result visualization */}
      {result && (
        <div className="space-y-4">
          {/* Explanation */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">{result.dataStructure} - {result.operation}</h3>
            <p className="text-sm text-foreground/70">{result.explanation}</p>
            {result.realWorldAnalogy && (
              <p className="text-xs text-secondary mt-2">💡 {result.realWorldAnalogy}</p>
            )}
          </div>

          {/* Step-by-step visualization */}
          {result.steps && result.steps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground/70 uppercase">
                  Step {currentStep + 1} of {result.steps.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="px-2 py-1 text-xs bg-surface-light rounded hover:bg-primary/20 disabled:opacity-30"
                  >
                    ◀ Prev
                  </button>
                  <button
                    onClick={() => setCurrentStep(Math.min(result.steps.length - 1, currentStep + 1))}
                    disabled={currentStep >= result.steps.length - 1}
                    className="px-2 py-1 text-xs bg-surface-light rounded hover:bg-primary/20 disabled:opacity-30"
                  >
                    Next ▶
                  </button>
                </div>
              </div>

              {step && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-surface-light border border-border rounded-lg p-4"
                  >
                    <p className="text-sm text-foreground/80 mb-2">{step.description}</p>
                    <p className="text-xs text-foreground/50">{step.explanation}</p>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}

          {/* Code implementation */}
          {result.codeImplementation && (
            <div>
              <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2">Code Implementation</h4>
              <CodeHighlight code={result.codeImplementation} language={language} />
            </div>
          )}

          {/* Complexity */}
          <div className="flex gap-4">
            <div className="bg-surface border border-border rounded-lg px-4 py-2">
              <span className="text-xs text-foreground/50">Time</span>
              <p className="text-sm font-mono text-accent">{result.complexity.time}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg px-4 py-2">
              <span className="text-xs text-foreground/50">Space</span>
              <p className="text-sm font-mono text-accent">{result.complexity.space}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

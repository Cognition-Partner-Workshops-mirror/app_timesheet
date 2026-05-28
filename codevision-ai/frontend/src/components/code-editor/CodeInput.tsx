'use client';

/**
 * Code input component with syntax-highlighted textarea.
 * Includes format-aware custom input block for providing test data.
 * Supports array, string, map, and number input formats.
 */
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Language, Difficulty } from '@/types';

// Sample code snippets for each language to help users get started
const SAMPLE_CODE: Record<Language, string> = {
  python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

result = bubble_sort([64, 34, 25, 12, 22, 11, 90])
print(result)`,
  javascript: `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

console.log(bubbleSort([64, 34, 25, 12, 22, 11, 90]));`,
  java: `public static int[] bubbleSort(int[] arr) {
    int n = arr.length;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
    return arr;
}`,
  cpp: `void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }
}`,
};

// Input type presets with format examples and placeholders
type InputType = 'array' | 'string' | 'map' | 'number' | 'matrix';
const INPUT_TYPES: Array<{ type: InputType; label: string; icon: string; placeholder: string; example: string }> = [
  { type: 'array', label: 'Array', icon: '[ ]', placeholder: '[64, 34, 25, 12, 22, 11, 90]', example: '[64, 34, 25, 12, 22, 11, 90]' },
  { type: 'string', label: 'String', icon: '" "', placeholder: '"hello world"', example: '"hello world"' },
  { type: 'map', label: 'Map', icon: '{ }', placeholder: '{"a": 1, "b": 2, "c": 3}', example: '{"a": 1, "b": 2, "c": 3}' },
  { type: 'number', label: 'Number', icon: '#', placeholder: '42', example: '42' },
  { type: 'matrix', label: 'Matrix', icon: '[[]]', placeholder: '[[1, 2], [3, 4], [5, 6]]', example: '[[1, 2], [3, 4], [5, 6]]' },
];

interface CodeInputProps {
  code: string;
  language: Language;
  difficulty: Difficulty;
  loading: boolean;
  onCodeChange: (code: string) => void;
  onAnalyze: () => void;
  onExplain: () => void;
  onOptimize: () => void;
  onAnimate: () => void;
  onStoryboard: () => void;
}

export default function CodeInput({
  code, language, loading,
  onCodeChange, onAnalyze, onExplain, onOptimize, onAnimate, onStoryboard,
}: CodeInputProps) {
  // Custom input state — format-aware with type selector
  const [inputType, setInputType] = useState<InputType>('array');
  const [customInput, setCustomInput] = useState('[64, 34, 25, 12, 22, 11, 90]');

  // Get current type config for hints/placeholders
  const currentTypeConfig = INPUT_TYPES.find(t => t.type === inputType)!;

  // Action buttons shown below the code editor
  const actions = [
    { label: 'Analyze', icon: '🔍', onClick: onAnalyze, color: 'from-blue-500 to-blue-700' },
    { label: 'Explain', icon: '📖', onClick: onExplain, color: 'from-green-500 to-green-700' },
    { label: 'Optimize', icon: '⚡', onClick: onOptimize, color: 'from-yellow-500 to-yellow-700' },
    { label: 'Animate', icon: '🎬', onClick: onAnimate, color: 'from-purple-500 to-purple-700' },
    { label: 'Storyboard', icon: '🎓', onClick: onStoryboard, color: 'from-pink-500 to-pink-700' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Code Input</h2>
        <button
          onClick={() => onCodeChange(SAMPLE_CODE[language])}
          className="text-xs bg-surface-light hover:bg-primary/20 text-foreground/60 px-3 py-1.5 rounded-lg transition-colors"
        >
          Load Sample Code
        </button>
      </div>

      {/* Code textarea */}
      <div className="relative">
        <textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder={`Enter your ${language} code here...`}
          className="w-full h-80 bg-surface-light border border-border rounded-lg p-4 font-mono text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-foreground/30"
          spellCheck={false}
        />
        <div className="absolute top-2 right-2 text-xs text-foreground/30 bg-surface px-2 py-1 rounded">
          {language.toUpperCase()}
        </div>
      </div>

      {/* Format-aware custom input block */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
            Custom Input
          </label>
          <span className="text-[10px] text-foreground/40">Used as input data for animation</span>
        </div>

        {/* Input type selector — tabs */}
        <div className="flex gap-1 mb-3">
          {INPUT_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => {
                setInputType(t.type);
                setCustomInput(t.example);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                inputType === t.type
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-light text-foreground/60 hover:bg-surface-light/80 hover:text-foreground'
              }`}
            >
              <span className="font-mono text-[10px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Input field with format-specific placeholder */}
        <textarea
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          className="w-full bg-surface-light border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-foreground/30 resize-none"
          placeholder={currentTypeConfig.placeholder}
          rows={inputType === 'matrix' ? 3 : 1}
        />
        <p className="mt-1 text-[10px] text-foreground/40">
          Format: <span className="font-mono text-foreground/50">{currentTypeConfig.placeholder}</span>
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            disabled={loading || !code.trim()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r ${action.color} disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl`}
          >
            <span>{action.icon}</span>
            {action.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

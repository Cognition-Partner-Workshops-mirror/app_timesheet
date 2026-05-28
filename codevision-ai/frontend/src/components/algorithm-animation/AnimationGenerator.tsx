'use client';

/**
 * Algorithm animation generator panel.
 * Lets users select an algorithm type and input data,
 * then generates step-by-step animation via the AI backend.
 */
import { motion } from 'framer-motion';
import { useState } from 'react';

// Predefined algorithm categories and their algorithms
const ALGORITHM_CATEGORIES = [
  {
    category: 'Sorting',
    algorithms: [
      { type: 'bubble_sort', label: 'Bubble Sort', defaultInput: [64, 34, 25, 12, 22, 11, 90] },
      { type: 'selection_sort', label: 'Selection Sort', defaultInput: [64, 25, 12, 22, 11] },
      { type: 'insertion_sort', label: 'Insertion Sort', defaultInput: [12, 11, 13, 5, 6] },
      { type: 'merge_sort', label: 'Merge Sort', defaultInput: [38, 27, 43, 3, 9, 82, 10] },
      { type: 'quick_sort', label: 'Quick Sort', defaultInput: [10, 80, 30, 90, 40, 50, 70] },
    ],
  },
  {
    category: 'Searching',
    algorithms: [
      { type: 'linear_search', label: 'Linear Search', defaultInput: [2, 3, 4, 10, 40] },
      { type: 'binary_search', label: 'Binary Search', defaultInput: [2, 3, 4, 10, 40, 50, 60] },
    ],
  },
  {
    category: 'Data Structures',
    algorithms: [
      { type: 'stack_operations', label: 'Stack Operations', defaultInput: [1, 2, 3, 4, 5] },
      { type: 'queue_operations', label: 'Queue Operations', defaultInput: [1, 2, 3, 4, 5] },
      { type: 'linked_list_traversal', label: 'Linked List Traversal', defaultInput: [1, 2, 3, 4, 5] },
    ],
  },
  {
    category: 'Graph & Tree',
    algorithms: [
      { type: 'bfs', label: 'BFS (Breadth-First)', defaultInput: [1, 2, 3, 4, 5, 6] },
      { type: 'dfs', label: 'DFS (Depth-First)', defaultInput: [1, 2, 3, 4, 5, 6] },
      { type: 'binary_tree_traversal', label: 'Binary Tree Traversal', defaultInput: [1, 2, 3, 4, 5, 6, 7] },
    ],
  },
  {
    category: 'Dynamic Programming',
    algorithms: [
      { type: 'fibonacci', label: 'Fibonacci Sequence', defaultInput: [0, 1, 1, 2, 3, 5, 8] },
      { type: 'two_pointer', label: 'Two Pointer Technique', defaultInput: [1, 2, 3, 4, 5, 6, 7] },
    ],
  },
];

interface AnimationGeneratorProps {
  onGenerate: (algorithmType: string, inputData?: unknown) => void;
  loading: boolean;
}

export default function AnimationGenerator({ onGenerate, loading }: AnimationGeneratorProps) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');

  const handleGenerate = () => {
    if (!selectedAlgorithm) return;

    // Find the selected algorithm to get its default input
    let inputData: number[] | undefined;
    for (const cat of ALGORITHM_CATEGORIES) {
      const algo = cat.algorithms.find(a => a.type === selectedAlgorithm);
      if (algo) {
        inputData = customInput
          ? customInput.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n))
          : algo.defaultInput;
        break;
      }
    }

    onGenerate(selectedAlgorithm, inputData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Select Algorithm</h3>

      {/* Algorithm selection grid organized by category */}
      <div className="space-y-4">
        {ALGORITHM_CATEGORIES.map((cat) => (
          <div key={cat.category}>
            <h4 className="text-xs font-semibold text-foreground/50 uppercase mb-2">{cat.category}</h4>
            <div className="flex flex-wrap gap-2">
              {cat.algorithms.map((algo) => (
                <button
                  key={algo.type}
                  onClick={() => {
                    setSelectedAlgorithm(algo.type);
                    setCustomInput(algo.defaultInput.join(', '));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    selectedAlgorithm === algo.type
                      ? 'bg-primary text-white'
                      : 'bg-surface-light text-foreground/60 hover:bg-primary/20'
                  }`}
                >
                  {algo.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Custom input field */}
      {selectedAlgorithm && (
        <div>
          <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Input Data (comma-separated)</label>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="mt-1 w-full bg-surface-light border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., 64, 34, 25, 12, 22, 11, 90"
          />
        </div>
      )}

      {/* Generate button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleGenerate}
        disabled={!selectedAlgorithm || loading}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
      >
        {loading ? 'Generating Animation...' : 'Generate Animation'}
      </motion.button>
    </motion.div>
  );
}

'use client';

/**
 * Problem input component for the problem-solving assistant.
 * Provides a textarea for entering coding problems along with
 * sample problems for quick testing.
 */
import { motion } from 'framer-motion';

// Sample problems users can load with one click
const SAMPLE_PROBLEMS = [
  {
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
  },
  {
    title: 'Reverse Linked List',
    description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
  },
  {
    title: 'Valid Parentheses',
    description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets, and open brackets must be closed in the correct order.',
  },
  {
    title: 'Maximum Subarray',
    description: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
  },
];

interface ProblemInputProps {
  problem: string;
  loading: boolean;
  onProblemChange: (problem: string) => void;
  onSolve: () => void;
}

export default function ProblemInput({ problem, loading, onProblemChange, onSolve }: ProblemInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <h2 className="text-lg font-semibold text-foreground">Problem Solver</h2>
      <p className="text-sm text-foreground/60">
        Enter a coding problem and get multiple solution approaches with complexity analysis, dry runs, and interview tips.
      </p>

      {/* Quick-load sample problems */}
      <div>
        <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Try a Sample Problem</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {SAMPLE_PROBLEMS.map((sample) => (
            <button
              key={sample.title}
              onClick={() => onProblemChange(sample.description)}
              className="px-3 py-1.5 bg-surface-light hover:bg-primary/20 text-foreground/60 hover:text-primary-light text-xs rounded-lg transition-colors"
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Problem textarea */}
      <textarea
        value={problem}
        onChange={(e) => onProblemChange(e.target.value)}
        placeholder="Describe the coding problem you want to solve..."
        className="w-full h-48 bg-surface-light border border-border rounded-lg p-4 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-foreground/30"
      />

      {/* Solve button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onSolve}
        disabled={loading || !problem.trim()}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
      >
        {loading ? 'Solving Problem...' : 'Solve Problem'}
      </motion.button>
    </motion.div>
  );
}

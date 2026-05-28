'use client';

/**
 * Unified Question/Code Input component.
 * Users can either:
 *   1. Type a coding question → AI generates code
 *   2. Paste their own code directly
 * Then use action buttons: Run, Animate, Explain, Hints, Discussion
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HintItem, DiscussionMessage } from '@/hooks/useCodeVision';

// Input mode tabs
type InputMode = 'question' | 'code';

interface QuestionInputProps {
  // Current state
  code: string;
  problemStatement: string;
  loading: boolean;
  hints: HintItem[];
  discussionMessages: DiscussionMessage[];
  codeGenResult: { approach: string; dataStructures: string[]; algorithm: string } | null;
  // Setters
  onCodeChange: (code: string) => void;
  onProblemChange: (problem: string) => void;
  // Actions
  onGenerateCode: () => void;
  onAnimate: () => void;
  onExplain: () => void;
  onOptimize: () => void;
  onGetHints: () => void;
  onDiscuss: (question: string) => void;
}

export default function QuestionInput({
  code,
  problemStatement,
  loading,
  hints,
  discussionMessages,
  codeGenResult,
  onCodeChange,
  onProblemChange,
  onGenerateCode,
  onAnimate,
  onExplain,
  onOptimize,
  onGetHints,
  onDiscuss,
}: QuestionInputProps) {
  const [mode, setMode] = useState<InputMode>('question');
  const [visibleHints, setVisibleHints] = useState(0);
  const [discussInput, setDiscussInput] = useState('');
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [showHints, setShowHints] = useState(false);

  // Handle generating code from question
  const handleGenerateCode = () => {
    if (!problemStatement.trim()) return;
    onGenerateCode();
  };

  // Handle discussion submit
  const handleDiscuss = () => {
    if (!discussInput.trim()) return;
    onDiscuss(discussInput);
    setDiscussInput('');
    setShowDiscussion(true);
  };

  // Reveal next hint
  const showNextHint = () => {
    if (visibleHints < hints.length) {
      setVisibleHints(prev => prev + 1);
    }
  };

  // Check if we have code to work with (either generated or pasted)
  const hasCode = code.trim().length > 0;
  const hasProblem = problemStatement.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Mode toggle: Question or Code */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('question')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'question'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-light text-foreground/60 hover:text-foreground hover:bg-surface-light/80'
          }`}
        >
          💡 Ask a Question
        </button>
        <button
          onClick={() => setMode('code')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'code'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-light text-foreground/60 hover:text-foreground hover:bg-surface-light/80'
          }`}
        >
          📝 Paste Code
        </button>
      </div>

      {/* Question input mode */}
      {mode === 'question' && (
        <div className="space-y-3">
          <textarea
            value={problemStatement}
            onChange={(e) => onProblemChange(e.target.value)}
            placeholder="Type your coding question or problem statement here...&#10;&#10;Examples:&#10;• Reverse a linked list&#10;• Find two numbers that add up to a target&#10;• Implement BFS on a graph&#10;• Find the longest palindromic substring"
            className="w-full h-36 px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <button
            onClick={handleGenerateCode}
            disabled={loading || !hasProblem}
            className="px-5 py-2.5 bg-primary hover:bg-primary-light text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin">⏳</span> Generating...</>
            ) : (
              <><span>🚀</span> Generate Code</>
            )}
          </button>

          {/* Show approach info after code generation */}
          {codeGenResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
            >
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">
                ✨ Code generated using: <span className="font-bold">{codeGenResult.algorithm}</span>
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-300">{codeGenResult.approach}</p>
              {codeGenResult.dataStructures.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {codeGenResult.dataStructures.map((ds) => (
                    <span key={ds} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono rounded-full">
                      {ds}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Code input mode */}
      {mode === 'code' && (
        <textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="Paste your code here...&#10;&#10;Supports: Java, Python, JavaScript, C++&#10;The system will auto-detect the algorithm and data structures used."
          className="w-full h-48 px-4 py-3 bg-surface border border-border rounded-xl text-sm font-mono text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      )}

      {/* Generated/pasted code preview (when in question mode and code exists) */}
      {mode === 'question' && hasCode && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between bg-surface-light px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold text-foreground/60 uppercase">Generated Code</span>
            <button
              onClick={() => setMode('code')}
              className="text-[10px] text-primary hover:text-primary-light transition-colors"
            >
              Edit Code →
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-foreground/80 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {code}
          </pre>
        </div>
      )}

      {/* Action buttons — available once code exists */}
      {hasCode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          <button
            onClick={onAnimate}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            ▶ Animate
          </button>
          <button
            onClick={onExplain}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            📖 Explain
          </button>
          <button
            onClick={onOptimize}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            ⚡ Optimize
          </button>
          <button
            onClick={() => { setShowHints(!showHints); if (hints.length === 0 && hasProblem) onGetHints(); }}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            💡 Hints
          </button>
          <button
            onClick={() => setShowDiscussion(!showDiscussion)}
            disabled={loading && !showDiscussion}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            💬 Discussion
          </button>
        </motion.div>
      )}

      {/* Hints panel — progressive hints revealed one at a time */}
      <AnimatePresence>
        {showHints && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface border border-border rounded-xl overflow-hidden"
          >
            <div className="bg-emerald-500/10 px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                💡 Progressive Hints ({visibleHints}/{hints.length})
              </span>
              {visibleHints < hints.length && (
                <button
                  onClick={showNextHint}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
                >
                  Show Next Hint
                </button>
              )}
            </div>
            <div className="p-4 space-y-3">
              {hints.length === 0 ? (
                <p className="text-xs text-foreground/40 italic">Loading hints...</p>
              ) : (
                hints.slice(0, visibleHints).map((hint, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-3 items-start"
                  >
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      i < 2 ? 'bg-emerald-500' : i < 4 ? 'bg-amber-500' : 'bg-red-500'
                    }`}>
                      {hint.level}
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold text-foreground/50 uppercase">{hint.category}</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">{hint.hint}</p>
                    </div>
                  </motion.div>
                ))
              )}
              {visibleHints === 0 && hints.length > 0 && (
                <p className="text-xs text-foreground/50 text-center">Click &quot;Show Next Hint&quot; to reveal hints one at a time. Try to solve it before peeking!</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discussion panel — interactive Q&A about the problem */}
      <AnimatePresence>
        {showDiscussion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface border border-border rounded-xl overflow-hidden"
          >
            <div className="bg-violet-500/10 px-4 py-2 border-b border-border">
              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase">
                💬 Problem Discussion — Ask anything about this problem
              </span>
            </div>
            <div className="p-4 space-y-3">
              {/* Discussion messages */}
              <div className="max-h-64 overflow-y-auto space-y-3">
                {discussionMessages.length === 0 && (
                  <p className="text-xs text-foreground/40 italic text-center py-4">
                    Ask a question about the problem to get help improving your problem-solving skills.
                    <br />Examples: &quot;What data structure should I use?&quot;, &quot;Why is my approach O(n²)?&quot;, &quot;How do I handle edge cases?&quot;
                  </p>
                )}
                {discussionMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-surface-light border border-border'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      {/* Follow-up question from assistant */}
                      {msg.followUpQuestion && (
                        <p className="mt-2 text-xs opacity-80 italic border-t border-white/10 pt-2">
                          🤔 {msg.followUpQuestion}
                        </p>
                      )}
                      {/* Related concepts */}
                      {msg.relatedConcepts && msg.relatedConcepts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.relatedConcepts.map((concept, j) => (
                            <span key={j} className="px-2 py-0.5 bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[10px] rounded-full">
                              {concept}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Encouragement */}
                      {msg.encouragement && (
                        <p className="mt-1 text-[10px] opacity-60">{msg.encouragement}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Discussion input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discussInput}
                  onChange={(e) => setDiscussInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDiscuss()}
                  placeholder="Ask about the problem..."
                  className="flex-1 px-3 py-2 bg-surface-light border border-border rounded-lg text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <button
                  onClick={handleDiscuss}
                  disabled={loading || !discussInput.trim()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

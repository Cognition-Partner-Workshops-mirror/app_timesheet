'use client';

/**
 * Interview Preparation component.
 * Left side: category tabs (DSA, System Design, Production) with topic-grouped questions.
 * Right side: discussion panel — user can ask a question and get a detailed AI answer.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Difficulty, InterviewAnswer, InterviewCategory } from '@/types';
import * as api from '@/lib/api';

// Category tab config with colors
const CATEGORY_TABS = [
  { id: 'dsa', label: 'DSA', icon: '🧮', color: 'from-indigo-500 to-blue-600' },
  { id: 'system_design', label: 'System Design', icon: '🏗️', color: 'from-emerald-500 to-teal-600' },
  { id: 'production', label: 'Production', icon: '🚀', color: 'from-orange-500 to-red-600' },
];

interface InterviewPrepProps {
  difficulty: Difficulty;
}

export default function InterviewPrep({ difficulty }: InterviewPrepProps) {
  // Category & topic selection state
  const [activeCategory, setActiveCategory] = useState('dsa');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Record<string, InterviewCategory>>({});

  // Discussion panel state
  const [userQuestion, setUserQuestion] = useState('');
  const [answer, setAnswer] = useState<InterviewAnswer | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  // Fetch interview questions on mount
  useEffect(() => {
    api.getInterviewQuestions().then(setQuestions).catch(() => {});
  }, []);

  // Memoize topics for current category to avoid re-renders
  const categoryData = questions[activeCategory];
  const topics = useMemo(
    () => (categoryData ? Object.entries(categoryData.topics) : []),
    [categoryData]
  );

  // Derive effective topic — use activeTopic if valid, otherwise first topic
  const effectiveTopic = useMemo(() => {
    if (activeTopic && categoryData?.topics[activeTopic]) return activeTopic;
    return topics.length > 0 ? topics[0][0] : null;
  }, [activeTopic, categoryData, topics]);

  // Get questions for effective topic
  const currentTopicQuestions = effectiveTopic && categoryData
    ? categoryData.topics[effectiveTopic]?.questions || []
    : [];

  // Ask the AI to answer a question
  const askQuestion = useCallback(async (question: string) => {
    setUserQuestion(question);
    setAnswering(true);
    setAnswerError(null);
    setAnswer(null);
    try {
      const result = await api.answerInterviewQuestion(
        activeCategory,
        effectiveTopic || '',
        question,
        difficulty
      );
      setAnswer(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get answer';
      setAnswerError(msg);
    } finally {
      setAnswering(false);
    }
  }, [activeCategory, effectiveTopic, difficulty]);

  return (
    <div className="flex flex-col gap-4">
      {/* Category tabs — DSA, System Design, Production */}
      <div className="flex gap-2">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              setActiveTopic(null);
              setAnswer(null);
              setUserQuestion('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? `bg-gradient-to-r ${cat.color} text-white shadow-md`
                : 'bg-surface-light text-foreground/60 hover:bg-surface-light/80'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main layout — questions on left, discussion on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Topic pills + Question list */}
        <div className="flex flex-col gap-3">
          {/* Topic pills */}
          <div className="flex flex-wrap gap-1.5">
            {topics.map(([topicId, topicData]) => (
              <button
                key={topicId}
                onClick={() => {
                  setActiveTopic(topicId);
                  setAnswer(null);
                  setUserQuestion('');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  effectiveTopic === topicId
                    ? 'bg-primary text-white'
                    : 'bg-surface-light text-foreground/60 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {topicData.label}
              </button>
            ))}
          </div>

          {/* Question cards */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {currentTopicQuestions.map((q, idx) => (
              <motion.button
                key={idx}
                whileHover={{ x: 2 }}
                onClick={() => askQuestion(q)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  userQuestion === q
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-surface hover:border-primary/30 text-foreground/80'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-primary text-xs font-bold mt-0.5">Q{idx + 1}</span>
                  <span className="text-sm">{q}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* RIGHT: Discussion / Answer panel */}
        <div className="flex flex-col gap-3">
          {/* Custom question input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && userQuestion.trim()) {
                  askQuestion(userQuestion.trim());
                }
              }}
              placeholder="Type your own question or click one from the left..."
              className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-foreground/30"
            />
            <button
              onClick={() => userQuestion.trim() && askQuestion(userQuestion.trim())}
              disabled={!userQuestion.trim() || answering}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-primary-light transition-colors"
            >
              {answering ? 'Thinking...' : 'Ask'}
            </button>
          </div>

          {/* Answer display area */}
          <div className="bg-surface border border-border rounded-xl p-4 min-h-[400px] max-h-[500px] overflow-y-auto">
            <AnimatePresence mode="wait">
              {answering ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-64 gap-3"
                >
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-foreground/50">AI is preparing your answer...</p>
                </motion.div>
              ) : answerError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm"
                >
                  {answerError}
                </motion.div>
              ) : answer ? (
                <motion.div
                  key="answer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Main answer */}
                  <div>
                    <h4 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1">Answer</h4>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{answer.answer}</p>
                  </div>

                  {/* Key points */}
                  {answer.keyPoints && answer.keyPoints.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Key Points</h4>
                      <ul className="space-y-1">
                        {answer.keyPoints.map((point, i) => (
                          <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                            <span className="text-primary mt-0.5 text-xs">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Example */}
                  {answer.example && (
                    <div>
                      <h4 className="text-xs font-semibold text-success uppercase tracking-wider mb-1">Example</h4>
                      <div className="bg-surface-light border border-border rounded-lg p-3">
                        <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap">{answer.example}</pre>
                      </div>
                    </div>
                  )}

                  {/* How to achieve */}
                  {answer.howToAchieve && (
                    <div>
                      <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">How to Achieve</h4>
                      <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{answer.howToAchieve}</p>
                    </div>
                  )}

                  {/* Common mistakes */}
                  {answer.commonMistakes && answer.commonMistakes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-danger uppercase tracking-wider mb-1">Common Mistakes</h4>
                      <ul className="space-y-1">
                        {answer.commonMistakes.map((mistake, i) => (
                          <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                            <span className="text-danger mt-0.5 text-xs">✗</span>
                            {mistake}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Follow-up questions */}
                  {answer.followUpQuestions && answer.followUpQuestions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Follow-up Questions</h4>
                      <div className="space-y-1">
                        {answer.followUpQuestions.map((fq, i) => (
                          <button
                            key={i}
                            onClick={() => askQuestion(fq)}
                            className="block w-full text-left text-sm text-primary/80 hover:text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors"
                          >
                            → {fq}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interview tip */}
                  {answer.interviewTip && (
                    <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-accent mb-1">Interview Tip</h4>
                      <p className="text-sm text-foreground/70">{answer.interviewTip}</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-64 gap-3 text-foreground/30"
                >
                  <span className="text-4xl">💬</span>
                  <p className="text-sm">Select a question or type your own to get a detailed answer</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Interview Preparation page — separate from the main CodeVision AI page.
 * Advanced GFG/TutorialsPoint-style layout with concept-wise sections,
 * customizable categories, and an AI-powered Q&A discussion panel.
 * Three main categories: DSA, System Design, Production.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';
import type { Difficulty, InterviewAnswer, InterviewCategory } from '@/types';
import * as api from '@/lib/api';

// Category configuration with icons, colors, and descriptions
const CATEGORIES = [
  {
    id: 'dsa',
    label: 'DSA',
    icon: '🧮',
    gradient: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/30',
    description: 'Data Structures & Algorithms — Arrays, Trees, Graphs, DP, and more',
  },
  {
    id: 'system_design',
    label: 'System Design',
    icon: '🏗️',
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    description: 'Scalability, Architecture, Caching, Load Balancing, and Real Systems',
  },
  {
    id: 'production',
    label: 'Production',
    icon: '🚀',
    gradient: 'from-orange-500 to-red-600',
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
    description: 'Deployment, Monitoring, Security, CI/CD, and Site Reliability',
  },
];

// Difficulty options for the interview context
const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export default function InterviewPage() {
  const { theme, toggleTheme } = useTheme();

  // Category, topic, difficulty selection
  const [activeCategory, setActiveCategory] = useState('dsa');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [questions, setQuestions] = useState<Record<string, InterviewCategory>>({});

  // Discussion panel state
  const [userQuestion, setUserQuestion] = useState('');
  const [answer, setAnswer] = useState<InterviewAnswer | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  // Sidebar collapsed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch all interview questions on mount
  useEffect(() => {
    api.getInterviewQuestions().then(setQuestions).catch(() => {});
  }, []);

  // Derive topics for current category
  const categoryData = questions[activeCategory];
  const topics = useMemo(
    () => (categoryData ? Object.entries(categoryData.topics) : []),
    [categoryData]
  );

  // Effective topic — use selected or first available
  const effectiveTopic = useMemo(() => {
    if (activeTopic && categoryData?.topics[activeTopic]) return activeTopic;
    return topics.length > 0 ? topics[0][0] : null;
  }, [activeTopic, categoryData, topics]);

  // Questions for current topic
  const currentTopicQuestions = effectiveTopic && categoryData
    ? categoryData.topics[effectiveTopic]?.questions || []
    : [];

  // Active category config
  const activeCatConfig = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];

  // Ask AI for an answer
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

  // Handle submitting custom question via input
  const handleSubmit = useCallback(() => {
    if (userQuestion.trim()) {
      askQuestion(userQuestion.trim());
    }
  }, [userQuestion, askQuestion]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left sidebar — category navigation and topics */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'} bg-surface border-r border-border flex flex-col h-full transition-all duration-300`}>
        {/* Header with back link */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-primary hover:text-primary-light transition-colors text-sm"
            >
              <span>←</span>
              <span>Back to CodeVision</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-surface-light hover:bg-primary/20 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            🎯 Interview Prep
          </h1>
          <p className="text-xs text-foreground/50 mt-1">Concept-wise preparation with AI coaching</p>
        </div>

        {/* Difficulty selector */}
        <div className="px-4 py-3 border-b border-border">
          <label className="text-[10px] font-semibold text-foreground/50 uppercase tracking-widest">Difficulty</label>
          <div className="flex gap-1 mt-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 px-2 py-1 rounded text-xs font-medium capitalize transition-all ${
                  difficulty === d
                    ? 'bg-primary text-white'
                    : 'bg-surface-light text-foreground/50 hover:bg-surface-light/80'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs — vertical */}
        <div className="px-3 py-3 border-b border-border space-y-1.5">
          <label className="text-[10px] font-semibold text-foreground/50 uppercase tracking-widest px-1">Categories</label>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setActiveTopic(null);
                setAnswer(null);
                setUserQuestion('');
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeCategory === cat.id
                  ? `bg-gradient-to-r ${cat.gradient} text-white shadow-md`
                  : 'bg-surface-light text-foreground/60 hover:bg-surface-light/80'
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              <div className="text-left">
                <span className="font-medium">{cat.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Topic list for active category */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <label className="text-[10px] font-semibold text-foreground/50 uppercase tracking-widest px-1 mb-2 block">
            Topics in {activeCatConfig.label}
          </label>
          <div className="space-y-1">
            {topics.map(([topicId, topicData]) => {
              const isActive = effectiveTopic === topicId;
              const qCount = topicData.questions?.length || 0;
              return (
                <button
                  key={topicId}
                  onClick={() => {
                    setActiveTopic(topicId);
                    setAnswer(null);
                    setUserQuestion('');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? `${activeCatConfig.bg} ${activeCatConfig.text} font-medium border ${activeCatConfig.border}`
                      : 'text-foreground/60 hover:bg-surface-light'
                  }`}
                >
                  <span>{topicData.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20' : 'bg-surface-light text-foreground/40'
                  }`}>
                    {qCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-surface border-b border-border px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-surface-light text-foreground/50 transition-colors"
            title="Toggle sidebar"
          >
            {sidebarOpen ? '☰' : '☰'}
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-2xl`}>{activeCatConfig.icon}</span>
            <div>
              <h2 className="text-base font-bold text-foreground">{activeCatConfig.label}</h2>
              <p className="text-xs text-foreground/40">{activeCatConfig.description}</p>
            </div>
          </div>
          {effectiveTopic && categoryData?.topics[effectiveTopic] && (
            <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${activeCatConfig.bg} ${activeCatConfig.text}`}>
              {categoryData.topics[effectiveTopic].label}
            </span>
          )}
        </header>

        {/* Two-column content: questions on left, discussion on right */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5 gap-0">
          {/* Left panel: Question list (2/5 width) */}
          <div className="lg:col-span-2 border-r border-border overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
                  Questions
                </h3>
                <span className="text-xs text-foreground/40">{currentTopicQuestions.length} questions</span>
              </div>

              {/* Question cards */}
              <div className="space-y-2">
                {currentTopicQuestions.map((q, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ x: 3 }}
                    onClick={() => askQuestion(q)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all group ${
                      userQuestion === q
                        ? `border-2 ${activeCatConfig.border} ${activeCatConfig.bg}`
                        : 'border-border bg-surface hover:border-primary/30 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        userQuestion === q
                          ? `bg-gradient-to-br ${activeCatConfig.gradient} text-white`
                          : 'bg-surface-light text-foreground/40 group-hover:text-primary'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground/80 leading-relaxed">{q}</span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-foreground/30 capitalize">{difficulty}</span>
                          <span className="text-[10px] text-foreground/20">•</span>
                          <span className="text-[10px] text-foreground/30">{effectiveTopic?.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Discussion / Q&A (3/5 width) */}
          <div className="lg:col-span-3 overflow-y-auto flex flex-col">
            {/* Custom question input — sticky at top */}
            <div className="p-4 border-b border-border bg-surface sticky top-0 z-10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                  }}
                  placeholder="Type your own question or click one from the left..."
                  className="flex-1 bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-foreground/30"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!userQuestion.trim() || answering}
                  className={`px-5 py-2.5 text-white text-sm font-medium rounded-xl disabled:opacity-40 transition-all bg-gradient-to-r ${activeCatConfig.gradient} hover:shadow-lg hover:shadow-primary/20`}
                >
                  {answering ? '⏳ Thinking...' : '🚀 Ask'}
                </button>
              </div>
            </div>

            {/* Answer display area */}
            <div className="flex-1 p-4">
              <AnimatePresence mode="wait">
                {answering ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-80 gap-4"
                  >
                    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-foreground/50">AI is crafting a detailed answer...</p>
                    <p className="text-xs text-foreground/30">Analyzing context for {activeCatConfig.label}</p>
                  </motion.div>
                ) : answerError ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm"
                  >
                    {answerError}
                  </motion.div>
                ) : answer ? (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    {/* Question being answered */}
                    <div className={`p-3 rounded-xl ${activeCatConfig.bg} border ${activeCatConfig.border}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${activeCatConfig.text}`}>Question</span>
                      <p className="text-sm text-foreground/80 mt-1">{userQuestion}</p>
                    </div>

                    {/* Main answer */}
                    <AnswerSection title="Answer" icon="💡">
                      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{answer.answer}</p>
                    </AnswerSection>

                    {/* Key points */}
                    {answer.keyPoints && answer.keyPoints.length > 0 && (
                      <AnswerSection title="Key Points" icon="📌" accentColor="text-primary">
                        <ul className="space-y-2">
                          {answer.keyPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/70">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">
                                {i + 1}
                              </span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </AnswerSection>
                    )}

                    {/* Example */}
                    {answer.example && (
                      <AnswerSection title="Example" icon="🔍" accentColor="text-success">
                        <div className="bg-surface-light border border-border rounded-lg p-3">
                          <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap leading-relaxed">{answer.example}</pre>
                        </div>
                      </AnswerSection>
                    )}

                    {/* How to achieve */}
                    {answer.howToAchieve && (
                      <AnswerSection title="How to Achieve" icon="🎯" accentColor="text-secondary">
                        <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{answer.howToAchieve}</p>
                      </AnswerSection>
                    )}

                    {/* Common mistakes */}
                    {answer.commonMistakes && answer.commonMistakes.length > 0 && (
                      <AnswerSection title="Common Mistakes" icon="⚠️" accentColor="text-danger">
                        <ul className="space-y-2">
                          {answer.commonMistakes.map((mistake, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/70">
                              <span className="flex-shrink-0 text-danger text-xs mt-0.5">✗</span>
                              {mistake}
                            </li>
                          ))}
                        </ul>
                      </AnswerSection>
                    )}

                    {/* Follow-up questions */}
                    {answer.followUpQuestions && answer.followUpQuestions.length > 0 && (
                      <AnswerSection title="Follow-up Questions" icon="🔗" accentColor="text-accent">
                        <div className="space-y-1.5">
                          {answer.followUpQuestions.map((fq, i) => (
                            <button
                              key={i}
                              onClick={() => askQuestion(fq)}
                              className={`block w-full text-left text-sm hover:${activeCatConfig.bg} px-3 py-2 rounded-lg transition-colors group/fq border border-transparent hover:border-border`}
                            >
                              <span className="text-primary/60 group-hover/fq:text-primary mr-2">→</span>
                              <span className="text-foreground/60 group-hover/fq:text-foreground/80">{fq}</span>
                            </button>
                          ))}
                        </div>
                      </AnswerSection>
                    )}

                    {/* Interview tip */}
                    {answer.interviewTip && (
                      <div className={`bg-gradient-to-r ${activeCatConfig.gradient} rounded-xl p-4 text-white`}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1 text-white/80">💡 Interview Tip</h4>
                        <p className="text-sm leading-relaxed">{answer.interviewTip}</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-80 gap-4 text-foreground/30"
                  >
                    <span className="text-6xl">💬</span>
                    <div className="text-center">
                      <p className="text-base font-medium">Select a question or ask your own</p>
                      <p className="text-xs mt-1">Get detailed AI-powered answers with examples, tips, and follow-up questions</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Reusable answer section wrapper with consistent styling.
 */
function AnswerSection({
  title,
  icon,
  accentColor = 'text-foreground/50',
  children,
}: {
  title: string;
  icon: string;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${accentColor}`}>
        <span>{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  );
}

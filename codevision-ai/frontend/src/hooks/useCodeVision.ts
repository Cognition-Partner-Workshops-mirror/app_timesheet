'use client';

/**
 * Main application state hook for CodeVision AI.
 * Manages global state including code input, language selection,
 * difficulty level, active section, and loading states.
 */
import { useState, useCallback } from 'react';
import type {
  Language,
  Difficulty,
  ActiveSection,
  AnalysisResult,
  ExplanationResult,
  OptimizationResult,
  AnimationResult,
  StoryboardResult,
  ProblemResult,
} from '@/types';
import * as api from '@/lib/api';

export interface CodeVisionState {
  // Input state
  code: string;
  problemStatement: string;
  language: Language;
  difficulty: Difficulty;
  activeSection: ActiveSection;

  // Results state
  analysisResult: AnalysisResult | null;
  explanationResult: ExplanationResult | null;
  optimizationResult: OptimizationResult | null;
  animationResult: AnimationResult | null;
  storyboardResult: StoryboardResult | null;
  problemResult: ProblemResult | null;

  // Loading and error state
  loading: boolean;
  error: string | null;
}

export interface CodeVisionActions {
  setCode: (code: string) => void;
  setProblemStatement: (problem: string) => void;
  setLanguage: (language: Language) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setActiveSection: (section: ActiveSection) => void;
  analyzeCode: () => Promise<void>;
  explainCode: () => Promise<void>;
  optimizeCode: () => Promise<void>;
  generateAnimation: (algorithmType: string, inputData?: unknown) => Promise<void>;
  generateStoryboard: () => Promise<void>;
  solveProblem: () => Promise<void>;
  clearError: () => void;
  clearResults: () => void;
}

export function useCodeVision(): CodeVisionState & CodeVisionActions {
  const [code, setCode] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [language, setLanguage] = useState<Language>('python');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [activeSection, setActiveSection] = useState<ActiveSection>('code-input');

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [explanationResult, setExplanationResult] = useState<ExplanationResult | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [animationResult, setAnimationResult] = useState<AnimationResult | null>(null);
  const [storyboardResult, setStoryboardResult] = useState<StoryboardResult | null>(null);
  const [problemResult, setProblemResult] = useState<ProblemResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearResults = useCallback(() => {
    setAnalysisResult(null);
    setExplanationResult(null);
    setOptimizationResult(null);
    setAnimationResult(null);
    setStoryboardResult(null);
    setProblemResult(null);
  }, []);

  // Wraps an async API call with loading/error state management
  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeCode = useCallback(() => withLoading(async () => {
    const result = await api.analyzeCode(code, language, difficulty);
    setAnalysisResult(result);
    setActiveSection('explanation');
  }), [code, language, difficulty, withLoading]);

  const explainCode = useCallback(() => withLoading(async () => {
    const result = await api.explainCode(code, language, difficulty);
    setExplanationResult(result);
    setActiveSection('explanation');
  }), [code, language, difficulty, withLoading]);

  const optimizeCode = useCallback(() => withLoading(async () => {
    const result = await api.optimizeCode(code, language, difficulty);
    setOptimizationResult(result);
    setActiveSection('optimization');
  }), [code, language, difficulty, withLoading]);

  const generateAnimation = useCallback((algorithmType: string, inputData?: unknown) => withLoading(async () => {
    const result = await api.generateAnimation(algorithmType, language, difficulty, inputData, code || undefined);
    setAnimationResult(result);
    setActiveSection('animation');
  }), [code, language, difficulty, withLoading]);

  const generateStoryboard = useCallback(() => withLoading(async () => {
    const result = await api.generateStoryboard(code, language, difficulty);
    setStoryboardResult(result);
    setActiveSection('storyboard');
  }), [code, language, difficulty, withLoading]);

  const solveProblem = useCallback(() => withLoading(async () => {
    const result = await api.solveProblem(problemStatement, language, difficulty);
    setProblemResult(result);
    setActiveSection('problem-input');
  }), [problemStatement, language, difficulty, withLoading]);

  return {
    code, problemStatement, language, difficulty, activeSection,
    analysisResult, explanationResult, optimizationResult,
    animationResult, storyboardResult, problemResult,
    loading, error,
    setCode, setProblemStatement, setLanguage, setDifficulty, setActiveSection,
    analyzeCode, explainCode, optimizeCode,
    generateAnimation, generateStoryboard, solveProblem,
    clearError, clearResults,
  };
}

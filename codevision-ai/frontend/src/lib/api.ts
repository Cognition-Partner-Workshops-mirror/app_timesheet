/**
 * API client for communicating with the CodeVision AI backend.
 * Provides typed functions for each API endpoint.
 */
import axios from 'axios';
import type {
  Language,
  Difficulty,
  AnalysisResult,
  ExplanationResult,
  OptimizationResult,
  AnimationResult,
  StoryboardResult,
  ProblemResult,
  PlaygroundOperation,
  Session,
  LogicBlock,
} from '@/types';

// Backend API base URL - configurable via environment variable
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60s timeout for AI-powered requests
});

// Analyze code for logic, inefficiencies, and best practices
export async function analyzeCode(
  code: string, language: Language, difficulty: Difficulty
): Promise<AnalysisResult> {
  const { data } = await api.post('/analyze', { code, language, difficulty });
  return data;
}

// Get line-by-line code explanation
export async function explainCode(
  code: string, language: Language, difficulty: Difficulty
): Promise<ExplanationResult> {
  const { data } = await api.post('/explain', { code, language, difficulty });
  return data;
}

// Optimize code and compare complexity
export async function optimizeCode(
  code: string, language: Language, difficulty: Difficulty
): Promise<OptimizationResult> {
  const { data } = await api.post('/optimize', { code, language, difficulty });
  return data;
}

// Generate algorithm animation steps
export async function generateAnimation(
  algorithmType: string,
  language: Language,
  difficulty: Difficulty,
  inputData?: unknown,
  code?: string
): Promise<AnimationResult> {
  const { data } = await api.post('/animation/generate', {
    algorithmType, language, difficulty, inputData, code,
  });
  return data;
}

// Generate teaching storyboard slides
export async function generateStoryboard(
  code: string, language: Language, difficulty: Difficulty
): Promise<StoryboardResult> {
  const { data } = await api.post('/animation/storyboard', { code, language, difficulty });
  return data;
}

// Solve a coding problem with multiple approaches
export async function solveProblem(
  problem: string, language: Language, difficulty: Difficulty
): Promise<ProblemResult> {
  const { data } = await api.post('/problem/solve', { problem, language, difficulty });
  return data;
}

// Perform data structure playground operation
export async function playgroundOperate(
  dataStructure: string,
  operation: string,
  language: Language,
  difficulty: Difficulty,
  params?: Record<string, unknown>
): Promise<PlaygroundOperation> {
  const { data } = await api.post('/playground/operate', {
    dataStructure, operation, params, language, difficulty,
  });
  return data;
}

// Convert visual logic blocks to source code
export async function visualToCode(
  blocks: LogicBlock[], language: Language
): Promise<{ generatedCode: string; language: string; explanation: string }> {
  const { data } = await api.post('/playground/visual-to-code', { blocks, language });
  return data;
}

// Fetch all saved learning sessions
export async function getSessions(): Promise<Session[]> {
  const { data } = await api.get('/session');
  return data;
}

// Fetch a specific session with all related data
export async function getSession(id: string): Promise<Session> {
  const { data } = await api.get(`/session/${id}`);
  return data;
}

// Delete a session
export async function deleteSession(id: string): Promise<void> {
  await api.delete(`/session/${id}`);
}

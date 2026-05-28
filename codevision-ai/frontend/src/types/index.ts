/**
 * Core type definitions for CodeVision AI frontend.
 * Defines all data structures used across components.
 */

// Supported programming languages
export type Language = 'python' | 'javascript' | 'java' | 'cpp';

// Difficulty levels for explanations
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// Tab/section identifiers for the main application
export type ActiveSection =
  | 'problem-input'
  | 'code-input'
  | 'logic-builder'
  | 'explanation'
  | 'optimization'
  | 'animation'
  | 'storyboard'
  | 'playground'
  | 'problem-solver';

// Line-by-line explanation structure from AI
export interface LineExplanation {
  lineNumber: number;
  code: string;
  explanation: string;
  purpose: string;
  dataState: string;
  analogy?: string;
}

// Full code explanation response
export interface ExplanationResult {
  id?: string;
  sessionId?: string;
  language: string;
  title: string;
  overview: string;
  lines: LineExplanation[];
  keyConcepts: string[];
  commonMistakes: string[];
}

// Code analysis response
export interface AnalysisResult {
  sessionId?: string;
  language: string;
  title: string;
  logic: string;
  inefficiencies: Array<{ issue: string; severity: string; suggestion: string }>;
  codeSmells: Array<{ smell: string; location: string }>;
  bestPractices: string[];
  complexity: { time: string; space: string };
  overallScore: number;
  summary: string;
}

// Optimization comparison entry
export interface ComparisonEntry {
  aspect: string;
  before: string;
  after: string;
  improvement: string;
}

// Code optimization response
export interface OptimizationResult {
  id?: string;
  sessionId?: string;
  language: string;
  originalAnalysis: {
    logic: string;
    inefficiencies: string[];
    timeComplexity: string;
    spaceComplexity: string;
  };
  optimizedCode: string;
  optimizedAnalysis: {
    improvements: string[];
    timeComplexity: string;
    spaceComplexity: string;
  };
  comparisonTable: ComparisonEntry[];
  tradeOffs: string[];
  edgeCases: string[];
}

// Single step in an algorithm animation
export interface AnimationStep {
  stepNumber: number;
  operation: string;
  description: string;
  highlightIndices: number[];
  activeElements: number[];
  state: {
    elements: (number | string)[];
    variables: Record<string, number | string>;
    pointers: Record<string, number>;
  };
  codeLineHighlight?: number;
  explanation: string;
}

// Full animation data response
export interface AnimationResult {
  id?: string;
  sessionId?: string;
  algorithmName: string;
  description: string;
  dataStructureType: string;
  initialState: { elements: (number | string)[]; metadata: Record<string, unknown> };
  steps: AnimationStep[];
  finalState: { elements: (number | string)[] };
  complexity: { time: string; space: string };
}

// Single storyboard slide for teaching videos
export interface StoryboardSlide {
  slideNumber: number;
  type: string;
  title: string;
  content: string;
  bulletPoints: string[];
  codeSnippet?: string;
  highlightLines?: number[];
  visualDescription: string;
  speakerNotes: string;
  duration: number;
}

// Full storyboard response
export interface StoryboardResult {
  title: string;
  totalSlides: number;
  estimatedDuration: string;
  slides: StoryboardSlide[];
}

// Problem-solving approach
export interface ProblemApproach {
  name: string;
  intuition: string;
  algorithm: string[];
  code: string;
  language: string;
  timeComplexity: string;
  spaceComplexity: string;
  pros: string[];
  cons: string[];
}

// Problem-solving response
export interface ProblemResult {
  id?: string;
  sessionId?: string;
  problemSummary: string;
  realWorldAnalogy: string;
  approaches: ProblemApproach[];
  dryRun: {
    input: string;
    steps: Array<{ step: number; state: string; explanation: string }>;
    output: string;
  };
  edgeCases: Array<{ case: string; expectedBehavior: string }>;
  interviewTips: string[];
  followUpQuestions: string[];
  keyTakeaways: string[];
}

// Logic builder block for drag-and-drop
export interface LogicBlock {
  id: string;
  type: 'start' | 'end' | 'variable' | 'loop' | 'condition' | 'operation' | 'function' | 'output' | 'input';
  label: string;
  connections: string[];
  params: Record<string, string>;
}

// Data structure playground operation
export interface PlaygroundOperation {
  dataStructure: string;
  operation: string;
  explanation: string;
  steps: Array<{
    stepNumber: number;
    description: string;
    state: Record<string, unknown>;
    highlightElements: number[];
    explanation: string;
  }>;
  codeImplementation: string;
  language: string;
  complexity: { time: string; space: string };
  realWorldAnalogy: string;
}

// Learning session stored in database
export interface Session {
  id: string;
  title: string;
  language: Language;
  difficulty: Difficulty;
  code?: string;
  problem_statement?: string;
  created_at: string;
  updated_at: string;
}

'use client';

/**
 * Syntax-highlighted code display component.
 * Wraps react-syntax-highlighter with consistent dark theme styling.
 * Supports optional line highlighting for step-by-step walkthroughs.
 */
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Language } from '@/types';

// Maps our language identifiers to syntax highlighter language names
const LANGUAGE_MAP: Record<Language, string> = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp',
};

interface CodeHighlightProps {
  code: string;
  language: Language;
  highlightLines?: number[];
  showLineNumbers?: boolean;
}

export default function CodeHighlight({
  code, language, highlightLines = [], showLineNumbers = true,
}: CodeHighlightProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <SyntaxHighlighter
        language={LANGUAGE_MAP[language] || 'python'}
        style={vscDarkPlus}
        showLineNumbers={showLineNumbers}
        wrapLines
        lineProps={(lineNumber: number) => {
          const isHighlighted = highlightLines.includes(lineNumber);
          return {
            style: {
              backgroundColor: isHighlighted ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              borderLeft: isHighlighted ? '3px solid #6366f1' : '3px solid transparent',
              display: 'block',
              paddingLeft: '0.5em',
            },
          };
        }}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          background: '#1e1e3f',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

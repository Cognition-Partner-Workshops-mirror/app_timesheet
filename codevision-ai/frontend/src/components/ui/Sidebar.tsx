'use client';

/**
 * Sidebar navigation component.
 * Provides section switching, language/difficulty selectors,
 * and a light/dark theme toggle.
 */
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { ActiveSection, Language, Difficulty } from '@/types';
import type { Theme } from '@/hooks/useTheme';

// Navigation items with icons and labels for each section
const NAV_ITEMS: Array<{ id: ActiveSection; label: string; icon: string }> = [
  { id: 'code-input', label: 'Code Input', icon: '📝' },
  { id: 'problem-input', label: 'Problem Solver', icon: '🧩' },
  { id: 'explanation', label: 'Explanation', icon: '📖' },
  { id: 'optimization', label: 'Optimization', icon: '⚡' },
  { id: 'animation', label: 'Animation', icon: '🎬' },
  { id: 'storyboard', label: 'Storyboard', icon: '🎓' },
  { id: 'playground', label: 'Playground', icon: '🔧' },
  { id: 'logic-builder', label: 'Logic Builder', icon: '🧱' },
];

// Available programming languages
const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
];

// Difficulty level options — uses theme-adaptive colors
const DIFFICULTIES: Array<{ value: Difficulty; label: string; lightColor: string; darkColor: string }> = [
  { value: 'beginner', label: 'Beginner', lightColor: 'text-green-600', darkColor: 'text-green-400' },
  { value: 'intermediate', label: 'Intermediate', lightColor: 'text-yellow-600', darkColor: 'text-yellow-400' },
  { value: 'advanced', label: 'Advanced', lightColor: 'text-red-600', darkColor: 'text-red-400' },
];

interface SidebarProps {
  activeSection: ActiveSection;
  language: Language;
  difficulty: Difficulty;
  theme: Theme;
  onSectionChange: (section: ActiveSection) => void;
  onLanguageChange: (language: Language) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onThemeToggle: () => void;
}

export default function Sidebar({
  activeSection, language, difficulty, theme,
  onSectionChange, onLanguageChange, onDifficultyChange, onThemeToggle,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col h-full">
      {/* App branding + theme toggle */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-light to-secondary bg-clip-text text-transparent">
              CodeVision AI
            </h1>
            <p className="text-xs text-foreground/50 mt-1">AI-Powered Code Learning</p>
          </div>
          {/* Light/Dark mode toggle button */}
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-lg bg-surface-light hover:bg-primary/20 transition-colors text-lg"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {/* Language selector */}
      <div className="p-4 border-b border-border">
        <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Language</label>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
          className="mt-1 w-full bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
      </div>

      {/* Difficulty selector */}
      <div className="p-4 border-b border-border">
        <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Difficulty</label>
        <div className="mt-2 flex flex-col gap-1">
          {DIFFICULTIES.map((diff) => (
            <button
              key={diff.value}
              onClick={() => onDifficultyChange(diff.value)}
              className={`text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                difficulty === diff.value
                  ? 'bg-primary/20 text-primary-light font-medium'
                  : 'hover:bg-surface-light text-foreground/60'
              }`}
            >
              <span className={theme === 'dark' ? diff.darkColor : diff.lightColor}>{diff.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSectionChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-1 ${
              activeSection === item.id
                ? 'bg-primary/20 text-primary-light font-medium'
                : 'hover:bg-surface-light text-foreground/60'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </motion.button>
        ))}
        {/* Interview Prep — separate page link */}
        <Link
          href="/interview"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-1 hover:bg-surface-light text-foreground/60 hover:text-primary"
        >
          <span className="text-lg">🎯</span>
          <span>Interview Prep</span>
          <span className="ml-auto text-xs text-foreground/30">↗</span>
        </Link>
      </nav>
    </aside>
  );
}

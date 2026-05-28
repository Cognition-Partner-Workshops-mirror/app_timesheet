'use client';

/**
 * Storyboard teaching player.
 * Presents AI-generated slides in a video-like format
 * with auto-advance, manual navigation, and speaker notes.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { StoryboardResult, Language } from '@/types';
import CodeHighlight from '../code-editor/CodeHighlight';

interface StoryboardPlayerProps {
  result: StoryboardResult;
  language: Language;
}

// Slide type to color/icon mapping for visual distinction
const SLIDE_STYLES: Record<string, { bg: string; icon: string }> = {
  intro: { bg: 'from-blue-600/20 to-purple-600/20', icon: '🎯' },
  explanation: { bg: 'from-green-600/20 to-teal-600/20', icon: '📖' },
  dryRun: { bg: 'from-yellow-600/20 to-orange-600/20', icon: '🔄' },
  code: { bg: 'from-indigo-600/20 to-blue-600/20', icon: '💻' },
  complexity: { bg: 'from-red-600/20 to-pink-600/20', icon: '📊' },
  comparison: { bg: 'from-purple-600/20 to-pink-600/20', icon: '⚖' },
  summary: { bg: 'from-emerald-600/20 to-green-600/20', icon: '🎉' },
};

export default function StoryboardPlayer({ result, language }: StoryboardPlayerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const slide = result.slides[currentSlide];
  const slideStyle = SLIDE_STYLES[slide?.type] || SLIDE_STYLES.explanation;

  // Auto-advance based on slide duration.
  // result.slides.length is in deps so timer re-evaluates if slides change.
  useEffect(() => {
    if (!isAutoPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    const slidesLength = result.slides.length;
    const duration = (slide?.duration || 30) * 1000;
    timerRef.current = setTimeout(() => {
      setCurrentSlide(prev => {
        if (prev >= slidesLength - 1) {
          setIsAutoPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAutoPlaying, currentSlide, slide?.duration, result.slides.length]);

  const goToSlide = useCallback((index: number) => {
    setIsAutoPlaying(false);
    setCurrentSlide(index);
  }, []);

  if (!slide) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{result.title}</h2>
          <p className="text-xs text-foreground/50">
            {result.totalSlides} slides · {result.estimatedDuration}
          </p>
        </div>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
            showNotes ? 'bg-primary/20 text-primary-light' : 'bg-surface-light text-foreground/60'
          }`}
        >
          {showNotes ? 'Hide Notes' : 'Speaker Notes'}
        </button>
      </div>

      {/* Slide content area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className={`bg-gradient-to-br ${slideStyle.bg} border border-border rounded-xl p-8 min-h-[400px]`}
        >
          {/* Slide type badge and number */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{slideStyle.icon}</span>
            <span className="text-xs uppercase tracking-wider text-foreground/50">
              {slide.type} · Slide {slide.slideNumber} of {result.totalSlides}
            </span>
          </div>

          {/* Slide title */}
          <h3 className="text-xl font-bold text-foreground mb-4">{slide.title}</h3>

          {/* Slide main content */}
          <p className="text-sm text-foreground/80 leading-relaxed mb-4">{slide.content}</p>

          {/* Bullet points */}
          {slide.bulletPoints && slide.bulletPoints.length > 0 && (
            <ul className="space-y-2 mb-4">
              {slide.bulletPoints.map((point, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-sm text-foreground/70 flex items-start gap-2"
                >
                  <span className="text-primary-light mt-0.5">▸</span>
                  {point}
                </motion.li>
              ))}
            </ul>
          )}

          {/* Code snippet if present */}
          {slide.codeSnippet && (
            <div className="mt-4">
              <CodeHighlight
                code={slide.codeSnippet}
                language={language}
                highlightLines={slide.highlightLines || []}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Speaker notes (toggleable) */}
      {showNotes && slide.speakerNotes && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-surface-light border border-border rounded-lg p-4"
        >
          <h4 className="text-xs font-semibold text-foreground/50 uppercase mb-1">Speaker Notes</h4>
          <p className="text-sm text-foreground/70 italic">{slide.speakerNotes}</p>
        </motion.div>
      )}

      {/* Slide thumbnail strip */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {result.slides.map((s, i) => {
          const style = SLIDE_STYLES[s.type] || SLIDE_STYLES.explanation;
          return (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`flex-shrink-0 w-16 h-10 rounded border text-[10px] flex items-center justify-center transition-all ${
                i === currentSlide
                  ? 'border-primary bg-primary/20 text-primary-light'
                  : 'border-border bg-surface text-foreground/40 hover:border-primary/50'
              }`}
            >
              {style.icon} {i + 1}
            </button>
          );
        })}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-center gap-3 bg-surface border border-border rounded-lg px-4 py-3">
        <button
          onClick={() => goToSlide(0)}
          className="p-2 hover:bg-surface-light rounded-lg text-foreground/60 hover:text-foreground transition-colors"
        >
          ⏮
        </button>
        <button
          onClick={() => goToSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="p-2 hover:bg-surface-light rounded-lg text-foreground/60 hover:text-foreground transition-colors disabled:opacity-30"
        >
          ⏪
        </button>
        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg font-medium transition-colors"
        >
          {isAutoPlaying ? '⏸ Pause' : '▶ Auto Play'}
        </button>
        <button
          onClick={() => goToSlide(Math.min(result.slides.length - 1, currentSlide + 1))}
          disabled={currentSlide >= result.slides.length - 1}
          className="p-2 hover:bg-surface-light rounded-lg text-foreground/60 hover:text-foreground transition-colors disabled:opacity-30"
        >
          ⏩
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-light rounded-full h-1.5">
        <motion.div
          className="bg-primary h-1.5 rounded-full"
          animate={{ width: `${result.slides.length > 1 ? (currentSlide / (result.slides.length - 1)) * 100 : 0}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}

'use client';

/**
 * Collapsible/minimizable section wrapper with maximize support.
 * Each section can be expanded, collapsed, or maximized (full width).
 * When maximized, other sections are pushed below.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** Unique id used for maximize state management */
  sectionId?: string;
  /** Currently maximized section id from parent */
  maximizedSection?: string | null;
  /** Callback when maximize/restore is toggled */
  onMaximizeToggle?: (sectionId: string | null) => void;
}

export default function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
  sectionId,
  maximizedSection,
  onMaximizeToggle,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Check if this section is currently maximized
  const isMaximized = sectionId != null && maximizedSection === sectionId;
  // If another section is maximized, this one should be minimized
  const isHiddenByMaximize = maximizedSection != null && !isMaximized;

  return (
    <div
      className={`border border-border rounded-xl overflow-hidden bg-surface shadow-sm transition-all duration-300 ${
        isMaximized ? 'ring-2 ring-primary/30' : ''
      } ${isHiddenByMaximize ? 'hidden' : ''}`}
    >
      {/* Section header — click title to collapse/expand, maximize button on right */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-light hover:bg-surface-light/80 transition-colors">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground flex-1 text-left"
        >
          {icon && <span className="text-base">{icon}</span>}
          {title}
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-foreground/40 text-xs ml-1"
          >
            ▼
          </motion.span>
        </button>

        {/* Maximize/Restore button */}
        {sectionId && onMaximizeToggle && (
          <button
            onClick={() => onMaximizeToggle(isMaximized ? null : sectionId)}
            className="p-1.5 rounded-lg hover:bg-primary/10 text-foreground/40 hover:text-primary transition-colors ml-2"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              // Restore icon — two overlapping squares
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="0.5" width="10" height="10" rx="1.5" />
                <rect x="0.5" y="3.5" width="10" height="10" rx="1.5" />
              </svg>
            ) : (
              // Maximize icon — single square
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="12" height="12" rx="1.5" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Collapsible content area */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

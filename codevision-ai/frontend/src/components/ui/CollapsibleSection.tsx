'use client';

/**
 * Collapsible/minimizable section wrapper.
 * Each section can be expanded or collapsed with a header toggle.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-sm">
      {/* Section header — click to toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-light hover:bg-surface-light/80 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon && <span className="text-base">{icon}</span>}
          {title}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-foreground/40"
        >
          ▼
        </motion.span>
      </button>

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

'use client';

/**
 * Error banner component.
 * Displays error messages with a dismiss button.
 */
import { motion } from 'framer-motion';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="text-danger text-lg">⚠</span>
        <p className="text-danger text-sm">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-danger/60 hover:text-danger text-sm px-2"
      >
        Dismiss
      </button>
    </motion.div>
  );
}

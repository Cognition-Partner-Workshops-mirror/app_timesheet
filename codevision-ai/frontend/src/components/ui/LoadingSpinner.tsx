'use client';

/**
 * Animated loading spinner with optional message.
 * Displays a pulsing brain icon while AI processes requests.
 */
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = 'AI is thinking...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary"
      />
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-foreground/60 text-sm"
      >
        {message}
      </motion.p>
    </div>
  );
}

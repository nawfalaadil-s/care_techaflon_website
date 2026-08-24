import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const DOOMSDAY_QUOTES = [
  "I am inevitable.",
  "The end is near. Will you survive?",
  "Power. Technology. Survival.",
  "Build your legacy before darkness falls.",
  "Time is running out, developer.",
  "The apocalypse waits for no one.",
  "Code is your weapon. Use it wisely.",
];

/** Floating doom-sayer quote bubble — desktop only, purely decorative. */
export function DoomsdayCharacter() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [quote, setQuote] = useState(DOOMSDAY_QUOTES[0]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show character after page load
    const showTimer = setTimeout(() => setVisible(true), 1000);

    // Cycle through quotes
    const quoteInterval = setInterval(() => {
      setQuote(DOOMSDAY_QUOTES[Math.floor(Math.random() * DOOMSDAY_QUOTES.length)]);
    }, 8000);

    return () => {
      clearTimeout(showTimer);
      clearInterval(quoteInterval);
    };
  }, []);

  if (!visible) return null;

  return (
    <motion.aside
      aria-hidden="true"
      initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="pointer-events-none fixed right-4 top-20 z-40 hidden lg:block"
    >
      <div className="relative max-w-[220px] rounded-lg border border-danger/40 bg-surface-elevated/90 px-4 py-3 shadow-glow backdrop-blur-sm">
        <p className="text-hud mb-1 text-[10px] uppercase tracking-widest text-danger-bright">
          Dr. Doom
        </p>
        <p className="font-display text-sm italic leading-snug text-steel-bright">
          “{quote}”
        </p>
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-danger/40 bg-surface-elevated"
        />
      </div>
    </motion.aside>
  );
}

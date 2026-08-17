import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrailNode {
  id: string;
  label: string;
}

interface KnowledgeTrailProps {
  trail: TrailNode[];
  activeStep: number;
  isPlaying: boolean;
  onStepChange: (step: number) => void;
  onPlayToggle: () => void;
  onReset: () => void;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export function KnowledgeTrail({
  trail,
  activeStep,
  isPlaying,
  onStepChange,
  onPlayToggle,
  onReset,
  onNodeClick,
  className,
}: KnowledgeTrailProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        onStepChange(activeStep + 1);
      }, 2000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isPlaying, activeStep, onStepChange, clearTimer]);

  // Stop playing when we reach the end
  useEffect(() => {
    if (isPlaying && activeStep >= trail.length - 1) {
      clearTimer();
    }
  }, [isPlaying, activeStep, trail.length, clearTimer]);

  if (trail.length === 0) return null;

  return (
    <div className={cn('w-full', className)}>
      {/* Trail header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Knowledge Trail</h3>
        <span className="text-[10px] text-neutral-400 tabular-nums">
          {activeStep + 1} / {trail.length}
        </span>
      </div>

      {/* Trail steps */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-black/10 dark:bg-white/10" />

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {trail.map((node, i) => {
              const isCompleted = i < activeStep;
              const isCurrent = i === activeStep;
              const isUpcoming = i > activeStep;

              return (
                <motion.div
                  key={node.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{
                    opacity: isUpcoming ? 0.3 : 1,
                    x: 0,
                  }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    'flex items-center gap-3 cursor-pointer group',
                    isUpcoming && 'pointer-events-none',
                  )}
                  onClick={() => {
                    if (!isUpcoming) {
                      onStepChange(i);
                      onNodeClick?.(node.id);
                    }
                  }}
                >
                  {/* Node dot */}
                  <div className="relative shrink-0">
                    <motion.div
                      animate={{
                        scale: isCurrent ? 1.3 : 1,
                        backgroundColor: isCompleted
                          ? 'rgb(0,0,0)'
                          : isCurrent
                            ? 'rgb(38,38,38)'
                            : 'rgba(0,0,0,0.1)',
                      }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        'w-[22px] h-[22px] rounded-full flex items-center justify-center',
                        'border-2 transition-colors duration-300',
                        isCompleted
                          ? 'border-black dark:border-white bg-black dark:bg-white'
                          : isCurrent
                            ? 'border-black/50 dark:border-white/50 bg-transparent'
                            : 'border-black/15 dark:border-white/15 bg-transparent',
                      )}
                    >
                      {isCompleted ? (
                        <span className="text-white dark:text-black text-[9px] font-bold">✓</span>
                      ) : (
                        <span
                          className={cn(
                            'text-[9px] font-semibold',
                            isCurrent
                              ? 'text-black/60 dark:text-white/60'
                              : 'text-neutral-400',
                          )}
                        >
                          {i + 1}
                        </span>
                      )}
                    </motion.div>

                    {/* Glow for current node */}
                    {isCurrent && (
                      <motion.div
                        layoutId="trail-glow"
                        className="absolute -inset-1.5 rounded-full border border-black/20 dark:border-white/20"
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'text-sm font-medium transition-colors duration-300',
                        isCompleted
                          ? 'text-black dark:text-white'
                          : isCurrent
                            ? 'text-black dark:text-white'
                            : 'text-neutral-400 dark:text-neutral-500',
                      )}
                    >
                      {node.label}
                    </span>
                    {isCurrent && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="h-0.5 bg-black/20 dark:bg-white/20 rounded-full mt-1"
                      />
                    )}
                  </div>

                  {/* Direction arrow */}
                  {i < trail.length - 1 && (
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 shrink-0 transition-colors duration-300',
                        isUpcoming ? 'text-neutral-300' : 'text-neutral-500',
                      )}
                      strokeWidth={1.5}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-black/5 dark:border-white/10">
        <button
          onClick={onReset}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-black dark:hover:text-white transition-all"
          title="Reset Trail"
        >
          <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => activeStep > 0 && onStepChange(activeStep - 1)}
          disabled={activeStep <= 0}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-black dark:hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous Step"
        >
          <SkipBack className="w-3 h-3" strokeWidth={1.5} />
        </button>
        <button
          onClick={onPlayToggle}
          disabled={activeStep >= trail.length - 1}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title={isPlaying ? 'Pause Trail' : 'Play Trail'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5" strokeWidth={1.5} />
          ) : (
            <Play className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
        </button>
        <button
          onClick={() => activeStep < trail.length - 1 && onStepChange(activeStep + 1)}
          disabled={activeStep >= trail.length - 1}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-black dark:hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next Step"
        >
          <SkipForward className="w-3 h-3" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

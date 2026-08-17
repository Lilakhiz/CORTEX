import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Brain,
  GitBranch,
  Share2,
  Eye,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { animate } from 'animejs';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Future search stage animation component                            */
/* ------------------------------------------------------------------ */

export interface StageDef {
  id: string;
  label: string;
  icon: keyof typeof iconMap;
  duration: number; // ms
}

const iconMap = {
  Search,
  Brain,
  GitBranch,
  Share2,
  Eye,
  Loader2,
  CheckCircle,
};

interface SearchStagesProps {
  stages: StageDef[];
  activeStage: number;
  completed: boolean;
  className?: string;
  /** SSE-driven mode: use completedStages and currentStageIndex instead of activeStage/completed */
  completedStages?: string[];
  currentStageIndex?: number;
}

/**
 * An animated vertical pipeline that shows search stages completing one by one.
 * Re-usable for future backend integration.
 */
export function SearchStages({
  stages,
  activeStage,
  completed,
  className,
  completedStages = [],
  currentStageIndex = 0,
}: SearchStagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine which mode we're in
  const isSSEMode = completedStages.length > 0 || currentStageIndex > 0;
  
  // In SSE mode, derive activeStage and completed from SSE data
  const derivedActiveStage = isSSEMode ? currentStageIndex : activeStage;
  const derivedCompleted = isSSEMode ? completedStages.length >= stages.length : completed;

  useEffect(() => {
    if (!containerRef.current) return;
    const items = containerRef.current.querySelectorAll('[data-stage-item]');
    if (items.length === 0) return;

    // Animate current stage
    const currentItem = items[derivedActiveStage] as HTMLElement | undefined;
    if (currentItem) {
      animate(currentItem, {
        scale: [0.97, 1],
        opacity: [0.6, 1],
        duration: 300,
        ease: 'outQuad',
      });
    }
  }, [derivedActiveStage, derivedCompleted]);

  return (
    <div ref={containerRef} className={cn('space-y-0', className)}>
      {stages.map((stage, i) => {
        const isActive = i === derivedActiveStage && !derivedCompleted;
        const isDone = isSSEMode 
          ? completedStages.includes(stage.id) 
          : (i < derivedActiveStage || derivedCompleted);
        const Icon = iconMap[stage.icon] ?? Loader2;

        return (
          <div key={stage.id} data-stage-item className="flex items-center gap-3 py-2">
            {/* Icon */}
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300',
                isDone
                  ? 'bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60'
                  : isActive
                    ? 'bg-black/15 dark:bg-white/15 text-black dark:text-white'
                    : 'bg-black/5 dark:bg-white/5 text-neutral-400',
              )}
            >
              {isDone ? (
                <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              ) : isActive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
              ) : (
                <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-xs transition-all duration-300',
                isDone
                  ? 'text-black/60 dark:text-white/60 line-through decoration-1 decoration-black/20 dark:decoration-white/20'
                  : isActive
                    ? 'text-black dark:text-white font-medium'
                    : 'text-neutral-400 dark:text-neutral-500',
              )}
            >
              {stage.label}
            </span>

            {/* Duration indicator */}
            {isActive && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: stage.duration / 1000, ease: 'linear' }}
                className="flex-1 h-px bg-black/20 dark:bg-white/20 max-w-[60px] ml-auto"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
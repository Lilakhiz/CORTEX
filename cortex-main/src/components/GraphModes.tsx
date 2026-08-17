import { motion } from 'framer-motion';
import {
  Share2,
  Clock,
  Building,
  User,
  Cpu,
  Newspaper,
} from 'lucide-react';
import { graphModes } from '@/data/mock-data';
import { cn } from '@/lib/utils';

const modeIconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Share2,
  Clock,
  Building,
  User,
  Cpu,
  Newspaper,
};

interface GraphModesProps {
  activeMode: string;
  onModeChange: (modeId: string) => void;
  className?: string;
}

export function GraphModes({ activeMode, onModeChange, className }: GraphModesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex items-center gap-0.5 p-0.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg shadow-xs',
        className,
      )}
    >
      {graphModes.map((mode) => {
        const Icon = modeIconMap[mode.icon] || Share2;
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium',
              'transition-all duration-200',
              isActive
                ? 'text-black dark:text-white'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5',
            )}
          >
            {isActive && (
              <motion.div
                layoutId="graph-mode-bg"
                className="absolute inset-0 bg-black/10 dark:bg-white/10 rounded-lg"
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <Icon className="relative w-3 h-3" strokeWidth={1.5} />
          </button>
        );
      })}
    </motion.div>
  );
}

import { ExternalLink, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Source } from '@/data/mock-data';
import { cn } from '@/lib/utils';

interface SourceCardProps {
  source: Source;
  index?: number;
}

export function SourceCard({ source, index = 0 }: SourceCardProps) {
  return (
    <motion.a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group flex items-start gap-3 p-3.5 rounded-xl',
        'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]',
        'transition-all duration-200',
        'cursor-pointer',
      )}
    >
      {/* Favicon */}
      <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 overflow-hidden border border-black/5 dark:border-white/10">
        {source.favicon ? (
          <img src={source.favicon} alt="" className="w-4 h-4" crossOrigin="anonymous" />
        ) : (
          <ExternalLink className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-black dark:text-white truncate group-hover:text-black/80 dark:group-hover:text-white/80 transition-colors">
            {source.title}
          </h4>
          <Bookmark className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400 shrink-0 transition-colors" strokeWidth={1.5} />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
          {source.description}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <ExternalLink className="w-3 h-3 text-neutral-400" strokeWidth={1.5} />
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400 transition-colors">
            Visit source
          </span>
        </div>
      </div>
    </motion.a>
  );
}

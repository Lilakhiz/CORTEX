import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ChevronDown, Search, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  graphIcon?: boolean;
}

interface SearchHistoryProps {
  searches: SearchHistoryItem[];
  onSelect: (query: string) => void;
  onClear: () => void;
  className?: string;
}

function groupSearches(searches: SearchHistoryItem[]) {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  const yesterdayTs = todayTs - 86400000;

  const groups: { label: string; items: SearchHistoryItem[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const s of searches) {
    if (s.timestamp >= todayTs) {
      groups[0].items.push(s);
    } else if (s.timestamp >= yesterdayTs) {
      groups[1].items.push(s);
    } else {
      groups[2].items.push(s);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export function SearchHistory({ searches, onSelect, onClear, className }: SearchHistoryProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Today: true,
    Yesterday: true,
    Earlier: true,
  });

  const groups = groupSearches(searches);

  if (searches.length === 0) return null;

  return (
    <div className={cn('w-full', className)}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-1 py-1.5 group"
      >
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Search History</span>
          <span className="text-[10px] text-neutral-400 tabular-nums">({searches.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
            title="Clear history"
          >
            <X className="w-3 h-3 text-neutral-400" strokeWidth={1.5} />
          </button>
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-2">
              {groups.map((group) => (
                <div key={group.label}>
                  <button
                    onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
                    className="flex items-center gap-1.5 px-1 py-1 group"
                  >
                    <motion.div
                      animate={{ rotate: expandedGroups[group.label] ? 180 : 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ChevronDown className="w-2.5 h-2.5 text-neutral-400" strokeWidth={2} />
                    </motion.div>
                    <span className="text-[11px] font-medium text-neutral-400">{group.label}</span>
                  </button>

                  <AnimatePresence>
                    {expandedGroups[group.label] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0.5 pl-4">
                          {group.items.map((item, i) => (
                            <motion.button
                              key={`${item.query}-${i}`}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: i * 0.03 }}
                              onClick={() => onSelect(item.query)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all text-left"
                            >
                              {item.graphIcon ? (
                                <div className="w-4 h-4 rounded bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full border border-black/30 dark:border-white/30" />
                                </div>
                              ) : (
                                <Search className="w-3 h-3 text-neutral-300" strokeWidth={1.5} />
                              )}
                              <span className="truncate">{item.query}</span>
                              <Clock className="w-2.5 h-2.5 text-neutral-300 ml-auto shrink-0" strokeWidth={1.5} />
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

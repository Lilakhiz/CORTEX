import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Shield, Link2, ExternalLink, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Relationship } from '@/data/mock-data';
import { cn } from '@/lib/utils';

interface RelationshipPanelProps {
  relationship: Relationship | null;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  partner: 'Partnership',
  competitor: 'Competitor',
  investor: 'Investment',
  founder: 'Founder',
  technology: 'Technology',
  industry: 'Industry',
  supplier: 'Supplier',
  acquired: 'Acquisition',
  collaboration: 'Collaboration',
};

export function RelationshipPanel({ relationship, onClose }: RelationshipPanelProps) {
  if (!relationship) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 320 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 320 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white dark:bg-neutral-950 border-l border-black/10 dark:border-white/10 shadow-xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-black/60 dark:text-white/60" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-black dark:text-white">Relationship</h2>
              <p className="text-[11px] text-neutral-500">{relationship.relationshipName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-neutral-500" strokeWidth={1.5} />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            {/* Type badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[11px] px-2.5 py-1 rounded-lg border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400 font-normal"
              >
                {typeLabels[relationship.type] || relationship.type}
              </Badge>
            </div>

            {/* Why Connected */}
            <div>
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Link2 className="w-3 h-3" strokeWidth={1.5} />
                Why Connected
              </h3>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-[350]">
                {relationship.whyConnected}
              </p>
            </div>

            {/* Confidence + Strength */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-black/50 dark:text-white/50" strokeWidth={1.5} />
                  <span className="text-xs text-neutral-500">Confidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${relationship.confidence}%` }}
                      transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-black/50 dark:bg-white/50"
                    />
                  </div>
                  <span className="text-xs font-medium text-black dark:text-white tabular-nums">{relationship.confidence}%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-black/50 dark:text-white/50" strokeWidth={1.5} />
                  <span className="text-xs text-neutral-500">Strength</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${relationship.strength}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-black/40 dark:bg-white/40"
                    />
                  </div>
                  <span className="text-xs font-medium text-black dark:text-white tabular-nums">{relationship.strength}%</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Supporting Sources */}
            <div>
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                Supporting Sources
              </h3>
              <div className="space-y-2">
                {relationship.supportingSources.map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-black/5 dark:border-white/10">
                        <ExternalLink className="w-3 h-3 text-neutral-400" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-black dark:text-white">{source.title}</h4>
                        <p className="text-xs text-neutral-500 mt-0.5">{source.description}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <Separator />

            {/* Related Events */}
            <div>
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Related Events</h3>
              <div className="space-y-2">
                {relationship.relatedEvents.map((event, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20 mt-1.5 shrink-0" />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 font-[350]">{event}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Related Questions */}
            <div>
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <HelpCircle className="w-3 h-3" strokeWidth={1.5} />
                Related Questions
              </h3>
              <div className="space-y-1.5">
                {relationship.relatedQuestions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors font-[350]">
                      {q}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}

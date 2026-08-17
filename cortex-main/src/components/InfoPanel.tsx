import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ExternalLink,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatPanel } from '@/components/ChatPanel';

/* ------------------------------------------------------------------ */
/*  Collapsible Section Wrapper                                        */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/*  Interface                                                          */
/* ------------------------------------------------------------------ */

interface BackendNode {
  id: string;
  name: string;
  type: string;
}

interface BackendEvidence {
  title?: string;
  url?: string;
  source?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  // Add other edge properties as needed
}

interface InfoPanelProps {
  node: BackendNode | null;
  answer: string;
  evidence: BackendEvidence[];
  graph: {
    nodes?: BackendNode[];
    edges?: GraphEdge[];
  };

  onClose: () => void;
  onNodeNavigate?: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function InfoPanel({
  node,
  answer,
  evidence,
  graph,
  onClose,
  onNodeNavigate
}: InfoPanelProps) {

  if (!node) return null;

  const connectedEdges =
    graph?.edges?.filter(
      (edge: GraphEdge) => edge.source === node.id || edge.target === node.id
    ) || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        className="w-[420px] h-full border-l bg-background flex flex-col"
      >
        {/* Header */}

        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-bold text-xl">{node.name}</h2>
            <p className="text-sm opacity-70">{node.type}</p>
          </div>

          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <ScrollArea className="flex-1">

          <div className="p-5 space-y-8">

            <div>
              <h3 className="font-semibold mb-3">
                AI Summary
              </h3>

              <p className="text-sm leading-7">
                {answer}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">
                Connected Entities
              </h3>

              <div className="space-y-2">

                {connectedEdges.map((edge: GraphEdge, i: number) => {

                  const other =
                    edge.source === node.id
                      ? edge.target
                      : edge.source;

                  return (
                    <button
                      key={i}
                      onClick={() => onNodeNavigate?.(other)}
                      className="block w-full rounded border p-2 text-left hover:bg-muted"
                    >
                      {other}
                    </button>
                  );
                })}

              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">
                Sources
              </h3>

              <div className="space-y-3">

                {evidence.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    className="flex items-center justify-between rounded border p-3 hover:bg-muted"
                  >
                    <span>
                      {src.title || src.source}
                    </span>

                    <ExternalLink size={15} />
                  </a>
                ))}

              </div>
            </div>

          </div>

        </ScrollArea>

        <div className="border-t h-[280px]">

          <ChatPanel
            nodeId={node.id}
            nodeName={node.name}
            suggestedQuestions={[]}
          />

        </div>

      </motion.div>
    </AnimatePresence>
  );
}
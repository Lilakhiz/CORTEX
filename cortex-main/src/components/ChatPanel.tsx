import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Bot, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mockChatResponses } from '@/data/mock-data';
import type { ChatMessage } from '@/data/mock-data';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Per-node chat history store                                        */
/* ------------------------------------------------------------------ */
const chatHistoryStore = new Map<string, ChatMessage[]>();

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function ChatPanel({ nodeId, nodeName, suggestedQuestions = [], onQuestionClick }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const existing = getHistory(nodeId);
    if (existing.length > 0) return existing;
    return [
      {
        id: `welcome-${nodeId}`,
        role: 'assistant',
        content: `I can help you explore **${nodeName}**. Ask me anything about its connections, history, or significance.`,
        timestamp: Date.now(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist to store whenever messages change
  useEffect(() => {
    setHistory(nodeId, messages);
  }, [messages, nodeId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Get the responses array for this nodeId, falling back to default
    let responses: string[] | undefined = mockChatResponses[nodeId];
    if (responses === undefined) {
      // mockChatResponses.default is string[]
      responses = mockChatResponses.default as string[];
    }
    const response = responses![Math.floor(Math.random() * responses!.length)];

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  }, [isTyping, nodeId]);

  const handleSend = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle suggested question click
  const handleSuggestionClick = useCallback((q: string) => {
    setInput(q);
    setTimeout(() => sendMessage(q), 200);
    onQuestionClick?.(q);
  }, [sendMessage, onQuestionClick]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages area */}
      <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef}>
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'flex gap-2',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-2.5 h-2.5 text-black/50 dark:text-white/50" strokeWidth={1.5} />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[88%] rounded-xl px-3 py-2 text-[11px] leading-relaxed',
                    msg.role === 'assistant'
                      ? 'bg-black/[0.03] dark:bg-white/[0.05] text-neutral-700 dark:text-neutral-300 border border-black/5 dark:border-white/10'
                      : 'bg-black dark:bg-white text-white dark:text-black shadow-sm',
                  )}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-black/50 dark:text-white/50" strokeWidth={1.5} />
              </div>
              <div className="rounded-xl px-3 py-2 bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Suggested questions above input */}
      {suggestedQuestions.length > 0 && messages.length <= 2 && !isTyping && (
        <div className="px-3 py-1.5 border-t border-black/5 dark:border-white/10">
          <div className="flex items-center gap-1 mb-1.5">
            <HelpCircle className="w-2.5 h-2.5 text-neutral-400" strokeWidth={1.5} />
            <span className="text-[9px] text-neutral-400 font-medium uppercase tracking-wider">Ask about this topic</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {suggestedQuestions.slice(0, 4).map((q) => (
              <button
                key={q}
                onClick={() => handleSuggestionClick(q)}
                className="px-2 py-1 rounded-lg text-[10px] text-neutral-500 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 hover-border-black/30 dark:hover:border-white/30 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat input */}
      <div className="px-3 py-2 border-t border-black/5 dark:border-white/10">
        <div className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.05] rounded-xl border border-black/10 dark:border-white/10 px-3 transition-all duration-200 focus-within:border-black/30 dark:focus-within:border-white/30">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Cortex about this topic..."
            className="flex-1 bg-transparent text-xs text-black dark:text-white placeholder:text-neutral-400 py-2 outline-none"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 active:scale-90',
              input.trim() && !isTyping
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'text-neutral-400',
            )}
          >
            <Send className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface ChatPanelProps {
  nodeId: string;
  nodeName: string;
  suggestedQuestions?: string[];
  onQuestionClick?: (question: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helper functions                                                  */
/* ------------------------------------------------------------------ */
function getHistory(nodeId: string): ChatMessage[] {
  return chatHistoryStore.get(nodeId) || [];
}

function setHistory(nodeId: string, messages: ChatMessage[]) {
  chatHistoryStore.set(nodeId, messages);
}
import { useState } from "react";

interface NodeData {
  id: string;
  name: string;
  type: string;
  evidence: EvidenceItem[];
  sources: string[];
  evidence_ids: string[];
  summary?: string;
}

interface EvidenceItem {
  id: string;
  title: string;
  source: string;
  url: string;
  // Add other evidence properties as needed
}

interface AIChatPanelProps {
  node: NodeData | null;
}

export default function AIChatPanel({ node }: AIChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(""); // Keep this for now, might be used elsewhere
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  if (!node) {
    return (
      <div className="w-full border-l border-zinc-800 bg-black flex items-center justify-center text-zinc-500">
        Select a node to explore
      </div>
    );
  }

  const handleAsk = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setError("");

    // Add user message to chat
    const userMessage = { role: "user" as const, content: question };
    setMessages((prev) => [...prev, userMessage]);

    const currentQuestion = question;
    setQuestion("");

    try {
      // Build graph context from node's evidence
      const graphContext = node.evidence
        .map((ev: EvidenceItem) => `${ev.title} (${ev.source})`)
        .join("; ");

      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentQuestion,
          node_name: node.name,
          node_type: node.type,
          graph_context: graphContext,
          evidence: node.evidence,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnswer(data.answer || "No answer received.");
      setMessages((prev) => [...prev, { role: "assistant" as const, content: data.answer || "No answer received." }]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setMessages((prev) => [...prev, { role: "assistant" as const, content: `Error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="w-full h-full border-l border-zinc-800 bg-black flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800 shrink-0">
        <h2 className="text-2xl font-semibold">
          {node.name}
        </h2>

        <p className="text-zinc-500 mt-1">
          {node.type}
        </p>
      </div>

      {/* Ask AI */}
      <div className="flex-1 flex flex-col p-5 min-h-0 gap-4">
        <h3 className="text-sm uppercase text-zinc-500 mb-3">
          Ask AI
        </h3>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-white text-black rounded-br-none"
                    : "bg-zinc-800 text-white rounded-bl-none"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 text-white px-4 py-2 rounded-2xl rounded-bl-none">
                <div className="flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="text-red-400 text-sm p-2 bg-red-900/20 rounded-lg">
            Error: {error}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2 shrink-0">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${node.name}...`}
            className="flex-1 bg-zinc-900 rounded-xl p-3 h-28 resize-none outline-none text-white placeholder-zinc-500"
            disabled={isLoading}
          />

          <button
            onClick={handleAsk}
            disabled={isLoading || !question.trim()}
            className="bg-white text-black rounded-xl py-2 px-6 font-medium hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 self-end mb-2"
          >
            {isLoading ? "Thinking..." : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}
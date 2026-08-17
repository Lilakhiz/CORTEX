import { useCallback, useState } from 'react';
import { searchStages } from '@/data/mock-data';

export interface SearchStage {
  id: string;
  label: string;
  icon: "Brain" | "Search" | "GitBranch" | "Share2" | "Eye" | "Loader2" | "CheckCircle";
  duration: number;
}

export interface SearchResult {
  answer: string;
  graph: {
    nodes: any;
    edges: any;
  };
  evidence: any[];
}

interface UseSearchOptions {
  onComplete?: (result: SearchResult) => void;
  onError?: (error: string) => void;
}

export function useSearchStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [stages] = useState<SearchStage[]>(searchStages); // FIX: Use actual stages from mock data
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startSearch = useCallback(
    async (query: string, options: UseSearchOptions = {}) => {
      if (!query.trim()) return;

      setIsStreaming(true);
      setError(null);
      setCompletedStages([]); // Reset completed stages on new search
      setCurrentStageIndex(0); // Reset current stage index

      try {
        const baseUrl =
          import.meta.env.VITE_API_URL ||
          "http://127.0.0.1:8000";

        const response = await fetch(`${baseUrl}/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const result: SearchResult = await response.json();

        setIsStreaming(false);
        // Complete all stages when we get results
        setCompletedStages(stages.map(s => s.id));
        setCurrentStageIndex(stages.length);

        if (options.onComplete) {
          options.onComplete(result);
        }
      } catch (err) {
        console.error("Search error:", err);

        const message =
          err instanceof Error ? err.message : "Search failed";

        setError(message);
        setIsStreaming(false);

        if (options.onError) {
          options.onError(message);
        }
      }
    },
    []
  );

  const abort = useCallback(() => {
    setIsStreaming(false);
    setError(null);
    setCompletedStages([]); // Reset on abort
    setCurrentStageIndex(0); // Reset on abort
  }, []);

  return {
    isStreaming,
    stages,
    currentStageIndex,
    completedStages,
    error,
    startSearch,
    abort,
  };
}
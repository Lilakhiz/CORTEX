import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  Settings,
  TrendingUp,
  History,
  Save,
  Search,
} from "lucide-react";

import ProfileSettings from "@/components/ProfileSettings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KnowledgeGraph, knowledgeTrails } from "@/components/KnowledgeGraph";
import type { KnowledgeGraphHandle } from "@/components/KnowledgeGraph";
import { GraphToolbar } from "@/components/GraphToolbar";
import { GraphModes } from "@/components/GraphModes";
import { RelationshipPanel } from "@/components/RelationshipPanel";
import { SearchHistory } from "@/components/SearchHistory";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from 'react-router';
import { dashboardSearchSuggestions, generateMockBackendGraph } from "@/data/mock-data";
import type { Relationship } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import AIChatPanel from "@/components/AIChatPanel";
import { useSearchStream } from "@/hooks/use-search-stream";
import { SearchLoading } from "@/components/SearchLoading";

// Types for backend data
type BackendGraph = {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    label?: string;
    evidence_ids?: string[];
    sources?: string[];
  }>;
  edges: Array<{
    id?: string;
    source: string;
    target: string;
    relation: string;
    relationship?: string;
  }>;
};

// Raw shapes returned by the backend before normalization into BackendGraph
type RawGraphNode = {
  id: string;
  name?: string;
  label?: string;
  type?: string;
  evidence_ids?: string[];
  sources?: string[];
};

type RawGraphEdge = {
  id?: string;
  source: string;
  target: string;
  relationship?: string;
};

type BackendEvidenceItem = {
  id: string;
  title: string;
  url: string;
  source: string;
};

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  graphIcon?: boolean;
}

export default function Dashboard() {
  const { user, signOut, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const graphRef = useRef<KnowledgeGraphHandle>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const localGuestMarker = (() => {
    try {
      const saved = localStorage.getItem('cortex_user');
      if (!saved) return false;
      const parsed = JSON.parse(saved) as { name?: string; email?: string };
      return (
        parsed?.email?.toLowerCase() === 'guest@cortex.explore' ||
        parsed?.name?.toLowerCase() === 'guest user'
      );
    } catch {
      return false;
    }
  })();

  const isAnonymousUser =
    !!user && 'isAnonymous' in user && user.isAnonymous === true;

  const isGuestUser =
    isAnonymousUser ||
    user?.email?.toLowerCase() === 'guest@cortex.explore' ||
    user?.name?.toLowerCase() === 'guest user' ||
    localGuestMarker;

  const shouldShowSearchHistory = !isAuthLoading && !isGuestUser;

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("sidebarWidth");
    return saved ? Number(saved) : 420;
  });

  const [savedGraphs] = useState<string[]>([]);

  const isResizing = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [graphMode, setGraphMode] = useState('knowledge');
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [backendAnswer, setBackendAnswer] = useState("");
  const [backendGraph, setBackendGraph] = useState<BackendGraph | null>(null);
  const [backendEvidence, setBackendEvidence] = useState<BackendEvidenceItem[]>([]);

  // Knowledge trail state
  const [trailActive, setTrailActive] = useState(false);
  const [trailNodes, setTrailNodes] = useState<{ id: string }[]>([]);
  const [trailStep, setTrailStep] = useState(0);
  const [trailPlaying, setTrailPlaying] = useState(false);

  // Search history
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    const now = Date.now();
    return [
      { query: 'Elon Musk', timestamp: now - 3600000, graphIcon: true },
      { query: 'Quantum Computing', timestamp: now - 86400000, graphIcon: true },
      { query: 'CRISPR', timestamp: now - 172800000, graphIcon: true },
    ];
  });

  // Use search stream hook for SSE-based search
  const {
    isStreaming,
    stages,
    error: streamError,
    startSearch,
  } = useSearchStream();

  // FIX: Add state to track when loading animation should complete
  const [isLoadingVisible, setIsLoadingVisible] = useState(false);
  const [prevIsStreaming, setPrevIsStreaming] = useState(isStreaming);
  const loadingAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show loading immediately when search starts. This adjusts state during
  // render (React's documented pattern for reacting to a changing value)
  // instead of calling setState synchronously inside an effect.
  if (isStreaming !== prevIsStreaming) {
    setPrevIsStreaming(isStreaming);
    if (isStreaming) {
      setIsLoadingVisible(true);
    }
  }

  // Hide loading after the SearchStages animation completes when search ends
  useEffect(() => {
    if (isStreaming) return;

    if (loadingAnimationTimeoutRef.current) {
      clearTimeout(loadingAnimationTimeoutRef.current);
    }
    // The SearchStages animation duration is based on the stages data
    const totalDuration = Array.isArray(stages)
      ? stages.reduce((sum, stage) => sum + (stage.duration || 0), 0)
      : 0;
    loadingAnimationTimeoutRef.current = setTimeout(() => {
      setIsLoadingVisible(false);
    }, totalDuration + 100); // Add small buffer

    return () => {
      if (loadingAnimationTimeoutRef.current) {
        clearTimeout(loadingAnimationTimeoutRef.current);
      }
    };
  }, [isStreaming, stages]);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;

      const newWidth = window.innerWidth - e.clientX;

      if (newWidth < 320) return;
      if (newWidth > 700) return;

      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isResizing.current) return;

      isResizing.current = false;
      localStorage.setItem("sidebarWidth", sidebarWidth.toString());

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [sidebarWidth]);

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;

      setShowSuggestions(false);

      const newItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: Date.now(),
        graphIcon: true,
      };

      if (shouldShowSearchHistory) {
        setSearchHistory((prev) => {
          const filtered = prev.filter((s) => s.query !== query.trim());
          return [newItem, ...filtered].slice(0, 20);
        });
      }

      // Start SSE-based search
      startSearch(query, {
        onComplete: (result) => {
          // Save backend response
          setBackendAnswer(result.answer || "");

          // Use fallback graph if backend returns empty nodes/edges
          const graphData: BackendGraph = result.graph?.nodes?.length > 0
            ? {
                nodes: result.graph.nodes.map((node: RawGraphNode) => ({
                  id: node.id,
                  name: node.name ?? node.label ?? node.id,
                  type: node.type ?? "Entity",
                  label: node.label,
                  evidence_ids: node.evidence_ids,
                  sources: node.sources,
                })),
                edges: (result.graph.edges ?? []).map((edge: RawGraphEdge) => ({
                  id: edge.id,
                  source: edge.source,
                  target: edge.target,
                  relation: edge.relationship ?? "related-to",
                  relationship: edge.relationship,
                })),
              }
            : generateMockBackendGraph();
          setBackendGraph(graphData);

          // Don't auto-select first node - let user click to select
          // Initial state should show AI Summary (no node selected)
          setBackendEvidence(result.evidence || []);

          // Show graph page
          setHasSearched(true);
        },
        onError: (error) => {
          console.error('Search error:', error);
        },
      });
    },
    [shouldShowSearchHistory, startSearch],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const selectedNodeData = useMemo(() => {
    if (!backendGraph || !selectedNode) return null;

    const node = backendGraph.nodes.find(
      (n) => n.id === selectedNode
    );

    if (!node) return null;

    // Find evidence specific to this node
    const nodeEvidenceIds = node.evidence_ids || [];
    const nodeSources = node.sources || [];
    const nodeEvidence = backendEvidence.filter(
      (ev) => nodeEvidenceIds.includes(ev.id)
    );

    return {
      id: node.id,
      name: node.name ?? node.label ?? node.id,
      type: node.type ?? "Entity",
      evidence: nodeEvidence,
      sources: nodeSources,
      evidence_ids: nodeEvidenceIds,
    };
  }, [backendGraph, selectedNode, backendEvidence]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const suggestedSearches = searchQuery
    ? dashboardSearchSuggestions.filter((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : dashboardSearchSuggestions;

  // Graph toolbar handlers
  const handleZoomIn = () => graphRef.current?.zoomIn();
  const handleZoomOut = () => graphRef.current?.zoomOut();
  // Edge click handler
  const handleEdgeClick = useCallback((_edgeId: string, relationship: Relationship | undefined) => {
    setSelectedRelationship(relationship ?? null);
  }, []);

  // When trail step changes from playing, update selected node
  useEffect(() => {
    if (trailPlaying && trailNodes[trailStep]) {
      const nodeId = trailNodes[trailStep].id;
      // Highlight but don't open panel for every step in play mode
      if (graphRef.current) {
        graphRef.current.centerNode(nodeId);
      }
    }
  }, [trailStep, trailPlaying, trailNodes]);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-black dark:text-white flex flex-col">
      {/* ===== TOP NAV ===== */}
      <header className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16 border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md sticky top-0 z-30">
        {/* Left */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-5.5 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-black dark:bg-white flex items-center justify-center">
            <span className="text-white dark:text-black text-[10px] font-bold">
              C
            </span>
          </div>

          <span className="text-sm font-semibold tracking-tight hidden sm:block">
            Cortex
          </span>
        </button>

        {/* Center - Search */}
        <div
          ref={searchRef}
          className="relative flex-1 max-w-lg mx-4"
        >
          <div
            className={cn(
              'flex items-center gap-2 px-3.5 h-9 rounded-xl border transition-all duration-200',
              isSearchFocused
                ? 'border-black/30 dark:border-white/30 shadow-sm'
                : 'border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.05]',
            )}
          >
            <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" strokeWidth={1.5} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                setIsSearchFocused(true);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search anything..."
              className="flex-1 bg-transparent text-sm text-black dark:text-white placeholder:text-neutral-400 outline-none font-[350]"
            />
          </div>

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showSuggestions && !isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-lg overflow-hidden"
              >
                <div className="p-1.5">
                  {searchQuery && suggestedSearches.length > 0 && (
                    <div className="px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                      Suggestions
                    </div>
                  )}
                  {suggestedSearches.slice(0, 6).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setSearchQuery(suggestion);
                        handleSearch(suggestion);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-black dark:hover:text-white transition-all"
                    >
                      <Search className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                      {suggestion}
                    </button>
                  ))}
                  {shouldShowSearchHistory && !searchQuery && searchHistory.length > 0 && (
                    <>
                      <div className="px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-3 h-3" strokeWidth={1.5} />
                        Recent
                      </div>
                      {searchHistory.slice(0, 4).map((item) => (
                        <button
                          key={`${item.query}-${item.timestamp}`}
                          onClick={() => {
                            setSearchQuery(item.query);
                            handleSearch(item.query);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-black dark:hover:text-white transition-all"
                        >
                          {item.graphIcon ? (
                            <div className="w-3.5 h-3.5 rounded bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full border border-black/30 dark:border-white/30" />
                            </div>
                          ) : (
                            <History className="w-3.5 h-3.5 text-neutral-300" strokeWidth={1.5} />
                          )}
                          {item.query}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Settings
              className="w-4 h-4 text-neutral-500"
              strokeWidth={1.5}
            />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-2 rounded-full focus:outline-none">
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src={localStorage.getItem("cortex_image") || ""}
                  />
                  <AvatarFallback
                    className="bg-black text-white dark:bg-white dark:text-black text-xs font-semibold"
                  >
                    {(localStorage.getItem("cortex_name")?.charAt(0) ||
                      user?.name?.charAt(0) ||
                      "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-64 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900"
            >
              <DropdownMenuLabel className="py-3">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">
                    {localStorage.getItem("cortex_name") ||
                      user?.name ||
                      "Guest User"}
                  </span>
                  <span className="text-xs text-neutral-500 mt-1">
                    {user?.email || "guest@cortex.explore"}
                  </span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex">
        {/* Main area */}
        <div className="flex-1 flex flex-col relative">
          {/* Empty state when no node selected and not searching */}
          {!hasSearched && !isStreaming ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-lg text-center"
              >
                {/* Decorative graph animation in background */}
                <div className="relative h-32 mb-8">
                  <svg className="w-full h-full" viewBox="0 0 200 100">
                    <motion.circle
                      r={3}
                      fill="#000"
                      opacity={0.1}
                      animate={{
                        cx: [30, 170, 100, 30],
                        cy: [50, 20, 80, 50],
                      }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.circle
                      r={2}
                      fill="#000"
                      opacity={0.08}
                      animate={{
                        cx: [100, 30, 170, 100],
                        cy: [20, 80, 50, 20],
                      }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.circle
                      r={2.5}
                      fill="#000"
                      opacity={0.06}
                      animate={{
                        cx: [170, 100, 30, 170],
                        cy: [80, 50, 20, 80],
                      }}
                      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Connecting lines */}
                    <motion.line
                      x1={30} y1={50} x2={170} y2={20}
                      stroke="#000" strokeOpacity={0.05} strokeWidth={0.5}
                      animate={{ opacity: [0.03, 0.08, 0.03] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    <motion.line
                      x1={170} y1={20} x2={100} y2={80}
                      stroke="#000" strokeOpacity={0.05} strokeWidth={0.5}
                      animate={{ opacity: [0.05, 0.1, 0.05] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                    <motion.line
                      x1={100} y1={80} x2={30} y2={50}
                      stroke="#000" strokeOpacity={0.05} strokeWidth={0.5}
                      animate={{ opacity: [0.04, 0.09, 0.04] }}
                      transition={{ duration: 3.5, repeat: Infinity }}
                    />
                  </svg>
                </div>

                <h2 className="text-lg font-semibold text-black dark:text-white mb-2">
                  Search for anything
                </h2>
                <p className="text-sm text-neutral-500 font-[350] max-w-xs mx-auto">
                  Start exploring by searching for a topic, company, person, or idea.
                </p>

                {/* Search History */}
                {shouldShowSearchHistory && (
                  <div className="mt-8 w-full max-w-sm mx-auto">
                    <SearchHistory
                      searches={searchHistory}
                      onSelect={(query) => {
                        setSearchQuery(query);
                        handleSearch(query);
                      }}
                      onClear={() => setSearchHistory([])}
                    />
                  </div>
                )}

                {/* Trending topics */}
                <div className="mt-6">
                  <div className="flex items-center gap-1 justify-center mb-4">
                    <TrendingUp className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                    <span className="text-xs text-neutral-400 font-medium">Trending topics</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {dashboardSearchSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSearchQuery(s);
                          handleSearch(s);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 hover-border-black/30 dark:hover:border-white/30 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Saved graphs */}
                {savedGraphs.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-1.5 justify-center mb-4">
                      <Save className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                      <span className="text-xs text-neutral-400 font-medium">Saved graphs</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {savedGraphs.map((g) => (
                        <button
                          key={g}
                          className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 hover-border-black/30 dark:hover:border-white/30 transition-all"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          ) : isStreaming ? (
            /* Streaming loading state with real-time progress - FIXED */
            <div className="flex-1 flex flex-col items-center justify-center px-4"
                 style={{
                   // Ensure loading stays visible until animation completes
                   minHeight: '400px',
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}>
              {/* Fixed loading screen that stays visible until animation completes */}
              {isLoadingVisible && (
                <div className="fixed inset-0 bg-black/50 dark:bg-white/50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-neutral-900 rounded-xl p-8 shadow-2xl max-w-md w-full text-center">
                    <SearchLoading className="mb-4" />
                    {streamError && (
                      <div className="mt-4 text-sm text-red-500">{streamError}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Original content (will be hidden when loading is visible) */}
              {!isLoadingVisible && (
                <>
                  {streamError && (
                    <div className="mt-4 text-sm text-red-500">{streamError}</div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Graph view when node is selected */
            <div className="flex-1 relative flex flex-col">
              {/* Graph modes */}
              <div className="flex items-center justify-center px-4 pt-3 pb-2">
                <GraphModes
                  activeMode={graphMode}
                  onModeChange={setGraphMode}
                />
              </div>

              {/* Graph + Toolbar */}
              <div className="flex-1 relative">
                <div className="absolute inset-0">
                  <KnowledgeGraph
                    graph={backendGraph ?? undefined}
                    ref={graphRef}
                    interactive={true}
                    selectedNode={selectedNode}
                    onNodeClick={(nodeId) => {
                      setSelectedNode(nodeId);
                      setSelectedRelationship(null);
                      if (nodeId) {
                        const trail = knowledgeTrails[nodeId];
                        if (trail) {
                          const mapped: { id: string }[] = trail.map((t) => ({ id: t.id }));
                          setTrailNodes(mapped);
                          setTrailStep(0);
                          setTrailActive(true);
                          setTrailPlaying(false);
                        }
                      } else {
                        setTrailActive(false);
                      }
                    }}
                    onEdgeClick={handleEdgeClick}
                    graphMode={graphMode}
                    trailHighlightedNodeIds={trailActive && trailNodes.length > 0 ? trailNodes.slice(0, trailStep + 1).map((t) => t.id) : []}
                    className="h-full"
                  />
                </div>

                {/* Floating Toolbar */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                  <GraphToolbar
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={() => {
            isResizing.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          className="w-1 hover:w-2 cursor-col-resize transition-all bg-transparent hover:bg-white/10"
        />

        {/* Right Sidebar Panel - Shows backendAnswer when no node selected, AIChatPanel when node selected */}
        {(hasSearched && !isStreaming) && (
          <div
            style={{ width: sidebarWidth }}
            className="flex-shrink-0 h-[calc(100vh-64px)]"
          >
            {selectedNodeData ? (
              <AIChatPanel
                node={selectedNodeData}
              />
            ) : (
              <div className="w-full h-full border-l border-zinc-800 bg-black flex flex-col overflow-y-auto">
                {/* Header */}
                <div className="p-5 border-b border-zinc-800 shrink-0">
                  <h2 className="text-2xl font-semibold">
                    Overall Summary
                  </h2>
                  <p className="text-zinc-500 mt-1">
                    Search Results
                  </p>
                </div>

                {/* Backend Answer / Overall Summary */}
                <div className="flex-1 p-5 overflow-y-auto">
                  <h3 className="text-sm uppercase text-zinc-500 mb-3">
                    AI Summary
                  </h3>
                  <div className="text-sm leading-7 text-zinc-300 whitespace-pre-wrap">
                    {backendAnswer || "No summary available."}
                  </div>
                </div>

                {/* Evidence / Sources */}
                {backendEvidence.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm uppercase text-zinc-500 mb-3">
                      Sources ({backendEvidence.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {backendEvidence.map((ev, idx) => (
                        <div key={ev.id ?? idx} className="text-sm text-zinc-300">
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-zinc-400"
                          >
                            {ev.title || "(untitled)"}
                          </a>
                          <span className="text-zinc-500 ml-2">({ev.source})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer hint */}
                <div className="p-5 border-t border-zinc-800 shrink-0">
                  <p className="text-sm text-zinc-500 text-center">
                    Click a node on the graph to explore it in detail
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Relationship Panel */}
        {selectedRelationship && (
          <RelationshipPanel
            relationship={selectedRelationship}
            onClose={() => {
              setSelectedRelationship(null);
            }}
          />
        )}
      </div>
      <ProfileSettings
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            user={user}
          />
    </div>
  );
}
import { useCallback, useState, useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Relationship } from '@/data/mock-data';

import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
} from "d3-force";





/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CortexNodeData {
  label: string;
  type: string;
  icon: string;
  selected?: boolean;
  highlighted?: boolean;
  trailHighlighted?: boolean;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  data: CortexNodeData;
  radius: number;
  z: number; // depth layer 0-1
}


interface BackendNode {
  id: string;
  name: string;
  type: string;
}

interface BackendEdge {
  source: string;
  target: string;
  relation: string;
}

interface BackendGraph {
  nodes: BackendNode[];
  edges: BackendEdge[];
}

interface KnowledgeGraphProps {
  graph?: BackendGraph;

  className?: string;
  interactive?: boolean;

  onNodeClick?: (nodeId: string) => void;

  onEdgeClick?: (
    edgeId: string,
    relationship: Relationship | undefined
  ) => void;

  selectedNode?: string | null;

  graphMode?: string;

  trailActiveNode?: string | null;

  trailHighlightedNodeIds?: string[];
}

export interface KnowledgeGraphHandle {
  fitView: (duration?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  centerNode: (nodeId: string) => void;
  rearrange: () => void;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */



const iconMap: Record<string, string> = {
  Zap: '⚡',
  User: '👤',
  Cpu: '🖥',
  Brain: '🧠',
  Sparkles: '✨',
  Battery: '🔋',
};

const modePositions: Record<string, Partial<Record<string, { x: number; y: number }>>> = {
  knowledge: {},
  timeline: {
    tesla: { x: -150, y: -80 },
    'elon-musk': { x: -200, y: -40 },
    nvidia: { x: 150, y: 40 },
    openai: { x: -50, y: 100 },
    ai: { x: 50, y: 140 },
    batteries: { x: 200, y: -40 },
  },
  organizations: {
    tesla: { x: -150, y: 0 },
    nvidia: { x: 150, y: 0 },
    openai: { x: 0, y: 100 },
  },
  people: {
    'elon-musk': { x: 0, y: 0 },
  },
  technology: {
    ai: { x: -120, y: -60 },
    batteries: { x: 120, y: 60 },
  },
  news: {
    tesla: { x: -100, y: -40 },
    'elon-musk': { x: 100, y: -40 },
    openai: { x: 0, y: 70 },
  },
};

export const knowledgeTrails: Record<string, { id: string; label: string }[]> = {
  tesla: [
    { id: 'tesla', label: 'Tesla' },
    { id: 'batteries', label: 'Battery Technology' },
    { id: 'nvidia', label: 'NVIDIA' },
    { id: 'ai', label: 'Artificial Intelligence' },
  ],
  'elon-musk': [
    { id: 'elon-musk', label: 'Elon Musk' },
    { id: 'tesla', label: 'Tesla' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'ai', label: 'Artificial Intelligence' },
  ],
  nvidia: [
    { id: 'nvidia', label: 'NVIDIA' },
    { id: 'ai', label: 'Artificial Intelligence' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'elon-musk', label: 'Elon Musk' },
  ],
  openai: [
    { id: 'openai', label: 'OpenAI' },
    { id: 'elon-musk', label: 'Elon Musk' },
    { id: 'ai', label: 'Artificial Intelligence' },
    { id: 'nvidia', label: 'NVIDIA' },
  ],
  ai: [
    { id: 'ai', label: 'AI' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'nvidia', label: 'NVIDIA' },
    { id: 'tesla', label: 'Tesla' },
  ],
  batteries: [
    { id: 'batteries', label: 'Batteries' },
    { id: 'tesla', label: 'Tesla' },
    { id: 'elon-musk', label: 'Elon Musk' },
    { id: 'ai', label: 'Artificial Intelligence' },
  ],
};

function findRelationshipByEdge(
  _edgeId: string
): Relationship | undefined {
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getBezierPath(
  x1: number, y1: number,
  x2: number, y2: number,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = Math.abs(dx) * 0.4;
  return `M${x1},${y1} C${x1 + cx},${y1} ${x2 - cx},${y2} ${x2},${y2}`;
}

function getNodeRadius(
  _nodeId: string,
  isHovered: boolean,
  isSelected: boolean
) {
  const base = 22;

  if (isSelected) return base * 1.4;

  if (isHovered) return base * 1.25;

  return base;
}

/* ------------------------------------------------------------------ */
/*  Graph Component                                                    */
/* ------------------------------------------------------------------ */

function GraphInner({
  graph,
  className,
  interactive = true,
  onNodeClick,
  onEdgeClick,
  selectedNode,
  graphMode = 'knowledge',
  trailHighlightedNodeIds = [],
}: KnowledgeGraphProps, ref: React.Ref<KnowledgeGraphHandle>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  console.log("Graph received:", graph);

  // View transform (pan + zoom)
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const [dimensions, setDimensions] = useState({ w: 600, h: 400 });

  // Interaction state
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Dynamic node positions (mutable ref for dragging)
  const nodePositionsRef = useRef<Record<string,{x:number;y:number}>>({});
  const [, forceUpdate] = useState(0);

  // Refs for animation
  const floatPhaseRef = useRef<Record<string, number>>({});
  const animFrameRef = useRef<number>(0);

  // Compute nodes with positions
  const nodeIds = graph?.nodes?.map((n) => n.id) ?? [];

  // Track mode changes to reset positions
  useEffect(() => {
    if (!graph) return;

    const nodes = graph.nodes.map((n) => ({
      id: n.id,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));

    const nodeSet = new Set(graph.nodes.map((n) => n.id));

    const links = graph.edges
      .filter(
        (e) =>
          nodeSet.has(e.source) &&
          nodeSet.has(e.target)
      )
      .map((e) => ({
        source: e.source,
        target: e.target,
      }));

    const simulation = forceSimulation(nodes)
      .force(
        "link",
        forceLink(links)
          .id((d: any) => d.id)
          .distance(120)
      )
      .force("charge", forceManyBody().strength(-220))
      .force("center", forceCenter(0, 0))
      .force("collision", forceCollide(55))
      .stop();

    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    nodes.forEach((node) => {
      nodePositionsRef.current[node.id] = {
        x: node.x ?? 0,
        y: node.y ?? 0,
      };
    });

    forceUpdate((n) => n + 1);

    return () => {
    simulation.stop();
  };
  }, [graph]);

  // Init float phases
  useEffect(() => {
    nodeIds.forEach((id) => {
      if (!floatPhaseRef.current[id]) {
        floatPhaseRef.current[id] = Math.random() * Math.PI * 2;
      }
    });
  }, []);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-center on mode change
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;

      const cw = el.clientWidth;
      const ch = el.clientHeight;

      const positions = Object.values(nodePositionsRef.current);

      if (positions.length === 0) return;

      const cx =
        positions.reduce((sum, p) => sum + p.x, 0) / positions.length;

      const cy =
        positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

      setViewTransform({
        x: cw / 2 - cx,
        y: ch / 2 - cy,
        scale: 1,
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [nodeIds]);

  // ---- Handlers ----

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!interactive) return;
    const target = e.target as SVGElement;
    const nodeEl = target.closest('[data-node-id]') as SVGElement | null;
    if (nodeEl) {
      const id = nodeEl.dataset.nodeId!;
      setDraggingNode(id);
      dragOffset.current = {
        x: e.clientX - nodePositionsRef.current[id].x * viewTransform.scale - viewTransform.x,
        y: e.clientY - nodePositionsRef.current[id].y * viewTransform.scale - viewTransform.y,
      };
      return;
    }
    setIsPanning(true);
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      vx: viewTransform.x,
      vy: viewTransform.y,
    };
  }, [interactive, viewTransform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode) {
      const nx = (e.clientX - dragOffset.current.x - viewTransform.x) / viewTransform.scale;
      const ny = (e.clientY - dragOffset.current.y - viewTransform.y) / viewTransform.scale;
      nodePositionsRef.current[draggingNode] = { x: nx, y: ny };
      forceUpdate((n) => n + 1);
      return;
    }
    if (isPanning) {
      setViewTransform({
        ...viewTransform,
        x: panStart.current.vx + (e.clientX - panStart.current.x),
        y: panStart.current.vy + (e.clientY - panStart.current.y),
      });
    }
  }, [draggingNode, isPanning, viewTransform]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
    setIsPanning(false);
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    const nodeEl = target.closest('[data-node-id]') as SVGElement | null;
    if (nodeEl) {
      const id = nodeEl.dataset.nodeId!;
      onNodeClick?.(id);
    }
  }, [onNodeClick]);

  const handleEdgeClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    const edgeEl = target.closest('[data-edge-id]') as SVGElement | null;
    if (edgeEl) {
      const id = edgeEl.dataset.edgeId!;
      const relationship = findRelationshipByEdge(id);
      onEdgeClick?.(id, relationship);
    }
  }, [onEdgeClick]);

  // ---- Imperative handle ----

  useImperativeHandle(ref, () => ({
    fitView: (_duration?: number) => {
      const el = containerRef.current;
      if (!el) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const pos = nodePositionsRef.current;
      const visible = nodeIds.map((id) => pos[id]).filter(Boolean);
      if (visible.length === 0) return;
      const minX = Math.min(...visible.map((p) => p.x));
      const maxX = Math.max(...visible.map((p) => p.x));
      const minY = Math.min(...visible.map((p) => p.y));
      const maxY = Math.max(...visible.map((p) => p.y));
      const graphW = maxX - minX + 200;
      const graphH = maxY - minY + 200;
      const scale = Math.min(cw / graphW, ch / graphH, 1.5);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      setViewTransform({
        x: cw / 2 - cx * scale,
        y: ch / 2 - cy * scale,
        scale,
      });
    },
    zoomIn: () => setViewTransform((v) => ({ ...v, scale: Math.min(v.scale * 1.2, 3) })),
    zoomOut: () => setViewTransform((v) => ({ ...v, scale: Math.max(v.scale / 1.2, 0.3) })),
    centerNode: (nodeId: string) => {
      const pos = nodePositionsRef.current[nodeId];
      if (!pos) return;
      const el = containerRef.current;
      if (!el) return;
      setViewTransform({
        x: el.clientWidth / 2 - pos.x * 1.5,
        y: el.clientHeight / 2 - pos.y * 1.5,
        scale: 1.5,
      });
    },
    rearrange: () => {
      nodeIds.forEach((id, index) => {
      const angle = (index / Math.max(nodeIds.length, 1)) * Math.PI * 2;

      nodePositionsRef.current[id] = {
          x: Math.cos(angle) * 220,
          y: Math.sin(angle) * 180,
      };
  });
      forceUpdate((n) => n + 1);
      setTimeout(() => {
        const el = containerRef.current;
        if (!el) return;
        const cw = el.clientWidth;
        const ch = el.clientHeight;
        setViewTransform({
          x: cw / 2,
          y: ch / 2,
          scale: 1,
        });
      }, 100);
    },
  }));

  // ---- Computed state ----

  const trailEdgeSet = useMemo(() => {
    const set = new Set<string>();
    if (trailHighlightedNodeIds.length > 1) {
      for (let i = 0; i < trailHighlightedNodeIds.length - 1; i++) {
        const src = trailHighlightedNodeIds[i];
        const tgt = trailHighlightedNodeIds[i + 1];
        (graph?.edges ?? []).forEach((e) => {
          if ((e.source === src && e.target === tgt) || (e.source === tgt && e.target === src)) {
            set.add(`${e.source}-${e.target}-${e.relation}`);
          }
        });
      }
    }
    return set;
  }, [trailHighlightedNodeIds.join(',')]);

  const { w, h } = dimensions;
  const { x: vx, y: vy, scale } = viewTransform;

  // Compute edges for rendering
  const renderedEdges = (graph?.edges ?? []).map((edge) => {
    const src = nodePositionsRef.current[edge.source];
    const tgt = nodePositionsRef.current[edge.target];
    if (!src || !tgt) return null;
    const sx = src.x * scale + vx;
    const sy = src.y * scale + vy;
    const tx = tgt.x * scale + vx;
    const ty = tgt.y * scale + vy;
    const edgeId = `${edge.source}-${edge.target}-${edge.relation}`;

    const isTrail = trailEdgeSet.has(edgeId);
    const isConnectedToHovered =
      hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);
    const edgeOpacity = isTrail ? 0.5 : isConnectedToHovered ? 0.3 : 0.08;
    const edgeWidth = isTrail ? 2 : isConnectedToHovered ? 1.5 : 0.8;
    return { edge, sx, sy, tx, ty, isTrail, edgeOpacity, edgeWidth };
    }).filter(
    (edge): edge is {
      edge: BackendEdge;
      sx: number;
      sy: number;
      tx: number;
      ty: number;
      isTrail: boolean;
      edgeOpacity: number;
      edgeWidth: number;
    } => edge !== null
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full overflow-hidden', className)}
      style={{ cursor: isPanning ? 'grabbing' : draggingNode ? 'grabbing' : 'grab' }}
    >
      {/* Subtle dot grid */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        width={w}
        height={h}
      >
        <defs>
          <pattern id="kg-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="14" cy="14" r="0.6" fill="rgba(255,255,255,0.04)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#kg-dots)" />
      </svg>

      {/* Main SVG for graph rendering */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleNodeClick}
      >
        {/* Edges layer */}
        {renderedEdges.map(({ edge, sx, sy, tx, ty, isTrail, edgeOpacity, edgeWidth }) => (
          <g key={`${edge.source}-${edge.target}-${edge.relation}`}>
            {/* Clickable hit area (wider invisible stroke) */}
            <path
              data-edge-id={`${edge.source}-${edge.target}-${edge.relation}`}
              onClick={(e) => {
                e.stopPropagation();
                const edgeId = `${edge.source}-${edge.target}-${edge.relation}`;
                const relationship = findRelationshipByEdge(edgeId);
                onEdgeClick?.(edgeId, relationship);
              }}
              d={getBezierPath(sx, sy, tx, ty)}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              style={{ cursor: 'pointer' }}
            />
            {/* Visible edge */}
            <path
              d={getBezierPath(sx, sy, tx, ty)}
              fill="none"
              stroke={`rgba(255,255,255,${edgeOpacity})`}
              strokeWidth={edgeWidth}
              className="transition-all duration-500"
              style={{ pointerEvents: 'none' }}
            />
            {/* Trail glow */}
            {isTrail && (
              <path
                d={getBezierPath(sx, sy, tx, ty)}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={6}
                style={{ pointerEvents: 'none' }}
                filter="url(#glow)"
              />
            )}
          </g>
        ))}

        {/* Glow filter */}
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Nodes layer */}
        {nodeIds.map((id) => {
          const pos = nodePositionsRef.current[id];
          if (!pos) return null;
          const nx = pos.x * scale + vx;
          const ny = pos.y * scale + vy;
          const data =
          graph?.nodes.find((n) => n.id === id) ?? {
            name: id,
            type: "unknown",
          };
          const isSelected = id === selectedNode;
          const isHovered = id === hoveredNode;
          const isTrail = trailHighlightedNodeIds.includes(id);
          const isHighlighted = isSelected || isTrail;
          const radius = getNodeRadius(id, isHovered, isSelected) * scale;

          return (
            <g key={id}>
              {/* Selection ring glow */}
              {(isSelected || isTrail) && (
                <motion.circle
                  cx={nx}
                  cy={ny}
                  r={radius * 1.6}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1.5}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              )}

              {/* Glow behind node */}
              <circle
                cx={nx}
                cy={ny}
                r={radius * 2.5}
                fill={`rgba(255,255,255,${isHovered ? 0.04 : isSelected ? 0.06 : isTrail ? 0.04 : 0.01})`}
                style={{ pointerEvents: 'none' }}
              />

              {/* Node body */}
              <motion.circle
                data-node-id={id}
                cx={nx}
                cy={ny}
                r={radius}
                fill={isSelected ? 'rgba(255,255,255,0.95)' : isTrail ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.1)'}
                stroke={isSelected ? 'rgba(255,255,255,0.6)' : isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.06)'}
                strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0.5}
                initial={false}
                animate={{
                  r: radius,
                  fill: isSelected ? 'rgba(255,255,255,0.95)' : isTrail ? 'rgba(255,255,255,0.85)' : isHovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)',
                  stroke: isSelected ? 'rgba(255,255,255,0.6)' : isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.06)',
                }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ cursor: 'pointer', filter: isSelected ? 'url(#nodeGlow)' : undefined }}
                onMouseEnter={() => setHoveredNode(id)}
                onMouseLeave={() => setHoveredNode(null)}
              />

              {/* Icon */}
              {scale > 0.5 && (
                <motion.text
                  x={nx}
                  y={ny + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(10, Math.min(16, radius * 0.65))}
                  animate={{
                    opacity: isSelected ? 1 : 0.7,
                  }}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {{
                  Company: "🏢",
                  Person: "👤",
                  Website: "🌐",
                  Technology: "💻",
                  Event: "📰",
                  Concept: "🧠",
                  Organization: "🏛️",
                  Country: "🌍",
                  Repository: "📦",
                  Stock: "📈",
                }[data.type] ?? "⚪"}
                </motion.text>
              )}

              {/* Label */}
              <text
                x={nx}
                y={ny + radius + 18}
                textAnchor="middle"
                fontSize={11}
                fill="rgba(255,255,255,0.75)"
                style={{
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                {data.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Subtle vignette overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-20" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0a0a0a] via-transparent to-transparent opacity-10" />
    </div>
  );
}

const GraphInnerForwarded = forwardRef(GraphInner);

export function KnowledgeGraph(props: KnowledgeGraphProps & { ref?: React.Ref<KnowledgeGraphHandle> }) {
  return <GraphInnerForwarded {...props} />;
}

export { findRelationshipByEdge };

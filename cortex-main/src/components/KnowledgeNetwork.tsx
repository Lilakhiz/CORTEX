import { useRef, useEffect, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                   */
/* ------------------------------------------------------------------ */

interface SimNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  radius: number;
  connections: number[];
  birth: number;
  pulsePhase: number;
}

interface SimEdge {
  source: number;
  target: number;
  birth: number;
  opacity: number;
}

interface Particle {
  edgeIdx: number;
  t: number;
  speed: number;
}

const TARGET_NODES = 200;
const EXPLOSION_NODES = 3000;       // Massively spawn up to 3000 additional nodes
const NODE_INTERVAL = 4000;         // 4 seconds between new nodes
const REPULSION = 600;
const ATTRACTION = 0.004;
const CENTERING = 0.0008;
const DAMPING = 0.93;
const MOUSE_RADIUS = 250;
const MOUSE_FORCE = 0.35;
const MAX_EDGE_DIST = 400;
const EXPLOSION_DURATION = 2200;

let _nextId = 0;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function dist(a: SimNode, b: SimNode) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface KnowledgeNetworkProps {
  className?: string;
  isExploding?: boolean;
  onExplosionComplete?: () => void;
}

export function KnowledgeNetwork({ className, isExploding, onExplosionComplete }: KnowledgeNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const explosionFiredRef = useRef(false);
  const finishedRef = useRef(false);
  const stateRef = useRef<{
    nodes: SimNode[];
    edges: SimEdge[];
    particles: Particle[];
    mouseX: number;
    mouseY: number;
    startTime: number;
    explosionStartTime: number;
    nodesAtExplosion: number;
    lastNodeSpawn: number;
    thinkingTimer: number;
    rafId: number;
    width: number;
    height: number;
  } | null>(null);

  const tick = useCallback((timestamp: number) => {
    const s = stateRef.current;
    if (!s) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const elapsed = timestamp - s.startTime;
    const exploding = explosionFiredRef.current;

    /* --- Normal mode: spawn 1 node every NODE_INTERVAL ms --- */
    if (!exploding && s.nodes.length < TARGET_NODES) {
      const timeSinceLastSpawn = elapsed - s.lastNodeSpawn;
      if (timeSinceLastSpawn >= NODE_INTERVAL) {
        s.lastNodeSpawn = elapsed;
        const angle = rand() * Math.PI * 2;
        const dist_ = rand() * 200 + 20;
        const z = rand();
        const node: SimNode = {
          id: _nextId++,
          x: s.width / 2 + Math.cos(angle) * dist_,
          y: s.height / 2 + Math.sin(angle) * dist_,
          vx: 0, vy: 0, z,
          radius: 2 + z * 2.5,
          connections: [], birth: elapsed, pulsePhase: rand() * Math.PI * 2,
        };
        s.nodes.push(node);

        const others = s.nodes.slice(0, -1);
        const withDist = others
          .map((n) => ({ node: n, d: dist(node, n) }))
          .filter(({ d }) => d < MAX_EDGE_DIST)
          .sort((a, b) => a.d - b.d);
        const connectCount = Math.min(1 + Math.floor(rand() * 2), withDist.length);
        for (let i = 0; i < connectCount; i++) {
          const target = withDist[i].node;
          s.edges.push({ source: node.id, target: target.id, birth: elapsed, opacity: 0 });
          node.connections.push(target.id);
          target.connections.push(node.id);
        }

        // Occasionally add edges between unconnected nearby nodes
        const candidates: { a: SimNode; b: SimNode; d: number }[] = [];
        for (let i = 0; i < s.nodes.length; i++) {
          for (let j = i + 1; j < s.nodes.length; j++) {
            const a = s.nodes[i], b = s.nodes[j];
            if (a.connections.includes(b.id)) continue;
            const d = dist(a, b);
            if (d < MAX_EDGE_DIST * 0.6) candidates.push({ a, b, d });
          }
        }
        if (candidates.length > 0 && rand() < 0.3) {
          const { a, b } = candidates[Math.floor(rand() * candidates.length)];
          s.edges.push({ source: a.id, target: b.id, birth: elapsed, opacity: 0 });
          a.connections.push(b.id);
          b.connections.push(a.id);
        }
      }
    }

    /* --- EXPLOSION: keep all existing nodes, rapidly expand outward --- */
    if (exploding && !finishedRef.current) {
      const explosionElapsed = elapsed - s.explosionStartTime;
      if (explosionElapsed < EXPLOSION_DURATION) {
        const progress = explosionElapsed / EXPLOSION_DURATION;
        // Use quadratic curve: slow start then rapid acceleration
        const spawnProgress = progress * progress;
        const maxNew = s.nodesAtExplosion + Math.floor(spawnProgress * EXPLOSION_NODES);
        const cappedTarget = Math.min(s.nodesAtExplosion + EXPLOSION_NODES, maxNew);

        while (s.nodes.length < cappedTarget) {
          const id = _nextId++;
          // Spawn near an existing node to create web-like expansion
          const parentIdx = Math.floor(rand() * s.nodes.length);
          const parent = s.nodes[parentIdx];
          const angle = rand() * Math.PI * 2;
          // Distance grows with progress — early nodes are nearby, later nodes reach far
          const baseDist = 5 + spawnProgress * Math.max(s.width, s.height) * 3;
          const dist_ = baseDist * (0.5 + rand() * 0.5);
          const z = rand();
          const node: SimNode = {
            id,
            x: parent.x + Math.cos(angle) * dist_,
            y: parent.y + Math.sin(angle) * dist_,
            vx: (rand() - 0.5) * 8,
            vy: (rand() - 0.5) * 8,
            z,
            radius: 0.8 + z * 3.2,
            connections: [],
            birth: elapsed,
            pulsePhase: rand() * Math.PI * 2,
          };
          // Clamp far outside viewport for infinite feel (no visual clamping)
          s.nodes.push(node);

          // Connect to nearest nodes within a growing radius
          const nearby = s.nodes.slice(0, -1)
            .map((n) => ({ node: n, d: dist(node, n) }))
            .filter(({ d }) => d < MAX_EDGE_DIST + progress * 500)
            .sort((a, b) => a.d - b.d);
          const cc = Math.min(1 + Math.floor(rand() * 2), nearby.length);
          for (let i = 0; i < cc; i++) {
            const target = nearby[i].node;
            s.edges.push({ source: node.id, target: target.id, birth: elapsed, opacity: 0 });
            node.connections.push(target.id);
            target.connections.push(node.id);
          }
        }
      } else {
        finishedRef.current = true;
        onExplosionComplete?.();
      }
    }

    /* --- Physics --- */
    const { nodes, edges } = s;
    const centerX = s.width / 2;
    const centerY = s.height / 2;

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = REPULSION / (d * d);
        a.vx += (dx / d) * force;
        a.vy += (dy / d) * force;
        b.vx -= (dx / d) * force;
        b.vy -= (dy / d) * force;
      }
      for (const connId of a.connections) {
        const partner = nodes.find((n) => n.id === connId);
        if (!partner) continue;
        const dx = partner.x - a.x;
        const dy = partner.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (d - 100) * ATTRACTION;
        a.vx += (dx / d) * force;
        a.vy += (dy / d) * force;
      }
      // Minimal centering during explosion — let nodes fly outward
      const cs = exploding ? CENTERING * 0.05 : CENTERING;
      a.vx += (centerX - a.x) * cs;
      a.vy += (centerY - a.y) * cs;
    }

    // Mouse gravity: disabled during explosion
    if (!exploding && s.mouseX >= 0 && s.mouseY >= 0) {
      for (const n of nodes) {
        const dx = s.mouseX - n.x;
        const dy = s.mouseY - n.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_RADIUS && d > 0) {
          const strength = (1 - d / MOUSE_RADIUS) * MOUSE_FORCE;
          n.vx += (dx / d) * strength;
          n.vy += (dy / d) * strength;
        }
      }
    }

    for (const n of nodes) {
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    }

    /* --- Thinking reorganisation: only in normal mode --- */
    if (!exploding && elapsed - s.thinkingTimer > 5000 + rand() * 6000) {
      s.thinkingTimer = elapsed;
      if (edges.length > 3 && rand() < 0.4) {
        const idx = Math.floor(rand() * edges.length);
        const e = edges[idx];
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        if (src) src.connections = src.connections.filter((c) => c !== e.target);
        if (tgt) tgt.connections = tgt.connections.filter((c) => c !== e.source);
        edges.splice(idx, 1);
      }
      const cand: { a: SimNode; b: SimNode; d: number }[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          if (a.connections.includes(b.id)) continue;
          const d = dist(a, b);
          if (d < MAX_EDGE_DIST * 0.7) cand.push({ a, b, d });
        }
      }
      if (cand.length > 0) {
        const { a, b } = cand[Math.floor(rand() * cand.length)];
        edges.push({ source: a.id, target: b.id, birth: elapsed, opacity: 0 });
        a.connections.push(b.id);
        b.connections.push(a.id);
      }
    }

    /* --- Edge opacity --- */
    for (const e of edges) {
      const age = elapsed - e.birth;
      e.opacity = clamp(age / 1000, exploding ? 0.1 : 0.06, exploding ? 0.4 : 0.25);
    }

    /* --- Particles --- */
    if (edges.length > 0 && (exploding ? rand() < 0.15 : rand() < 0.02)) {
      s.particles.push({
        edgeIdx: Math.floor(rand() * edges.length),
        t: 0,
        speed: (exploding ? 0.006 : 0.0015) + rand() * 0.002,
      });
    }
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.t += p.speed;
      if (p.t >= 1) s.particles.splice(i, 1);
    }

    /* ---- RENDER ---- */
    ctx.clearRect(0, 0, s.width, s.height);

    // During explosion, fill background so coverage is black
    if (exploding) {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, s.width, s.height);
    }

    // Edges
    for (const e of edges) {
      const src = nodes.find((n) => n.id === e.source);
      const tgt = nodes.find((n) => n.id === e.target);
      if (!src || !tgt) continue;
      const edgeAlpha = exploding ? e.opacity * 2 : e.opacity;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = `rgba(200,200,210,${edgeAlpha})`;
      ctx.lineWidth = exploding ? 0.5 : 0.4;
      ctx.stroke();
    }

    // Particles
    for (const p of s.particles) {
      const e = edges[p.edgeIdx];
      if (!e) continue;
      const src = nodes.find((n) => n.id === e.source);
      const tgt = nodes.find((n) => n.id === e.target);
      if (!src || !tgt) continue;
      const px = src.x + (tgt.x - src.x) * p.t;
      const py = src.y + (tgt.y - src.y) * p.t;
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(p.t * Math.PI) * 0.5})`;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = `rgba(230,230,240,${0.1 + Math.sin(p.t * Math.PI) * 0.12})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Nodes
    for (const n of nodes) {
      const age = elapsed - n.birth;
      const fade = clamp(age / 500, 0, 1);
      const zScale = 0.5 + n.z * 0.5;
      const r = n.radius * zScale;
      const baseAlpha = exploding ? 0.6 : 0.35;
      const alpha = baseAlpha + n.z * 0.4;
      const breathe = 1 + Math.sin(elapsed * 0.001 + n.pulsePhase) * 0.08;

      // Glow
      const glowR = r * 3 * breathe;
      const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
      gradient.addColorStop(0, `rgba(255,255,255,${exploding ? 0.12 : 0.05 * fade})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * breathe, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha * fade})`;
      ctx.fill();
    }

    s.rafId = requestAnimationFrame(tick);
  }, [onExplosionComplete]);

  /* ---- Lifecycle ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    _nextId = 0;
    const centerNode: SimNode = {
      id: _nextId++,
      x: w / 2, y: h / 2, vx: 0, vy: 0,
      z: 0.5, radius: 4, connections: [], birth: 0, pulsePhase: 0,
    };

    const state = {
      nodes: [centerNode],
      edges: [] as SimEdge[],
      particles: [] as Particle[],
      mouseX: -1,
      mouseY: -1,
      startTime: performance.now(),
      explosionStartTime: 0,
      nodesAtExplosion: 1,
      lastNodeSpawn: performance.now(),
      thinkingTimer: performance.now(),
      rafId: 0,
      width: w,
      height: h,
    };
    stateRef.current = state;

    const onMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      state.mouseX = e.clientX - rect.left;
      state.mouseY = e.clientY - rect.top;
    };
    const onLeave = () => { state.mouseX = -1; state.mouseY = -1; };
    const onResize = () => {
      const pe = canvas!.parentElement;
      if (!pe) return;
      const nw = pe.clientWidth, nh = pe.clientHeight;
      const ndpr = window.devicePixelRatio || 1;
      canvas!.width = nw * ndpr * 2;
      canvas!.height = nh * ndpr * 2;
      canvas!.style.width = `${nw}px`;
      canvas!.style.height = `${nh}px`;
      ctx!.setTransform(ndpr, 0, 0, ndpr, 0, 0);
      state.width = nw;
      state.height = nh;
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', onResize);

    state.rafId = requestAnimationFrame((t) => tick(t));

    return () => {
      cancelAnimationFrame(state.rafId);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', onResize);
    };
  }, [tick]);

  /* ---- Trigger explosion: KEEP all existing nodes, snapshot their count, start rapid expansion ---- */
  useEffect(() => {
    if (isExploding && !explosionFiredRef.current) {
      explosionFiredRef.current = true;
      finishedRef.current = false;
      const s = stateRef.current;
      if (s) {
        s.explosionStartTime = performance.now();
        // KEY FIX: snapshot the current node count — do NOT clear nodes
        s.nodesAtExplosion = s.nodes.length;
      }
    }
  }, [isExploding]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ cursor: 'default' }}
    />
  );
}

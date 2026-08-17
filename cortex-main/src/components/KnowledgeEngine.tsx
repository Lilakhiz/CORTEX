'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { createTimeline } from 'animejs';

/* ------------------------------------------------------------------ */
/*  KnowledgeEngine — Blueprint-style mechanical diagram              */
/*  Scroll-controlled explode/reassemble animation                    */
/* ------------------------------------------------------------------ */

const engineStages = [
  { id: 'input', label: 'Input', icon: 'question', x: 0, y: 0 },
  { id: 'intent', label: 'Intent\nDetection', icon: 'compass', x: 0, y: 80 },
  { id: 'search', label: 'Multi-source\nSearch', icon: 'search', x: 0, y: 160 },
  { id: 'collect', label: 'Evidence\nCollection', icon: 'database', x: 0, y: 240 },
  { id: 'rank', label: 'Evidence\nRanking', icon: 'filter', x: 0, y: 320 },
  { id: 'entity', label: 'Entity\nExtraction', icon: 'tag', x: 0, y: 400 },
  { id: 'relate', label: 'Relationship\nExtraction', icon: 'share', x: 0, y: 480 },
  { id: 'graph', label: 'Knowledge\nGraph', icon: 'network', x: 0, y: 560 },
  { id: 'reason', label: 'Reasoning', icon: 'brain', x: 0, y: 640 },
  { id: 'answer', label: 'Final\nAnswer', icon: 'check', x: 0, y: 720 },
];

const engineDescriptions: Record<string, string> = {
  input: 'A question or topic enters the Cortex engine.',
  intent: 'We parse your intent to understand what you truly need.',
  search: 'Cortex searches across thousands of sources simultaneously.',
  collect: 'Evidence is gathered from web, academic papers, and databases.',
  rank: 'Sources are scored by credibility, recency, and relevance.',
  entity: 'Key entities, dates, and facts are identified.',
  relate: 'Connections between entities are discovered.',
  graph: 'A structured knowledge graph is constructed in real-time.',
  reason: 'Multiple reasoning paths are evaluated for the best answer.',
  answer: 'A synthesized, evidence-backed answer is delivered.',
};

/* Icon SVG paths for each stage */
function StageIcon({ type, className }: { type: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    question: (
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
    ),
    compass: (
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" />
    ),
    search: (
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    ),
    database: (
      <path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2zM6 17V9c0 .5 2.13 2 6 2s6-1.5 6-2v8c0 .5-2.13 2-6 2s-6-1.5-6-2z" />
    ),
    filter: (
      <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
    ),
    tag: (
      <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
    ),
    share: (
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
    ),
    network: (
      <path d="M4.01 6.03l7.51 3.22-7.52-1 .01-2.22m7.5 8.72L4 17.97v-2.22l7.51-1.03M2.01 3L2 10l15 2-15 2 .01 7L23 12 2.01 3z" />
    ),
    brain: (
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" />
    ),
    check: (
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    ),
  };

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className || 'w-4 h-4'}>
      {icons[type] || icons.check}
    </svg>
  );
}

export function KnowledgeEngine({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAssembled, setIsAssembled] = useState(true);

  /* Track scroll position for animation */
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate progress: 0 = top in view, 1 = bottom in view
      const elementTop = rect.top;
      const elementHeight = rect.height;
      const progress = 1 - (elementTop + elementHeight) / (windowHeight + elementHeight);
      
      setScrollProgress(Math.max(0, Math.min(1, progress)));
      setIsAssembled(progress < 0.3 || progress > 0.85);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* Calculate stage positions based on scroll */
  const getStageTransform = useCallback((index: number) => {
    const stageCount = engineStages.length;
    const stageProgress = (index / (stageCount - 1));
    
    // Explode phase: stages move outward
    // 0-0.3: assembled
    // 0.3-0.7: exploding
    // 0.7-1.0: reassembling
    
    let translateY = 0;
    let translateX = 0;
    let opacity = 1;
    let scale = 1;
    
    if (scrollProgress < 0.3) {
      // Assembled state
      translateY = 0;
      opacity = 1;
    } else if (scrollProgress < 0.7) {
      // Exploding phase
      const explodeProgress = (scrollProgress - 0.3) / 0.4;
      const staggerOffset = index * 0.1;
      const adjustedProgress = Math.max(0, Math.min(1, explodeProgress - staggerOffset));
      
      // Move stages outward in different directions
      const angle = (index / stageCount) * Math.PI * 2;
      const distance = adjustedProgress * 120;
      translateX = Math.cos(angle) * distance;
      translateY = Math.sin(angle) * distance * 0.5;
      scale = 0.8 + adjustedProgress * 0.2;
      opacity = 0.6 + adjustedProgress * 0.4;
    } else {
      // Reassembling phase
      const reassembleProgress = (scrollProgress - 0.7) / 0.3;
      const staggerOffset = (stageCount - index) * 0.1;
      const adjustedProgress = Math.max(0, Math.min(1, reassembleProgress - staggerOffset));
      
      const angle = (index / stageCount) * Math.PI * 2;
      const distance = (1 - adjustedProgress) * 120;
      translateX = Math.cos(angle) * distance;
      translateY = Math.sin(angle) * distance * 0.5;
      scale = 0.8 + (1 - adjustedProgress) * 0.2;
      opacity = 0.6 + (1 - adjustedProgress) * 0.4;
    }
    
    return {
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      opacity,
    };
  }, [scrollProgress]);

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {/* Blueprint-style frame */}
      <div className="relative mx-auto max-w-4xl">
        {/* Title bar */}
        <div className="absolute top-0 left-0 right-0 h-8 border-b border-white/10 bg-white/[0.02] flex items-center px-4">
          <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
            Knowledge Engine v2.0 — Blueprint
          </span>
          <div className="ml-auto flex gap-2">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Main engine container */}
        <div className="relative min-h-[600px] border border-white/10 bg-white/[0.02] mt-8 overflow-hidden">
          {/* Grid pattern background */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          {/* Connection lines between stages */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            {engineStages.slice(0, -1).map((stage, i) => {
              const nextStage = engineStages[i + 1];
              const stageStyle = getStageTransform(i);
              const nextStyle = getStageTransform(i + 1);
              
              return (
                <line
                  key={`line-${stage.id}`}
                  x1={`${50}%`}
                  y1={`${(i / (engineStages.length - 1)) * 80 + 10}%`}
                  x2={`${50}%`}
                  y2={`${((i + 1) / (engineStages.length - 1)) * 80 + 10}%`}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  style={{
                    opacity: stageStyle.opacity,
                    transition: 'opacity 0.3s ease',
                  }}
                />
              );
            })}
          </svg>

          {/* Engine stages */}
          <div className="relative z-10 flex flex-col items-center py-12 gap-4">
            {engineStages.map((stage, i) => {
              const style = getStageTransform(i);
              
              return (
                <div
                  key={stage.id}
                  className="relative flex items-center gap-4 w-full max-w-md transition-all duration-500 ease-out"
                  style={{
                    ...style,
                    transform: `${style.transform} translateX(${i % 2 === 0 ? '-10%' : '10%'})`,
                  }}
                >
                  {/* Stage number */}
                  <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-mono text-white/40">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Stage card */}
                  <div className="flex-1 p-4 border border-white/10 bg-white/[0.03] rounded-lg hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <StageIcon type={stage.icon} className="w-5 h-5 text-white/60" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white/80 whitespace-pre-line">
                          {stage.label}
                        </h4>
                        <p className="text-[11px] text-white/40 mt-1">
                          {engineDescriptions[stage.id]}
                        </p>
                      </div>
                    </div>
                    
                    {/* Animated indicator */}
                    <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white/30 rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${scrollProgress * 100}%`,
                          transform: `scaleX(${i <= scrollProgress * engineStages.length ? 1 : 0})`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Side decoration */}
                  <div className="w-4 h-4 border border-white/10 rotate-45 shrink-0" />
                </div>
              );
            })}
          </div>

          {/* Central processor visualization */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/10 flex items-center justify-center transition-all duration-1000"
            style={{
              opacity: isAssembled ? 0.3 : 0.8,
              transform: `translate(-50%, -50%) scale(${1 + scrollProgress * 0.5})`,
            }}
          >
            <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-white/40">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="absolute bottom-0 left-0 right-0 h-6 border-t border-white/10 bg-white/[0.02] flex items-center px-4">
          <span className="text-[9px] font-mono text-white/20">
            STATUS: {isAssembled ? 'STANDBY' : 'PROCESSING'}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[9px] font-mono text-white/20">
              PROGRESS: {Math.round(scrollProgress * 100)}%
            </span>
            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/30 rounded-full transition-all duration-300"
                style={{ width: `${scrollProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Export for external animation control if needed */
export function animateEngine(_container: HTMLElement) {
  // Scroll-based animation is handled internally
  // This export exists for compatibility
  console.log('KnowledgeEngine: Scroll-based animation is active');
}

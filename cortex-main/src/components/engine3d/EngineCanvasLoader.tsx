import { lazy, Suspense, useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PIPELINE_STEPS } from './pipelineData';

gsap.registerPlugin(ScrollTrigger);

// Lazy-load the heavy 3D R3F Canvas scene
const LazyEngineScene = lazy(() => import('./EngineScene'));

function SceneFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none select-none">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-sky-400 animate-spin mb-2" />
      <span className="text-xs font-mono text-white/40 tracking-wider uppercase">Loading 3D Engine...</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chapter lifecycle helpers                                         */
/* ------------------------------------------------------------------ */

/** Ease out cubic — smooth deceleration curve */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Ease in cubic — smooth acceleration curve */
function easeIn(t: number): number {
  return t * t * t;
}

/** Phase boundaries within a single chapter's scroll range (0 → 1) */
/* Rhythm: 20% settle → 40% appear/hold → 30% animate → 10% transition */
const PHASE = {
  fadeInStart: 0.00,
  fadeInEnd:   0.20,
  holdEnd:     0.60,
  fadeOutEnd:  0.90,
} as const;

/** Distance (px) each line travels in from off-screen on entry/exit */
const TRAVEL = 60;

/**
 * Returns per-line animation values for a given sub-progress (0→1 within a chapter)
 * and line index (0 = stage number, 1 = title, 2 = subtitle, 3 = description).
 * `direction` controls which axis/side the line flies in from, so each pipeline
 * stage can enter from a different edge of the screen (left/right/top/bottom).
 */
function getLineStyle(
  subProgress: number,
  lineIndex: number,
  direction: 'left' | 'right' | 'top' | 'bottom'
) {
  const stagger = lineIndex * 0.06;

  const enterEnd    = PHASE.fadeInEnd + stagger;
  const exitStart    = PHASE.holdEnd + stagger * 0.4;
  const exitEnd       = PHASE.fadeOutEnd + stagger * 0.6;

  // Sign/axis of travel per direction: left/top enter from negative side,
  // right/bottom enter from positive side.
  const isHorizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'top' ? -1 : 1;

  let opacity: number;
  let offset: number;
  let blurPx: number;

  if (subProgress <= enterEnd) {
    // ---- FADE IN (flies in from `direction`) ----
    const fPt = Math.min(1, Math.max(0, subProgress / enterEnd));
    const e = easeOut(fPt);
    opacity = e;
    offset = sign * TRAVEL * (1 - e);
    blurPx = 6 * (1 - e);
  } else if (subProgress <= exitStart) {
    // ---- HOLD ----
    opacity = 1;
    offset = 0;
    blurPx = 0;
  } else if (subProgress <= exitEnd) {
    // ---- FADE OUT (continues off in the same direction it entered) ----
    const t = Math.min(1, Math.max(0, (subProgress - exitStart) / (exitEnd - exitStart)));
    const e = easeIn(t);
    opacity = 1 - e;
    offset = sign * -TRAVEL * 0.5 * e;
    blurPx = 4 * e;
  } else {
    // ---- HIDDEN (chapter over) ----
    opacity = 0;
    offset = sign * -TRAVEL * 0.5;
    blurPx = 4;
  }

  return {
    opacity,
    x: isHorizontal ? offset : 0,
    y: isHorizontal ? 0 : offset,
    filter: `blur(${blurPx}px)`,
  };
}

/* ------------------------------------------------------------------ */
/*  Text line definitions                                             */
/* ------------------------------------------------------------------ */
const textLines = [
  {
    key: 'stepNumber',
    className: 'text-xs font-mono tracking-[0.25em] text-white/30 uppercase',
  },
  {
    key: 'title',
    className: 'text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white mt-2',
  },
  {
    key: 'subtitle',
    className: 'text-base sm:text-lg text-white/50 font-[350] mt-3',
  },
  {
    key: 'description',
    className: 'text-sm sm:text-base text-white/40 font-[350] mt-4 max-w-md leading-relaxed',
  },
];

/* ------------------------------------------------------------------ */
/*  Chapter overlay — driven by sub-stage progress                    */
/* ------------------------------------------------------------------ */
function ChapterOverlay({
  scrollProgress,
}: {
  scrollProgress: number;
}) {
  const total = PIPELINE_STEPS.length;

  // Which floating "slice" are we in?
  const floatStage = scrollProgress * total;          // 0 … total
  const stageIndex = Math.min(total - 1, Math.floor(floatStage));
  const subProgress = floatStage - stageIndex;         // 0 → 1 within this chapter

  const step = PIPELINE_STEPS[stageIndex];
  if (!step) return null;

  const values = [step.stepNumber, step.title, step.subtitle, step.description];
  const direction = step.labelPosition;

  // Container placement + text alignment per edge, so the block visually
  // belongs to the side it flies in from.
  const containerClassByDirection: Record<typeof direction, string> = {
    left: 'items-end justify-start pb-16 sm:pb-24 pl-8 sm:pl-16 lg:pl-24 text-left',
    right: 'items-end justify-end pb-16 sm:pb-24 pr-8 sm:pr-16 lg:pr-24 text-right',
    top: 'items-start justify-center pt-24 sm:pt-32 px-8 text-center',
    bottom: 'items-end justify-center pb-16 sm:pb-24 px-8 text-center',
  };

  return (
    <div
      className={`absolute inset-0 z-10 flex pointer-events-none ${containerClassByDirection[direction]}`}
    >
      <div className={`flex flex-col ${direction === 'top' || direction === 'bottom' ? 'items-center' : ''}`}>
        {values.map((text, i) => {
          const style = getLineStyle(subProgress, i, direction);
          return (
            <motion.div
              key={textLines[i].key}
              style={{
                opacity: style.opacity,
                x: style.x,
                y: style.y,
                filter: style.filter,
                willChange: 'opacity, transform, filter',
              }}
              className={textLines[i].className}
            >
              {text}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export — uses GSAP ScrollTrigger pinning for cinematic       */
/*  full-viewport experience. The section pins on scroll, the engine  */
/*  remains centered through all 9 stages, then unpins smoothly.      */
/* ------------------------------------------------------------------ */
export function EngineCanvasLoader({ className = '' }: { className?: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleStageChange = useCallback((index: number) => {
    setActiveStage(index);
  }, []);

  const handleProgress = useCallback((progress: number) => {
    setScrollProgress(progress);
  }, []);

  // ---- GSAP ScrollTrigger: pin the section for the full cinematic ----
  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Each stage gets ~100vh of scroll (900vh ÷ 9 stages).
      // This gives the user ample time to appreciate every transformation.
      const SCROLL_DISTANCE = '900vh';

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: `+=${SCROLL_DISTANCE}`,
        pin: true,
        scrub: 1.0,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const rawProgress = self.progress;

          // Compute stage index (0-8)
          const totalSteps = PIPELINE_STEPS.length;
          const computedIndex = Math.min(
            totalSteps - 1,
            Math.floor(rawProgress * totalSteps)
          );

          // Throttle progress callback to 60fps
          if (self.progress !== undefined) {
            handleProgress(rawProgress);
          }

          // Fire stage change only on actual boundary crossing
          if (computedIndex !== activeStage) {
            handleStageChange(computedIndex);
          }
        },
      });
    }, sectionRef);

    // The pinned trigger's start/end scroll positions are computed from the
    // document's layout at the moment this effect runs. If web fonts (or any
    // other async content above this section) finish loading afterward and
    // shift the page height — which on a real deployed network takes far
    // longer than on localhost — ScrollTrigger's cached positions go stale
    // and scrubbing desyncs from actual scroll, making the pinned animation
    // look like it's jumping/animating in the wrong direction. Force a
    // recalculation once fonts have actually settled.
    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts?.ready) {
      document.fonts.ready.then(refresh);
    }
    window.addEventListener("load", refresh);

    return () => {
      ctx.revert();
      window.removeEventListener("load", refresh);
    };
  }, [handleProgress, handleStageChange, activeStage]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={sectionRef}
      className={`relative w-full ${className}`}
    >
      {/* ScrollTrigger pins this container. The engine stays fixed in viewport
          for the entire 400vh scroll distance. */}
      <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0a]">

        {/* 3D Engine Model — full-viewport background */}
        <div className="absolute inset-0">
          <Suspense fallback={<SceneFallback />}>
            <LazyEngineScene
              containerRef={sectionRef}
              activeStage={activeStage}
              scrollProgress={scrollProgress}
            />
          </Suspense>
        </div>

        {/* Subtle vignette gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-[1]" />

        {/* Chapter text overlay — driven by sub-stage scroll progress */}
        <ChapterOverlay scrollProgress={scrollProgress} />
      </div>
    </div>
  );
}

export default EngineCanvasLoader;

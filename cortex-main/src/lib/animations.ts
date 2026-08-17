import { animate, createTimeline } from 'animejs';
import type { EasingParam } from 'animejs';

/* ------------------------------------------------------------------ */
/*  Reusable easing presets                                            */
/* ------------------------------------------------------------------ */

export const easeOutExpo = 'outExpo' as EasingParam;
export const easeInOutQuint = 'inOutQuint' as EasingParam;
export const easeOutQuint = 'outQuint' as EasingParam;
export const easeInOutSine = 'inOutSine' as EasingParam;

/* ------------------------------------------------------------------ */
/*  DOM element fading / staggering helpers                            */
/* ------------------------------------------------------------------ */

/** Fade in a group of elements with staggered delay. */
export function staggerFadeIn(
  targets: string | Element | Element[],
  opts?: { duration?: number; delay?: number; stagger?: number; ease?: EasingParam },
) {
  return animate(targets, {
    opacity: [0, 1],
    y: [24, 0],
    duration: opts?.duration ?? 600,
    delay: opts?.delay ?? 0,
    ease: opts?.ease ?? easeOutQuint,
    stagger: opts?.stagger ?? 40,
  });
}

/** Fade out a group of elements. */
export function fadeOut(
  targets: string | Element | Element[],
  opts?: { duration?: number; delay?: number; ease?: EasingParam },
) {
  return animate(targets, {
    opacity: [1, 0],
    y: [0, -12],
    duration: opts?.duration ?? 400,
    delay: opts?.delay ?? 0,
    ease: opts?.ease ?? easeInOutSine,
  });
}

/* ------------------------------------------------------------------ */
/*  Scale / pulse effects                                              */
/* ------------------------------------------------------------------ */

export function pulse(
  target: string | Element,
  opts?: { scale?: number; duration?: number; repeat?: number },
) {
  const scale = opts?.scale ?? 1.05;
  const duration = opts?.duration ?? 600;
  return animate(target, {
    scale: [1, scale, 1],
    duration,
    loop: opts?.repeat ?? 1,
    ease: easeInOutSine,
  });
}

/* ------------------------------------------------------------------ */
/*  Scroll-triggered timeline builder                                  */
/* ------------------------------------------------------------------ */

/**
 * Build an anime.js timeline that plays when `element` enters the viewport.
 * Returns a cleanup function.
 */
export function createScrollTimeline(
  element: Element,
  buildFn: (tl: ReturnType<typeof createTimeline>) => void,
  opts?: { threshold?: number; once?: boolean },
) {
  const tl = createTimeline({ autoplay: false });
  buildFn(tl);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          tl.play();
          if (opts?.once !== false) observer.unobserve(element);
        }
      });
    },
    { threshold: opts?.threshold ?? 0.3 },
  );

  observer.observe(element);
  return () => {
    observer.disconnect();
    tl.pause();
  };
}

/* ------------------------------------------------------------------ */
/*  Text reveal (split into words, fade-up staggered)                  */
/* ------------------------------------------------------------------ */

export function revealText(
  target: string | Element,
  opts?: { duration?: number; stagger?: number; ease?: EasingParam },
) {
  return animate(target, {
    opacity: [0, 1],
    translateY: [12, 0],
    duration: opts?.duration ?? 500,
    delay: opts?.stagger ?? 60,
    ease: opts?.ease ?? easeOutQuint,
  });
}

/* ------------------------------------------------------------------ */
/*  Graph edge draw animation                                          */
/* ------------------------------------------------------------------ */

export function drawEdges(
  lines: SVGElement[],
  opts?: { duration?: number; stagger?: number },
) {
  return animate(lines, {
    strokeDashoffset: [0, 0],
    duration: opts?.duration ?? 800,
    stagger: opts?.stagger ?? 100,
    ease: easeInOutQuint,
  });
}

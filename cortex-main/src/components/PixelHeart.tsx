import { useEffect, useRef, useMemo } from 'react';
import { motion, useAnimationFrame } from 'framer-motion';

interface Pixel {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  delay: number;
}

function generateHeartPixels(size: number, gap: number): Pixel[] {
  const pixels: Pixel[] = [];
  const cols = Math.floor(size / gap);
  const rows = Math.floor(size / gap);
  const cx = cols / 2;
  const cy = rows / 2;
  const scale = size / 3;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const x = (j - cx) / (rows / 2);
      const y = (i - cy) / (rows / 2);
      // Heart equation: (x² + y² - 1)³ - x²y³ ≤ 0
      const heart = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
      if (heart <= 0) {
        pixels.push({
          x: j * gap,
          y: i * gap,
          baseX: j * gap,
          baseY: i * gap,
          delay: Math.random() * Math.PI * 2,
        });
      }
    }
  }
  return pixels;
}

const PARTICLES_COUNT = 15;

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
}

export function PixelHeart({ size = 280 }: { size?: number }) {
  const gap = Math.max(4, Math.floor(size / 40));
  const pixels = useMemo(() => generateHeartPixels(size, gap), [size, gap]);

  const particles: Particle[] = useMemo(() =>
    Array.from({ length: PARTICLES_COUNT }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * size * 1.5,
      y: (Math.random() - 0.5) * size * 1.5,
      size: Math.random() * 2 + 1,
      delay: Math.random() * Math.PI * 2,
      duration: Math.random() * 3 + 2,
      driftX: (Math.random() - 0.5) * 30,
      driftY: (Math.random() - 0.5) * 30 - 10,
    })), [size]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: [
            '0 0 30px rgba(0,0,0,0.03), 0 0 60px rgba(0,0,0,0.02)',
            '0 0 50px rgba(0,0,0,0.05), 0 0 100px rgba(0,0,0,0.03)',
            '0 0 30px rgba(0,0,0,0.03), 0 0 60px rgba(0,0,0,0.02)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Heart pixels */}
      <motion.div
        className="relative"
        animate={{
          rotate: [0, 2, -1, 1, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {pixels.map((pixel, i) => (
          <motion.div
            key={i}
            className="absolute rounded-sm bg-black/20 dark:bg-white/20"
            style={{
              width: gap - 1,
              height: gap - 1,
              left: pixel.x,
              top: pixel.y,
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.15, 0.35, 0.15],
            }}
            transition={{
              duration: 2.5,
              delay: pixel.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-black/15 dark:bg-white/15"
          style={{
            width: p.size,
            height: p.size,
          }}
          animate={{
            x: [p.x, p.x + p.driftX, p.x],
            y: [p.y, p.y + p.driftY, p.y],
            opacity: [0, 0.5, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

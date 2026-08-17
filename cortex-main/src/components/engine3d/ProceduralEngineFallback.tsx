import { RefObject } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface SimpleFallbackProps {
  engineGroupRef?: RefObject<THREE.Group | null>;
}

/**
 * Simple, elegant loading placeholder when GLTF model is unavailable during dev.
 * Replaces fake procedural engine geometry with a clean, minimal Apple/Tesla-style loader.
 */
export function ProceduralEngineFallback({ engineGroupRef }: SimpleFallbackProps) {
  return (
    <group ref={engineGroupRef}>
      <Html center>
        <div className="flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-sky-400 animate-spin mb-3" />
          <p className="text-xs font-mono text-white/60 tracking-wider uppercase">
            Loading Racing Engine
          </p>
          <p className="text-[11px] text-white/30 mt-1">
            /public/models/racing-engine.glb
          </p>
        </div>
      </Html>
    </group>
  );
}

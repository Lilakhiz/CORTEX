import { Component, ReactNode, RefObject } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import { ProceduralEngineFallback } from './ProceduralEngineFallback';

interface ModelErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ModelErrorBoundaryState {
  hasError: boolean;
}

export class ModelErrorBoundary extends Component<ModelErrorBoundaryProps, ModelErrorBoundaryState> {
  public state: ModelErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ModelErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    console.info("GLTF model (/models/racing-engine.glb) unavailable, rendering simple placeholder:", error.message);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const MODEL_PATH = '/models/racing-engine.glb';

interface EngineModelProps {
  engineGroupRef?: RefObject<THREE.Group | null>;
  engineIdleRef?: RefObject<THREE.Group | null>;
}

function ActualGLTFModel({ engineGroupRef, engineIdleRef }: EngineModelProps) {
  const { scene } = useGLTF(MODEL_PATH);

  return (
    <group ref={engineGroupRef}>
      <group ref={engineIdleRef}>
        <Center>
          <primitive
            object={scene}
            scale={1.6}
            castShadow
            receiveShadow
          />
        </Center>
      </group>
    </group>
  );
}

// Preload model path if present
try {
  useGLTF.preload(MODEL_PATH);
} catch {
  // Ignore preloading error if file is missing
}

export function EngineModel({ engineGroupRef, engineIdleRef }: EngineModelProps) {
  return (
    <ModelErrorBoundary fallback={<ProceduralEngineFallback engineGroupRef={engineGroupRef} />}>
      <ActualGLTFModel engineGroupRef={engineGroupRef} engineIdleRef={engineIdleRef} />
    </ModelErrorBoundary>
  );
}

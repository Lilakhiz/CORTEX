import { Suspense, useRef, useEffect, useState, RefObject } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  PerspectiveCamera,
  Environment,
  ContactShadows,
} from '@react-three/drei';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
import * as THREE from 'three';
import { EngineModel } from './EngineModel';
import { PIPELINE_STEPS } from './pipelineData';

/* ------------------------------------------------------------------ */
/*  Pre-computed THREE.Color objects — avoid GC in animation loop     */
/* ------------------------------------------------------------------ */
const STAGE_COLORS = PIPELINE_STEPS.map((step) => ({
  spot: new THREE.Color(step.spotColor),
  rim: new THREE.Color(step.rimColor),
  fill: new THREE.Color(step.fillColor),
}));

/* ------------------------------------------------------------------ */
/*  EnergyPulseLight — fires a flash/ring wave on stage entry         */
/* ------------------------------------------------------------------ */
function EnergyPulseLight({
  triggerKey,
  intensity: maxIntensity,
  color,
}: {
  triggerKey: number;
  intensity: number;
  color: string;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const animRef = useRef({ intensity: 0, scale: 0.8 });
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (tweenRef.current) {
      tweenRef.current.kill();
    }
    tweenRef.current = gsap.fromTo(
      animRef.current,
      { intensity: maxIntensity, scale: 0.8 },
      {
        intensity: 0,
        scale: 2.4,
        duration: 1.1,
        ease: 'power2.out',
      }
    );
    console.log("EngineScene rendered");
    return () => {
      tweenRef.current?.kill();
    };
  }, [triggerKey, maxIntensity]);

  const ringMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.intensity = animRef.current.intensity;
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(animRef.current.scale);
      if (!ringMatRef.current) {
        ringMatRef.current = ringRef.current.material as THREE.MeshBasicMaterial;
      }
      const mat = ringMatRef.current;
      if (mat) {
        mat.opacity =
          maxIntensity > 0.1
            ? Math.min(1, animRef.current.intensity / maxIntensity)
            : 0;
      }
    }
  });

  return (
    <group position={[0, 0.1, 0]}>
      <pointLight
        ref={lightRef}
        color={color}
        distance={7}
        decay={2}
      />
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.82, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  VisibilityController — pauses R3F render loop when page is hidden */
/* ------------------------------------------------------------------ */
function VisibilityController() {
  const { invalidate } = useThree();

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) invalidate();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [invalidate]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  LightingController — applies env intensity + exposure per frame   */
/* ------------------------------------------------------------------ */
interface LightingControllerProps {
  envIntensityProxy: React.RefObject<{ value: number } | null>;
  exposureProxy: React.RefObject<{ value: number } | null>;
}

function LightingController({
  envIntensityProxy,
  exposureProxy,
}: LightingControllerProps) {
  const { scene, gl } = useThree();

  useFrame(() => {
    const env = envIntensityProxy.current;
    const exp = exposureProxy.current;
    if (env) scene.environmentIntensity = env.value;
    if (exp) gl.toneMappingExposure = exp.value;
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  TimelineDriver — builds a scrubbed GSAP timeline once, then seeks */
/*  it to the current scrollProgress on every change.                  */
/*  Pin is handled by EngineCanvasLoader — this only drives the 3D    */
/*  props (camera, engine rotation, lights, env, exposure).           */
/* ------------------------------------------------------------------ */
interface TimelineDriverProps {
  engineGroupRef: RefObject<THREE.Group | null>;
  engineIdleRef: RefObject<THREE.Group | null>;
  ambientLightRef: RefObject<THREE.AmbientLight | null>;
  rimLightRef: RefObject<THREE.SpotLight | null>;
  spotLightRef: RefObject<THREE.SpotLight | null>;
  fillLightRef: RefObject<THREE.DirectionalLight | null>;
  envIntensityProxy: React.RefObject<{ value: number } | null>;
  exposureProxy: React.RefObject<{ value: number } | null>;
  scrollProgress: number;
}

console.log("TimelineDriver rendered");

function TimelineDriver({
  engineGroupRef,
  engineIdleRef,
  ambientLightRef,
  rimLightRef,
  spotLightRef,
  fillLightRef,
  envIntensityProxy,
  exposureProxy,
  scrollProgress,
}: TimelineDriverProps) {
  const { camera: rawCamera } = useThree();
  const camera = rawCamera as THREE.PerspectiveCamera;
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));
  // Base look-at point + roll, driven by the GSAP timeline per stage.
  // The handheld drift in useFrame is layered ON TOP of these, so the camera
  // genuinely re-frames a different part of the engine each stage instead of
  // always orbiting the dead-center point.
  const lookAtBase = useRef(new THREE.Vector3(0, 0, 0));
  const rollBase = useRef({ value: 0 });
  const timelineBuilt = useRef(false);

  // Spring-physics state for organic idle animation (inertia-based, never repeating)
  const idleSpring = useRef({
    px: 0, py: 0, pz: 0,
    vx: 0, vy: 0, vz: 0,
    rx: 0, ry: 0, rz: 0,
    rvx: 0, rvy: 0, rvz: 0,
    scale: 1, sv: 0,
    timer: 1 + Math.random() * 2,
  });

  // Build the GSAP timeline once — paused, no ScrollTrigger
  useEffect(() => {
    if (timelineBuilt.current) return;
    timelineBuilt.current = true;

    const totalSteps = PIPELINE_STEPS.length;
    const firstStep = PIPELINE_STEPS[0];

    // Set initial camera state
    camera.position.set(firstStep.camPos[0], firstStep.camPos[1], firstStep.camPos[2]);
    camera.fov = firstStep.camFov;
    camera.updateProjectionMatrix();
    lookAtBase.current.set(firstStep.lookAt[0], firstStep.lookAt[1], firstStep.lookAt[2]);
    rollBase.current.value = firstStep.camRoll;
    camera.lookAt(lookAtBase.current);

    // Set initial engine rotation + position
    if (engineGroupRef.current) {
      engineGroupRef.current.rotation.set(
        firstStep.rotationOffset[0],
        firstStep.rotationOffset[1],
        firstStep.rotationOffset[2]
      );
      engineGroupRef.current.position.set(
        firstStep.positionOffset[0],
        firstStep.positionOffset[1],
        firstStep.positionOffset[2]
      );
    }

    // Set initial lighting
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = firstStep.ambientIntensity;
    }
    if (spotLightRef.current) {
      spotLightRef.current.intensity = firstStep.spotIntensity;
      spotLightRef.current.color.set(firstStep.spotColor);
    }
    if (rimLightRef.current) {
      rimLightRef.current.intensity = firstStep.rimIntensity;
      rimLightRef.current.color.set(firstStep.rimColor);
      rimLightRef.current.position.set(
        firstStep.rimPosition[0],
        firstStep.rimPosition[1],
        firstStep.rimPosition[2]
      );
    }
    if (fillLightRef.current) {
      fillLightRef.current.intensity = firstStep.fillIntensity;
      fillLightRef.current.color.set(firstStep.fillColor);
      fillLightRef.current.position.set(
        firstStep.fillPosition[0],
        firstStep.fillPosition[1],
        firstStep.fillPosition[2]
      );
    }
    if (envIntensityProxy.current) envIntensityProxy.current.value = firstStep.envIntensity;
    if (exposureProxy.current) exposureProxy.current.value = firstStep.exposure;

    // Build paused timeline with all keyframes
    const tl = gsap.timeline({ paused: true });
    console.log("Timeline CREATED");

    // Cinematic easing — engine matches camera easing for synchronized feel
    const engineEase = 'power3.inOut';
    const lightEase = 'power2.inOut';

    PIPELINE_STEPS.forEach((step, idx) => {
      if (idx === 0) return;

      const duration = 1 / (totalSteps - 1);
      const startTime = (idx - 1) * duration;

      // 1. Camera position
      tl.to(
        camera.position,
        { x: step.camPos[0], y: step.camPos[1], z: step.camPos[2], ease: 'power3.inOut', duration },
        startTime
      );

      // 2. Camera FOV
      const fovProxy = { value: PIPELINE_STEPS[idx - 1].camFov };
      tl.to(
        fovProxy,
        {
          value: step.camFov,
          ease: 'power2.inOut',
          duration,
          onUpdate: () => {
            camera.fov = fovProxy.value;
            camera.updateProjectionMatrix();
          },
        },
        startTime
      );

      // 2b. Camera look-at target — THIS is what makes each stage frame a
      // different physical part of the engine instead of always orbiting
      // the dead-center point. Tweened in lockstep with camera position.
      tl.to(
        lookAtBase.current,
        {
          x: step.lookAt[0],
          y: step.lookAt[1],
          z: step.lookAt[2],
          ease: 'power3.inOut',
          duration,
        },
        startTime
      );

      // 2c. Camera roll (dutch tilt) — subtle cinematic drama per stage
      tl.to(
        rollBase.current,
        { value: step.camRoll, ease: 'power2.inOut', duration },
        startTime
      );

      // 3. Engine rotation — power3.inOut matches camera, creating synchronized cinematic feel
      if (engineGroupRef.current) {
        tl.to(
          engineGroupRef.current.rotation,
          {
            x: step.rotationOffset[0],
            y: step.rotationOffset[1],
            z: step.rotationOffset[2],
            ease: engineEase,
            duration,
          },
          startTime
        );
      }

      // 4. Engine position — subtle translation gives each stage a distinct physical perspective
      if (engineGroupRef.current) {
        tl.to(
          engineGroupRef.current.position,
          {
            x: step.positionOffset[0],
            y: step.positionOffset[1],
            z: step.positionOffset[2],
            ease: engineEase,
            duration,
          },
          startTime
        );
      }

      // 5. Ambient light
      if (ambientLightRef.current) {
        tl.to(
          ambientLightRef.current,
          { intensity: step.ambientIntensity, ease: lightEase, duration },
          startTime
        );
      }

      // 6. Spot light (front key) — intensity + color
      if (spotLightRef.current) {
        tl.to(
          spotLightRef.current,
          { intensity: step.spotIntensity, ease: lightEase, duration },
          startTime
        );
        tl.to(
          spotLightRef.current.color,
          {
            r: STAGE_COLORS[idx].spot.r,
            g: STAGE_COLORS[idx].spot.g,
            b: STAGE_COLORS[idx].spot.b,
            ease: lightEase,
            duration,
          },
          startTime
        );
      }

      // 7. Rim light — position + intensity + color
      if (rimLightRef.current) {
        tl.to(
          rimLightRef.current.position,
          {
            x: step.rimPosition[0],
            y: step.rimPosition[1],
            z: step.rimPosition[2],
            ease: lightEase,
            duration,
          },
          startTime
        );
        tl.to(
          rimLightRef.current,
          { intensity: step.rimIntensity, ease: lightEase, duration },
          startTime
        );
        tl.to(
          rimLightRef.current.color,
          {
            r: STAGE_COLORS[idx].rim.r,
            g: STAGE_COLORS[idx].rim.g,
            b: STAGE_COLORS[idx].rim.b,
            ease: lightEase,
            duration,
          },
          startTime
        );
      }

      // 8. Fill light — position + intensity + color
      if (fillLightRef.current) {
        tl.to(
          fillLightRef.current.position,
          {
            x: step.fillPosition[0],
            y: step.fillPosition[1],
            z: step.fillPosition[2],
            ease: lightEase,
            duration,
          },
          startTime
        );
        tl.to(
          fillLightRef.current,
          { intensity: step.fillIntensity, ease: lightEase, duration },
          startTime
        );
        tl.to(
          fillLightRef.current.color,
          {
            r: STAGE_COLORS[idx].fill.r,
            g: STAGE_COLORS[idx].fill.g,
            b: STAGE_COLORS[idx].fill.b,
            ease: lightEase,
            duration,
          },
          startTime
        );
      }

      // 9. Environment intensity
      const envObj = envIntensityProxy.current;
      if (envObj) {
        tl.to(envObj, { value: step.envIntensity, ease: lightEase, duration }, startTime);
      }

      // 10. Exposure
      const expObj = exposureProxy.current;
      if (expObj) {
        tl.to(expObj, { value: step.exposure, ease: lightEase, duration }, startTime);
      }
    });

    // Seek to initial progress
    tl.progress(0);

    // Store for seeking
    (camera as any).__timeline = tl;

    return () => {
      tl.kill();
      timelineBuilt.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Seek timeline on progress change
  const lastProgress = useRef(0);
  // useEffect(() => {
  //   const tl = (camera as any).__timeline as gsap.core.Timeline | undefined;
  //   if (tl && Math.abs(scrollProgress - lastProgress.current) > 0.001) {
  //     tl.progress(scrollProgress);
  //     lastProgress.current = scrollProgress;
  //   }
  // }, [scrollProgress, camera]);

  useEffect(() => {
  console.log("EngineScene progress:", scrollProgress);

  const tl = (camera as any).__timeline as gsap.core.Timeline | undefined;

  console.log("Timeline exists?", !!tl);

  if (tl) {
    tl.progress(scrollProgress);
  }
}, [scrollProgress]);

  // Handheld cinematography — organic micro-drift + subtle roll
  // + engine idle animation (spring physics for realistic inertia)
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // --- Camera handheld drift (unchanged) ---
    const driftX =
      Math.sin(t * 0.37) * 0.005 +
      Math.sin(t * 0.73 + 1.2) * 0.003 +
      Math.sin(t * 1.19 + 2.8) * 0.001;

    const driftY =
      Math.sin(t * 0.41 + 1.7) * 0.004 +
      Math.sin(t * 0.89 + 0.3) * 0.002;

    const targetRoll =
      rollBase.current.value +
      Math.sin(t * 0.23) * 0.0008 +
      Math.sin(t * 0.67 + 1.1) * 0.0004;
    camera.rotation.z += (targetRoll - camera.rotation.z) * 0.04;

    lookAtTarget.current.set(
      lookAtBase.current.x + driftX,
      lookAtBase.current.y + driftY,
      lookAtBase.current.z
    );
    camera.lookAt(lookAtTarget.current);

    // --- Engine idle animation (spring physics, organic inertia) ---
    const idleGroup = engineIdleRef.current;
    if (idleGroup) {
      const dt = Math.min(delta, 0.05);
      const s = idleSpring.current;

      // Apply random impulses at irregular intervals — visible, slow "floating" feel
      s.timer -= dt;
      if (s.timer <= 0) {
        s.timer = 1.5 + Math.random() * 3.0;
        // Primary floating impulse (weighted upward for natural buoyancy)
        s.vy += (Math.random() - 0.4) * 0.05;
        // Horizontal drift impulses
        s.vx += (Math.random() - 0.5) * 0.02;
        s.vz += (Math.random() - 0.5) * 0.015;
        // Rotation impulses — slow organic tumble on top of the constant turntable spin
        s.rvy += (Math.random() - 0.5) * 0.01;
        s.rvx += (Math.random() - 0.5) * 0.005;
        s.rvz += (Math.random() - 0.5) * 0.003;
        // Breathing impulse
        s.sv += (Math.random() - 0.5) * 0.004;
      }

      // --- Spring-damper physics for each degree of freedom ---
      // Stiffness = how strongly it returns to rest, Damping = how fast oscillation decays

      const POS_STIFF = 0.5;
      const POS_DAMP = 0.9;

      s.vy += (-POS_STIFF * s.py - POS_DAMP * s.vy) * dt;
      s.py += s.vy * dt;

      s.vx += (-POS_STIFF * s.px - POS_DAMP * s.vx) * dt;
      s.px += s.vx * dt;

      s.vz += (-POS_STIFF * s.pz - POS_DAMP * s.vz) * dt;
      s.pz += s.vz * dt;

      // Rotation — softer springs so the organic sway rides on top of the turntable spin
      const ROT_STIFF = 0.35;
      const ROT_DAMP = 0.6;

      s.rvy += (-ROT_STIFF * s.ry - ROT_DAMP * s.rvy) * dt;
      s.ry += s.rvy * dt;

      s.rvx += (-ROT_STIFF * s.rx - ROT_DAMP * s.rvx) * dt;
      s.rx += s.rvx * dt;

      s.rvz += (-ROT_STIFF * s.rz - ROT_DAMP * s.rvz) * dt;
      s.rz += s.rvz * dt;

      // Scale — subtle breathing
      s.sv += (-POS_STIFF * (s.scale - 1) - POS_DAMP * s.sv) * dt;
      s.scale += s.sv * dt;

      // Micro-vibration overlay — mechanical weight hum (tiny, high-frequency)
      const microX =
        (Math.sin(t * 47.3) + Math.sin(t * 53.7 + 1.3)) * 0.00035 +
        Math.sin(t * 71.3 + 3.7) * 0.00025;
      const microY = Math.sin(t * 41.9 + 0.7) * 0.00035;
      const microZ =
        Math.sin(t * 61.1 + 2.1) * 0.00025 +
        Math.sin(t * 83.5 + 5.2) * 0.00025;

      idleGroup.position.set(s.px + microX, s.py + microY, s.pz + microZ);
      idleGroup.scale.setScalar(s.scale);
      idleGroup.rotation.x = s.rx;
      
      // Removed turntableY so GSAP dictates the rotation
      idleGroup.rotation.y = s.ry; 
      idleGroup.rotation.z = s.rz;
    }
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  EngineScene — assembles the 3D canvas with all choreography       */
/* ------------------------------------------------------------------ */
interface EngineSceneProps {
  containerRef: RefObject<HTMLDivElement | null>;
  activeStage: number;
  scrollProgress: number;
}

export function EngineScene({
  containerRef,
  activeStage,
  scrollProgress,
}: EngineSceneProps) {
  const engineGroupRef = useRef<THREE.Group>(null);
  const engineIdleRef = useRef<THREE.Group>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const rimLightRef = useRef<THREE.SpotLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);
  const envIntensityProxy = useRef({ value: 0.80 });
  const exposureProxy = useRef({ value: 0.95 });


  const currentStep = PIPELINE_STEPS[activeStage] || PIPELINE_STEPS[0];

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.95,
      }}
      className="w-full h-full bg-transparent"
    >
      {/* Cinematic Perspective Camera */}
      <PerspectiveCamera
        makeDefault
        position={[0, 1.6, 5.0]}
        fov={40}
        near={0.1}
        far={100}
      />

      {/* Timeline driver — drives all 3D animation from scrollProgress */}
      <Environment preset="studio" />

      {/* MOVE TIMELINE DRIVER HERE */}
      <Suspense fallback={null}>
        <TimelineDriver
          engineGroupRef={engineGroupRef}
          engineIdleRef={engineIdleRef}
          ambientLightRef={ambientLightRef}
          rimLightRef={rimLightRef}
          spotLightRef={spotLightRef}
          fillLightRef={fillLightRef}
          envIntensityProxy={envIntensityProxy}
          exposureProxy={exposureProxy}
          scrollProgress={scrollProgress}
        />
        <EngineModel engineGroupRef={engineGroupRef} engineIdleRef={engineIdleRef} />
      </Suspense>

      <VisibilityController />

      {/* Energy Pulse — fires on every stage transition */}
      <EnergyPulseLight
        triggerKey={activeStage}
        intensity={currentStep.pulseIntensity}
        color={currentStep.pulseColor}
      />

      {/* Environment + Exposure — updated per frame */}
      <LightingController
        envIntensityProxy={envIntensityProxy}
        exposureProxy={exposureProxy}
      />

      {/* --- Studio Lighting Setup --- */}
      <ambientLight ref={ambientLightRef} intensity={0.55} />

      <directionalLight
        position={[6, 9, 6]}
        intensity={2.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <directionalLight
        ref={fillLightRef}
        position={[-6, -3, -5]}
        intensity={0.8}
        color="#bae6fd"
      />

      <spotLight
        ref={rimLightRef}
        position={[3, 2, -5]}
        intensity={1.8}
        color="#7dd3fc"
        angle={0.7}
        penumbra={0.6}
        distance={15}
        decay={1}
      />

      <spotLight
        ref={spotLightRef}
        position={[0, 8, -6]}
        intensity={2.5}
        color="#38bdf8"
        angle={0.6}
        penumbra={0.8}
      />

      <Environment preset="studio" />

      <Suspense fallback={null}>
        <EngineModel engineGroupRef={engineGroupRef} engineIdleRef={engineIdleRef} />
      </Suspense>

      <VisibilityController />

      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.5}
        scale={9}
        blur={2.5}
        far={5}
        color="#000000"
      />
    </Canvas>
  );
}

export default EngineScene;

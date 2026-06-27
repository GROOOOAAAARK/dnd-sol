"use client";

import { Environment } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { DiceFaceLabels } from "@/components/dice-face-labels";
import { useDicePbrAssets } from "@/hooks/useDiceMaterials";
import type { DiceAnimationPhase } from "@/hooks/useDiceAnimation";
import { createDiceGeometry } from "@/lib/diceFaceGeometry";
import { type DiceRotation, DiceType } from "@/lib/diceGeometry";
import type { DiceSceneColors } from "@/lib/diceTextures";

interface DiceSceneProps {
  diceType: DiceType;
  phase: DiceAnimationPhase;
  targetRotation: DiceRotation | null;
  landedFace: number | null;
  onRoll: () => void;
  onSettled: () => void;
  disabled?: boolean;
}

interface DiceMeshProps extends DiceSceneProps {
  colors: DiceSceneColors;
}

const cssHsl = (value: string): string => {
  const [hue, saturation, lightness] = value.trim().split(/\s+/);

  return `hsl(${hue}, ${saturation}, ${lightness})`;
};

const readThemeColors = (): DiceSceneColors => {
  const styles = getComputedStyle(document.documentElement);

  return {
    gold: cssHsl(styles.getPropertyValue("--dice-gold")),
    foreground: cssHsl(styles.getPropertyValue("--dice-modal-foreground")),
    glow: cssHsl(styles.getPropertyValue("--dice-glow")),
    border: cssHsl(styles.getPropertyValue("--dice-modal-border")),
  };
};

const isActiveRollPhase = (phase: DiceAnimationPhase): boolean =>
  phase === "rolling" || phase === "settling";

const DiceLights = ({
  colors,
  phase,
}: {
  colors: DiceSceneColors;
  phase: DiceAnimationPhase;
}) => {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const pointRef = useRef<THREE.PointLight>(null);
  const isActive = isActiveRollPhase(phase);

  useFrame((state) => {
    const pulse = isActive ? 0.35 + Math.sin(state.clock.elapsedTime * 8) * 0.15 : 0;

    if (directionalRef.current) {
      directionalRef.current.intensity = 1.8 + pulse;
    }

    if (pointRef.current) {
      pointRef.current.intensity = 1.4 + pulse;
    }
  });

  return (
    <>
      <ambientLight color={colors.foreground} intensity={0.35} />
      <directionalLight
        ref={directionalRef}
        color={colors.glow}
        intensity={1.8}
        position={[3, 4, 5]}
        castShadow
      />
      <pointLight
        ref={pointRef}
        color="#ffffff"
        intensity={1.4}
        position={[-3, -2, 3]}
      />
    </>
  );
};

const DiceMesh = ({
  colors,
  diceType,
  disabled,
  onRoll,
  onSettled,
  phase,
  targetRotation,
}: DiceMeshProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const settledRef = useRef(false);
  const geometry = useMemo(() => createDiceGeometry(diceType), [diceType]);
  const { material, textures } = useDicePbrAssets();
  const isRolling = phase === "rolling";
  const isSettling = phase === "settling";

  useEffect(() => {
    settledRef.current = false;
  }, [targetRotation]);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry]
  );

  useFrame((state, delta) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    if (isRolling) {
      const elapsed = state.clock.elapsedTime;
      group.rotation.x += delta * (5.5 + Math.sin(elapsed * 3.1));
      group.rotation.y += delta * (7.25 + Math.cos(elapsed * 2.4));
      group.rotation.z += delta * (4.5 + Math.sin(elapsed * 4.7));
      group.position.y = Math.sin(elapsed * 9) * 0.12;
      return;
    }

    if (isSettling && targetRotation) {
      group.rotation.x = THREE.MathUtils.damp(
        group.rotation.x,
        targetRotation[0],
        6,
        delta
      );
      group.rotation.y = THREE.MathUtils.damp(
        group.rotation.y,
        targetRotation[1],
        6,
        delta
      );
      group.rotation.z = THREE.MathUtils.damp(
        group.rotation.z,
        targetRotation[2],
        6,
        delta
      );
      group.position.y = THREE.MathUtils.damp(group.position.y, 0, 8, delta);

      const distance = Math.max(
        Math.abs(group.rotation.x - targetRotation[0]),
        Math.abs(group.rotation.y - targetRotation[1]),
        Math.abs(group.rotation.z - targetRotation[2])
      );

      if (distance < 0.012 && !settledRef.current) {
        settledRef.current = true;
        group.rotation.set(
          targetRotation[0],
          targetRotation[1],
          targetRotation[2]
        );
        group.position.y = 0;
        onSettled();
      }
    }
  });

  return (
    <group
      ref={groupRef}
      scale={phase === "landed" ? 1.05 : 1}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled && phase === "idle") {
          onRoll();
        }
      }}
    >
      <mesh castShadow receiveShadow geometry={geometry} material={material} />
      <DiceFaceLabels
        colors={colors}
        diceType={diceType}
        geometry={geometry}
        textures={textures}
      />
    </group>
  );
};

const DiceSceneFallback = ({
  diceType,
  disabled,
  onRoll,
  phase,
}: Pick<DiceSceneProps, "diceType" | "disabled" | "onRoll" | "phase">) => (
  <button
    type="button"
    className="flex h-72 w-full items-center justify-center rounded-xl border border-dice-modal-border bg-dice-modal text-dice-modal-foreground"
    onClick={onRoll}
    disabled={disabled || phase !== "idle"}
  >
    Roll D{diceType}
  </button>
);

export function DiceScene(props: DiceSceneProps) {
  const [colors, setColors] = useState<DiceSceneColors | null>(null);

  useEffect(() => {
    setColors(readThemeColors());
  }, []);

  if (!colors) {
    return (
      <DiceSceneFallback
        diceType={props.diceType}
        disabled={props.disabled}
        onRoll={props.onRoll}
        phase={props.phase}
      />
    );
  }

  return (
    <div className="h-72 w-full overflow-hidden rounded-xl border border-dice-modal-border bg-dice-modal/80">
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
        <Environment preset="studio" environmentIntensity={0.85} />
        <DiceLights colors={colors} phase={props.phase} />
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1.65, 1.65, 1.65]} />
              <meshStandardMaterial color="#808080" wireframe />
            </mesh>
          }
        >
          <DiceMesh colors={colors} {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

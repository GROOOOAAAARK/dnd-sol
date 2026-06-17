"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  getDiceDefinition,
  type DiceRotation,
  DiceType,
} from "@/lib/diceGeometry";
import type { DiceAnimationPhase } from "@/hooks/useDiceAnimation";

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

interface DiceSceneColors {
  body: string;
  foreground: string;
  glow: string;
  border: string;
}

const cssHsl = (value: string): string => {
  const [hue, saturation, lightness] = value.trim().split(/\s+/);

  return `hsl(${hue}, ${saturation}, ${lightness})`;
};

const readThemeColors = (): DiceSceneColors => {
  const styles = getComputedStyle(document.documentElement);

  return {
    body: cssHsl(styles.getPropertyValue("--dice-gold")),
    foreground: cssHsl(styles.getPropertyValue("--dice-gold-foreground")),
    glow: cssHsl(styles.getPropertyValue("--dice-glow")),
    border: cssHsl(styles.getPropertyValue("--dice-modal-border")),
  };
};

const DiceGeometry = ({ diceType }: { diceType: DiceType }) => {
  switch (diceType) {
    case DiceType.D2:
      return <cylinderGeometry args={[1.15, 1.15, 0.28, 64]} />;
    case DiceType.D4:
      return <tetrahedronGeometry args={[1.55, 0]} />;
    case DiceType.D6:
      return <boxGeometry args={[1.65, 1.65, 1.65]} />;
    case DiceType.D20:
      return <icosahedronGeometry args={[1.5, 0]} />;
    default: {
      const exhaustive: never = diceType;
      return exhaustive;
    }
  }
};

const DiceMesh = ({
  colors,
  diceType,
  disabled,
  landedFace,
  onRoll,
  onSettled,
  phase,
  targetRotation,
}: DiceMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const settledRef = useRef(false);
  const definition = useMemo(() => getDiceDefinition(diceType), [diceType]);
  const isRolling = phase === "rolling";
  const isSettling = phase === "settling";
  const faceLabel = landedFace ? String(landedFace) : definition.label;

  useEffect(() => {
    settledRef.current = false;
  }, [targetRotation]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    if (isRolling) {
      const elapsed = state.clock.elapsedTime;
      mesh.rotation.x += delta * (5.5 + Math.sin(elapsed * 3.1));
      mesh.rotation.y += delta * (7.25 + Math.cos(elapsed * 2.4));
      mesh.rotation.z += delta * (4.5 + Math.sin(elapsed * 4.7));
      mesh.position.y = Math.sin(elapsed * 9) * 0.12;
      return;
    }

    if (isSettling && targetRotation) {
      mesh.rotation.x = THREE.MathUtils.damp(
        mesh.rotation.x,
        targetRotation[0],
        6,
        delta
      );
      mesh.rotation.y = THREE.MathUtils.damp(
        mesh.rotation.y,
        targetRotation[1],
        6,
        delta
      );
      mesh.rotation.z = THREE.MathUtils.damp(
        mesh.rotation.z,
        targetRotation[2],
        6,
        delta
      );
      mesh.position.y = THREE.MathUtils.damp(mesh.position.y, 0, 8, delta);

      const distance = Math.max(
        Math.abs(mesh.rotation.x - targetRotation[0]),
        Math.abs(mesh.rotation.y - targetRotation[1]),
        Math.abs(mesh.rotation.z - targetRotation[2])
      );

      if (distance < 0.012 && !settledRef.current) {
        settledRef.current = true;
        mesh.rotation.set(
          targetRotation[0],
          targetRotation[1],
          targetRotation[2]
        );
        mesh.position.y = 0;
        onSettled();
      }
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled && phase === "idle") {
            onRoll();
          }
        }}
        scale={phase === "landed" ? 1.05 : 1}
      >
        <DiceGeometry diceType={diceType} />
        <meshStandardMaterial
          color={colors.body}
          emissive={colors.glow}
          emissiveIntensity={isRolling || isSettling ? 0.42 : 0.16}
          metalness={0.25}
          roughness={isRolling ? 0.36 : 0.58}
        />
      </mesh>
      <Text
        color={colors.foreground}
        fontSize={landedFace ? 0.7 : 0.44}
        fontWeight={700}
        outlineColor={colors.border}
        outlineWidth={0.025}
        position={[0, 0, 1.9]}
      >
        {faceLabel}
      </Text>
    </group>
  );
};

export function DiceScene(props: DiceSceneProps) {
  const [colors, setColors] = useState<DiceSceneColors | null>(null);

  useEffect(() => {
    setColors(readThemeColors());
  }, []);

  if (!colors) {
    return (
      <button
        type="button"
        className="flex h-72 w-full items-center justify-center rounded-xl border border-dice-modal-border bg-dice-modal text-dice-modal-foreground"
        onClick={props.onRoll}
        disabled={props.disabled || props.phase !== "idle"}
      >
        Roll D{props.diceType}
      </button>
    );
  }

  return (
    <div className="h-72 w-full overflow-hidden rounded-xl border border-dice-modal-border bg-dice-modal/80">
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight color={colors.foreground} intensity={0.35} />
        <directionalLight
          color={colors.glow}
          intensity={1.8}
          position={[3, 4, 5]}
          castShadow
        />
        <pointLight
          color={colors.body}
          intensity={2.2}
          position={[-3, -2, 3]}
        />
        <DiceMesh colors={colors} {...props} />
      </Canvas>
    </div>
  );
}

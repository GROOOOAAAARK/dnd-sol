"use client";

import { Text } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { DICE_ENV_MAP_INTENSITY } from "@/lib/diceTextures";
import { getFaceLabelTransforms } from "@/lib/diceFaceGeometry";
import { DiceType } from "@/lib/diceGeometry";
import {
  LABEL_OUTLINE_COLOR,
  type DicePbrTextures,
  type DiceSceneColors,
} from "@/lib/diceTextures";

interface DiceFaceLabelsProps {
  colors: DiceSceneColors;
  diceType: DiceType;
  geometry: THREE.BufferGeometry;
  textures: DicePbrTextures;
}

export function DiceFaceLabels({
  colors,
  diceType,
  geometry,
  textures,
}: DiceFaceLabelsProps) {
  const labelMaterial = useMemo(() => {
    const gold = new THREE.Color(colors.gold);

    return new THREE.MeshStandardMaterial({
      map: textures.map,
      color: gold,
      normalMap: textures.normalMap,
      roughnessMap: textures.roughnessMap,
      metalnessMap: textures.metalnessMap,
      aoMap: textures.aoMap ?? undefined,
      metalness: 1,
      roughness: 1,
      envMapIntensity: DICE_ENV_MAP_INTENSITY,
      normalScale: new THREE.Vector2(1, -1),
    });
  }, [colors.gold, textures]);

  const labelTransforms = useMemo(
    () => getFaceLabelTransforms(geometry, diceType),
    [geometry, diceType]
  );

  useEffect(
    () => () => {
      labelMaterial.dispose();
    },
    [labelMaterial]
  );

  return (
    <>
      {labelTransforms.map((transform) => (
        <Text
          key={transform.faceNumber}
          anchorX="center"
          anchorY="middle"
          fontSize={transform.fontSize}
          material={labelMaterial}
          outlineColor={LABEL_OUTLINE_COLOR}
          outlineWidth={0.015}
          position={transform.position}
          quaternion={transform.quaternion}
        >
          {String(transform.faceNumber)}
        </Text>
      ))}
    </>
  );
}

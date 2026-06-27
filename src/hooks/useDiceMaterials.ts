"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import {
  configureLoadedDicePbrTextures,
  DICE_ENV_MAP_INTENSITY,
  dicePbrTextureUrls,
  type DicePbrTextures,
} from "@/lib/diceTextures";

const WHITE = new THREE.Color(0xffffff);

export interface DicePbrAssets {
  material: THREE.MeshStandardMaterial;
  textures: DicePbrTextures;
}

export function useDicePbrAssets(): DicePbrAssets {
  const loadedTextures = useTexture(dicePbrTextureUrls);
  const textures = useMemo(
    () =>
      configureLoadedDicePbrTextures({
        map: loadedTextures.map,
        normalMap: loadedTextures.normalMap,
        roughnessMap: loadedTextures.roughnessMap,
        metalnessMap: loadedTextures.metalnessMap,
        aoMap: loadedTextures.aoMap ?? null,
      }),
    [loadedTextures]
  );

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: textures.map,
        color: WHITE,
        normalMap: textures.normalMap,
        roughnessMap: textures.roughnessMap,
        metalnessMap: textures.metalnessMap,
        aoMap: textures.aoMap ?? undefined,
        metalness: 1,
        roughness: 1,
        envMapIntensity: DICE_ENV_MAP_INTENSITY,
        normalScale: new THREE.Vector2(1, -1),
      }),
    [textures]
  );

  useEffect(
    () => () => {
      material.dispose();
    },
    [material]
  );

  return { material, textures };
}

useTexture.preload([
  dicePbrTextureUrls.map,
  dicePbrTextureUrls.normalMap,
  dicePbrTextureUrls.roughnessMap,
  dicePbrTextureUrls.metalnessMap,
  dicePbrTextureUrls.aoMap,
]);

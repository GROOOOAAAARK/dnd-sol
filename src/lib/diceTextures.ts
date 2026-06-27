import * as THREE from "three";

import { DICE_TEXTURE_PATHS } from "@/constants";

export interface DiceSceneColors {
  gold: string;
  foreground: string;
  glow: string;
  border: string;
}

export interface DicePbrTextures {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  metalnessMap: THREE.Texture;
  aoMap: THREE.Texture | null;
}

export const configureDicePbrTexture = (
  texture: THREE.Texture,
  colorSpace: THREE.ColorSpace
): THREE.Texture => {
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;

  return texture;
};

export const dicePbrTextureUrls = {
  map: DICE_TEXTURE_PATHS.color,
  normalMap: DICE_TEXTURE_PATHS.normal,
  roughnessMap: DICE_TEXTURE_PATHS.roughness,
  metalnessMap: DICE_TEXTURE_PATHS.metalness,
  aoMap: DICE_TEXTURE_PATHS.ao,
} as const;

export const configureLoadedDicePbrTextures = (
  textures: DicePbrTextures
): DicePbrTextures => {
  configureDicePbrTexture(textures.map, THREE.SRGBColorSpace);
  configureDicePbrTexture(textures.normalMap, THREE.LinearSRGBColorSpace);
  configureDicePbrTexture(textures.roughnessMap, THREE.LinearSRGBColorSpace);
  configureDicePbrTexture(textures.metalnessMap, THREE.LinearSRGBColorSpace);

  if (textures.aoMap) {
    configureDicePbrTexture(textures.aoMap, THREE.LinearSRGBColorSpace);
  }

  return textures;
};

export const LABEL_OUTLINE_COLOR = "#2a2218";
export const DICE_ENV_MAP_INTENSITY = 1.15;

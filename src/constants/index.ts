import { characterClasses, characterRaces } from "./character";

export const DICE_TEXTURE_PATHS = {
  color: "/textures/dice/pitted-metal_albedo.png",
  normal: "/textures/dice/pitted-metal_normal-dx.png",
  roughness: "/textures/dice/pitted-metal_roughness.png",
  metalness: "/textures/dice/pitted-metal_metallic.png",
  ao: "/textures/dice/pitted-metal_ao.png",
} as const;

export { characterClasses, characterRaces };
import { buildTargetRotationsFromGeometry } from "@/lib/diceFaceGeometry";
import { DiceType, type DiceRotation } from "@/lib/diceTypes";

export { DiceType, type DiceRotation } from "@/lib/diceTypes";

export interface DiceDefinition {
  type: DiceType;
  label: string;
  faces: number[];
  targetRotations: Record<number, DiceRotation>;
}

const buildDiceDefinition = (type: DiceType, label: string): DiceDefinition => ({
  type,
  label,
  faces: [...Array(type)].map((_, index) => index + 1),
  targetRotations: buildTargetRotationsFromGeometry(type),
});

const diceDefinitions: Record<DiceType, DiceDefinition> = {
  [DiceType.D2]: buildDiceDefinition(DiceType.D2, "D2"),
  [DiceType.D4]: buildDiceDefinition(DiceType.D4, "D4"),
  [DiceType.D6]: buildDiceDefinition(DiceType.D6, "D6"),
  [DiceType.D20]: buildDiceDefinition(DiceType.D20, "D20"),
};

export const isSupportedDiceSides = (
  type: number
): boolean =>
  Object.values(DiceType).includes(type as DiceType);

export const getDiceDefinition = (type: DiceType): DiceDefinition =>
  diceDefinitions[type];

export const getTargetRotation = (
  type: DiceType,
  face: number
): DiceRotation => {
  const definition = getDiceDefinition(type);
  const rotation = definition.targetRotations[face];

  if (!rotation) {
    throw new Error(`Face ${face} is not valid for D${type}`);
  }

  return rotation;
};

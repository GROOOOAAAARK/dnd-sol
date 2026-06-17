export type DiceRotation = readonly [number, number, number];

export interface DiceDefinition {
  type: DiceType;
  label: string;
  faces: number[];
  targetRotations: Record<number, DiceRotation>;
}

export enum DiceType {
  D2 = 2,
  D4 = 4,
  D6 = 6,
  D20 = 20,
}

const buildRotations = (
  type: DiceType
): Record<number, DiceRotation> => {
  const rotations: Record<number, DiceRotation> = {};

  for (let face = 1; face <= type; face += 1) {
    const progress = (face - 1) / type;
    rotations[face] = [
      Number((progress * Math.PI * 2).toFixed(4)),
      Number((((face % 5) / 5) * Math.PI * 2).toFixed(4)),
      Number((((face % 3) / 3) * Math.PI * 2).toFixed(4)),
    ];
  }

  return rotations;
};

const diceDefinitions: Record<DiceType, DiceDefinition> = {
  [DiceType.D2]: {
    type: DiceType.D2,
    label: "D2",
    faces: [1, 2],
    targetRotations: {
      1: [Math.PI / 2, 0, 0],
      2: [-Math.PI / 2, 0, 0],
    },
  },
  [DiceType.D4]: {
    type: DiceType.D4,
    label: "D4",
    faces: [1, 2, 3, 4],
    targetRotations: buildRotations(4),
  },
  [DiceType.D6]: {
    type: DiceType.D6,
    label: "D6",
    faces: [1, 2, 3, 4, 5, 6],
    targetRotations: {
      1: [0, 0, 0],
      2: [0, -Math.PI / 2, 0],
      3: [Math.PI / 2, 0, 0],
      4: [-Math.PI / 2, 0, 0],
      5: [0, Math.PI / 2, 0],
      6: [Math.PI, 0, 0],
    },
  },
  [DiceType.D20]: {
    type: DiceType.D20,
    label: "D20",
    faces: [...Array(20)].map((_, index) => index + 1),
    targetRotations: buildRotations(20),
  },
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

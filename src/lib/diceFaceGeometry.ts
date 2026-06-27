import * as THREE from "three";

import { DiceType, type DiceRotation } from "@/lib/diceTypes";

const CAMERA_FACING = new THREE.Vector3(0, 0, 1);

// BoxGeometry group order: +X, -X, +Y, -Y, +Z, -Z
const D6_FACE_TO_MATERIAL: Record<number, number> = {
  1: 4,
  2: 0,
  3: 2,
  4: 3,
  5: 1,
  6: 5,
};

const D6_MATERIAL_TO_FACE: Record<number, number> = Object.fromEntries(
  Object.entries(D6_FACE_TO_MATERIAL).map(([face, materialIndex]) => [
    materialIndex,
    Number(face),
  ])
);

const D2_FACE_TO_MATERIAL: Record<number, number> = {
  1: 1,
  2: 2,
};

const TEXT_FORWARD = new THREE.Vector3(0, 0, 1);
const LABEL_SURFACE_OFFSET = 0.025;

const FONT_EDGE_FACTOR_BY_DICE: Record<DiceType, number> = {
  [DiceType.D2]: 0.42,
  [DiceType.D4]: 0.38,
  [DiceType.D6]: 0.44,
  [DiceType.D20]: 0.28,
};

export interface FaceLabelTransform {
  faceNumber: number;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fontSize: number;
}

export const getFaceCount = (diceType: DiceType): number => diceType;

export const getMaterialCount = (diceType: DiceType): number => {
  switch (diceType) {
    case DiceType.D2:
      return 3;
    case DiceType.D4:
      return 4;
    case DiceType.D6:
      return 6;
    case DiceType.D20:
      return 20;
    default: {
      const exhaustive: never = diceType;
      return exhaustive;
    }
  }
};

export const getFaceMaterialIndex = (
  diceType: DiceType,
  faceNumber: number
): number => {
  switch (diceType) {
    case DiceType.D2:
      return D2_FACE_TO_MATERIAL[faceNumber] ?? 0;
    case DiceType.D4:
    case DiceType.D20:
      return faceNumber - 1;
    case DiceType.D6:
      return D6_FACE_TO_MATERIAL[faceNumber];
    default: {
      const exhaustive: never = diceType;
      return exhaustive;
    }
  }
};

export const getFaceNumberForMaterialIndex = (
  diceType: DiceType,
  materialIndex: number
): number | null => {
  switch (diceType) {
    case DiceType.D2:
      if (materialIndex === 1) {
        return 1;
      }
      if (materialIndex === 2) {
        return 2;
      }
      return null;
    case DiceType.D4:
    case DiceType.D20:
      return materialIndex + 1;
    case DiceType.D6:
      return D6_MATERIAL_TO_FACE[materialIndex] ?? null;
    default: {
      const exhaustive: never = diceType;
      return exhaustive;
    }
  }
};

const splitFaceGroups = (
  geometry: THREE.BufferGeometry,
  faceCount: number
): void => {
  geometry.clearGroups();

  for (let face = 0; face < faceCount; face += 1) {
    geometry.addGroup(face * 3, 3, face);
  }
};

const getGroupVertexIndices = (
  geometry: THREE.BufferGeometry,
  group: THREE.GeometryGroup
): number[] => {
  const indexAttribute = geometry.index;
  const uniqueIndices = new Set<number>();

  if (indexAttribute) {
    const indices = indexAttribute.array;

    for (let index = group.start; index < group.start + group.count; index += 1) {
      uniqueIndices.add(indices[index]);
    }
  } else {
    for (let index = group.start; index < group.start + group.count; index += 1) {
      uniqueIndices.add(index);
    }
  }

  return [...uniqueIndices];
};

const applyPlanarUvsToGroup = (
  geometry: THREE.BufferGeometry,
  group: THREE.GeometryGroup
): void => {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertexIndices = getGroupVertexIndices(geometry, group);

  if (vertexIndices.length < 3) {
    return;
  }

  const vertices = vertexIndices.map((index) =>
    new THREE.Vector3().fromBufferAttribute(position, index)
  );
  const centroid = vertices
    .reduce((total, vertex) => total.add(vertex), new THREE.Vector3())
    .divideScalar(vertices.length);

  const edgeOne = new THREE.Vector3().subVectors(vertices[1], vertices[0]);
  const edgeTwo = new THREE.Vector3().subVectors(vertices[2], vertices[0]);
  const normal = new THREE.Vector3().crossVectors(edgeOne, edgeTwo).normalize();

  if (normal.dot(centroid) < 0) {
    normal.negate();
  }

  const tangent = new THREE.Vector3();

  if (Math.abs(normal.y) < 0.99) {
    tangent.set(0, 1, 0).cross(normal).normalize();
  } else {
    tangent.set(1, 0, 0).cross(normal).normalize();
  }

  const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  const projected = vertices.map((vertex) => {
    const offset = vertex.clone().sub(centroid);

    return new THREE.Vector2(offset.dot(tangent), offset.dot(bitangent));
  });

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  projected.forEach((point) => {
    minU = Math.min(minU, point.x);
    maxU = Math.max(maxU, point.x);
    minV = Math.min(minV, point.y);
    maxV = Math.max(maxV, point.y);
  });

  const spanU = maxU - minU || 1;
  const spanV = maxV - minV || 1;

  let uvAttribute = geometry.attributes.uv as THREE.BufferAttribute | undefined;

  if (!uvAttribute) {
    geometry.setAttribute(
      "uv",
      new THREE.BufferAttribute(
        new Float32Array(position.count * 2),
        2
      )
    );
    uvAttribute = geometry.attributes.uv as THREE.BufferAttribute;
  }

  projected.forEach((point, index) => {
    const vertexIndex = vertexIndices[index];
    uvAttribute!.setXY(
      vertexIndex,
      (point.x - minU) / spanU,
      (point.y - minV) / spanV
    );
  });

  uvAttribute.needsUpdate = true;
};

export const getFaceGroupUvBounds = (
  geometry: THREE.BufferGeometry,
  materialIndex: number
): { minU: number; maxU: number; minV: number; maxV: number; centerU: number; centerV: number } => {
  const group = getGeometryGroupForMaterialIndex(geometry, materialIndex);
  const uvAttribute = geometry.attributes.uv as THREE.BufferAttribute;
  const vertexIndices = getGroupVertexIndices(geometry, group);

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  vertexIndices.forEach((vertexIndex) => {
    const u = uvAttribute.getX(vertexIndex);
    const v = uvAttribute.getY(vertexIndex);

    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  });

  return {
    minU,
    maxU,
    minV,
    maxV,
    centerU: (minU + maxU) / 2,
    centerV: (minV + maxV) / 2,
  };
};

const applyPlanarFaceUvs = (
  geometry: THREE.BufferGeometry,
  diceType: DiceType
): void => {
  switch (diceType) {
    case DiceType.D2:
      geometry.groups
        .filter((group) => group.materialIndex === 1 || group.materialIndex === 2)
        .forEach((group) => applyPlanarUvsToGroup(geometry, group));
      break;
    case DiceType.D4:
    case DiceType.D20:
      geometry.groups.forEach((group) => applyPlanarUvsToGroup(geometry, group));
      break;
    case DiceType.D6:
      break;
    default: {
      const exhaustive: never = diceType;
      return exhaustive;
    }
  }
};

export const createDiceGeometry = (diceType: DiceType): THREE.BufferGeometry => {
  let geometry: THREE.BufferGeometry;

  switch (diceType) {
    case DiceType.D2:
      geometry = new THREE.CylinderGeometry(1.15, 1.15, 0.28, 64);
      break;
    case DiceType.D4: {
      geometry = new THREE.TetrahedronGeometry(1.55, 0);
      splitFaceGroups(geometry, 4);
      break;
    }
    case DiceType.D6:
      geometry = new THREE.BoxGeometry(1.65, 1.65, 1.65);
      break;
    case DiceType.D20: {
      geometry = new THREE.IcosahedronGeometry(1.5, 0);
      splitFaceGroups(geometry, 20);
      break;
    }
    default: {
      const exhaustive: never = diceType;
      return exhaustive;
    }
  }

  applyPlanarFaceUvs(geometry, diceType);

  return geometry;
};

const getGeometryGroupForMaterialIndex = (
  geometry: THREE.BufferGeometry,
  materialIndex: number
): THREE.GeometryGroup => {
  const group = geometry.groups.find(
    (candidate) => candidate.materialIndex === materialIndex
  );

  if (!group) {
    throw new Error(`No geometry group for material index ${materialIndex}`);
  }

  return group;
};

export const getFaceNormalForMaterialIndex = (
  geometry: THREE.BufferGeometry,
  materialIndex: number
): THREE.Vector3 => {
  const group = getGeometryGroupForMaterialIndex(geometry, materialIndex);
  const indexAttribute = geometry.index;
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const normal = new THREE.Vector3();
  const vertexA = new THREE.Vector3();
  const vertexB = new THREE.Vector3();
  const vertexC = new THREE.Vector3();
  const edgeOne = new THREE.Vector3();
  const edgeTwo = new THREE.Vector3();
  const faceCenter = new THREE.Vector3();
  let vertexCount = 0;

  const accumulateTriangle = (
    indexA: number,
    indexB: number,
    indexC: number
  ): void => {
    vertexA.fromBufferAttribute(position, indexA);
    vertexB.fromBufferAttribute(position, indexB);
    vertexC.fromBufferAttribute(position, indexC);
    edgeOne.subVectors(vertexB, vertexA);
    edgeTwo.subVectors(vertexC, vertexA);
    normal.add(edgeOne.cross(edgeTwo));
    faceCenter.add(vertexA).add(vertexB).add(vertexC);
    vertexCount += 3;
  };

  if (indexAttribute) {
    const indices = indexAttribute.array;

    for (let index = group.start; index < group.start + group.count; index += 3) {
      accumulateTriangle(
        indices[index],
        indices[index + 1],
        indices[index + 2]
      );
    }
  } else {
    for (let index = group.start; index < group.start + group.count; index += 3) {
      accumulateTriangle(index, index + 1, index + 2);
    }
  }

  if (vertexCount === 0) {
    throw new Error(`Material index ${materialIndex} has no face triangles`);
  }

  faceCenter.divideScalar(vertexCount);

  if (normal.lengthSq() === 0) {
    throw new Error(`Material index ${materialIndex} produced a zero normal`);
  }

  normal.normalize();

  if (normal.dot(faceCenter) < 0) {
    normal.negate();
  }

  return normal;
};

export const getFaceCentroid = (
  geometry: THREE.BufferGeometry,
  materialIndex: number
): THREE.Vector3 => {
  const group = getGeometryGroupForMaterialIndex(geometry, materialIndex);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertexIndices = getGroupVertexIndices(geometry, group);

  return vertexIndices
    .map((vertexIndex) =>
      new THREE.Vector3().fromBufferAttribute(position, vertexIndex)
    )
    .reduce(
      (total, vertex) => total.add(vertex),
      new THREE.Vector3()
    )
    .divideScalar(vertexIndices.length);
};

const getFaceMinEdgeLength = (vertices: THREE.Vector3[]): number => {
  let minEdge = Infinity;

  for (let index = 0; index < vertices.length; index += 1) {
    const next = vertices[(index + 1) % vertices.length] ?? vertices[0];
    minEdge = Math.min(minEdge, vertices[index].distanceTo(next));
  }

  return minEdge;
};

export const getFaceLabelFontSize = (
  diceType: DiceType,
  faceNumber: number,
  vertices: THREE.Vector3[]
): number => {
  const centroid = vertices
    .reduce(
      (total, vertex) => total.add(vertex),
      new THREE.Vector3()
    )
    .divideScalar(vertices.length);

  const basis =
    diceType === DiceType.D2
      ? Math.max(...vertices.map((vertex) => vertex.distanceTo(centroid))) * 2
      : getFaceMinEdgeLength(vertices);

  let fontSize = basis * FONT_EDGE_FACTOR_BY_DICE[diceType];

  if (String(faceNumber).length >= 2) {
    fontSize *= 0.72;
  }

  return fontSize;
};

export const getFaceLabelTransforms = (
  geometry: THREE.BufferGeometry,
  diceType: DiceType
): FaceLabelTransform[] => {
  const transforms: FaceLabelTransform[] = [];
  const materialCount = getMaterialCount(diceType);

  for (let materialIndex = 0; materialIndex < materialCount; materialIndex += 1) {
    const faceNumber = getFaceNumberForMaterialIndex(diceType, materialIndex);

    if (faceNumber === null) {
      continue;
    }

    const group = getGeometryGroupForMaterialIndex(geometry, materialIndex);
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const vertexIndices = getGroupVertexIndices(geometry, group);
    const vertices = vertexIndices.map((vertexIndex) =>
      new THREE.Vector3().fromBufferAttribute(position, vertexIndex)
    );
    const centroid = getFaceCentroid(geometry, materialIndex);
    const normal = getFaceNormalForMaterialIndex(geometry, materialIndex);
    const labelPosition = centroid
      .clone()
      .add(normal.clone().multiplyScalar(LABEL_SURFACE_OFFSET));
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      TEXT_FORWARD,
      normal.clone()
    );

    transforms.push({
      faceNumber,
      position: labelPosition,
      quaternion,
      fontSize: getFaceLabelFontSize(diceType, faceNumber, vertices),
    });
  }

  return transforms;
};

export const getRotationToFaceCamera = (
  localNormal: THREE.Vector3
): DiceRotation => {
  const normalized = localNormal.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    normalized,
    CAMERA_FACING
  );
  const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

  return [
    Number(euler.x.toFixed(4)),
    Number(euler.y.toFixed(4)),
    Number(euler.z.toFixed(4)),
  ];
};

export const buildTargetRotationsFromGeometry = (
  diceType: DiceType
): Record<number, DiceRotation> => {
  const geometry = createDiceGeometry(diceType);
  const rotations: Record<number, DiceRotation> = {};

  for (let face = 1; face <= diceType; face += 1) {
    const materialIndex = getFaceMaterialIndex(diceType, face);
    const normal = getFaceNormalForMaterialIndex(geometry, materialIndex);
    rotations[face] = getRotationToFaceCamera(normal);
  }

  geometry.dispose();

  return rotations;
};

export const getRotatedFaceNormal = (
  localNormal: THREE.Vector3,
  rotation: DiceRotation
): THREE.Vector3 =>
  localNormal
    .clone()
    .applyEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], "XYZ"))
    .normalize();

export const prepareDiceGeometry = (
  geometry: THREE.BufferGeometry,
  diceType: DiceType
): THREE.BufferGeometry => {
  const prepared = geometry.clone();

  switch (diceType) {
    case DiceType.D4:
      splitFaceGroups(prepared, 4);
      break;
    case DiceType.D20:
      splitFaceGroups(prepared, 20);
      break;
    case DiceType.D2:
    case DiceType.D6:
      break;
    default: {
      const exhaustive: never = diceType;
      return exhaustive;
    }
  }

  applyPlanarFaceUvs(prepared, diceType);

  return prepared;
};

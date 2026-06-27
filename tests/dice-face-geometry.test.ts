import { expect } from "chai";
import * as THREE from "three";

import {
  buildTargetRotationsFromGeometry,
  createDiceGeometry,
  getFaceCentroid,
  getFaceCount,
  getFaceGroupUvBounds,
  getFaceLabelTransforms,
  getFaceMaterialIndex,
  getFaceNormalForMaterialIndex,
  getFaceNumberForMaterialIndex,
  getMaterialCount,
  getRotatedFaceNormal,
} from "../src/lib/diceFaceGeometry";
import { DiceType, getTargetRotation } from "../src/lib/diceGeometry";

const expectNormalFacingCamera = (normal: THREE.Vector3): void => {
  expect(normal.x).to.be.closeTo(0, 0.02);
  expect(normal.y).to.be.closeTo(0, 0.02);
  expect(normal.z).to.be.closeTo(1, 0.02);
};

describe("dice face geometry", () => {
  it("maps each dice type to the expected material slot count", () => {
    expect(getMaterialCount(DiceType.D2)).to.equal(3);
    expect(getMaterialCount(DiceType.D4)).to.equal(4);
    expect(getMaterialCount(DiceType.D6)).to.equal(6);
    expect(getMaterialCount(DiceType.D20)).to.equal(20);
  });

  it("maps numbered faces to material indices and back for D6", () => {
    expect(getFaceMaterialIndex(DiceType.D6, 1)).to.equal(4);
    expect(getFaceMaterialIndex(DiceType.D6, 6)).to.equal(5);
    expect(getFaceNumberForMaterialIndex(DiceType.D6, 4)).to.equal(1);
    expect(getFaceNumberForMaterialIndex(DiceType.D6, 5)).to.equal(6);
  });

  it("maps D2 caps to numbered faces and leaves the side unnumbered", () => {
    expect(getFaceMaterialIndex(DiceType.D2, 1)).to.equal(1);
    expect(getFaceMaterialIndex(DiceType.D2, 2)).to.equal(2);
    expect(getFaceNumberForMaterialIndex(DiceType.D2, 0)).to.equal(null);
    expect(getFaceNumberForMaterialIndex(DiceType.D2, 1)).to.equal(1);
  });

  it("creates grouped geometries for polyhedral dice", () => {
    const d4 = createDiceGeometry(DiceType.D4);
    const d20 = createDiceGeometry(DiceType.D20);

    expect(d4.groups).to.have.length(getFaceCount(DiceType.D4));
    expect(d20.groups).to.have.length(getFaceCount(DiceType.D20));
  });

  it("keeps D6 face material indices aligned with landing rotations", () => {
    for (let face = 1; face <= 6; face += 1) {
      expect(getTargetRotation(DiceType.D6, face)).to.be.an("array");
      expect(getFaceMaterialIndex(DiceType.D6, face)).to.be.at.least(0);
      expect(getFaceMaterialIndex(DiceType.D6, face)).to.be.below(6);
    }
  });

  it("aligns every numbered face toward the camera for each dice type", () => {
    for (const diceType of [
      DiceType.D2,
      DiceType.D4,
      DiceType.D6,
      DiceType.D20,
    ]) {
      const geometry = createDiceGeometry(diceType);
      const rotations = buildTargetRotationsFromGeometry(diceType);

      for (let face = 1; face <= diceType; face += 1) {
        const materialIndex = getFaceMaterialIndex(diceType, face);
        const localNormal = getFaceNormalForMaterialIndex(
          geometry,
          materialIndex
        );
        const rotatedNormal = getRotatedFaceNormal(
          localNormal,
          rotations[face]
        );

        expectNormalFacingCamera(rotatedNormal);
        expect(getTargetRotation(diceType, face)).to.deep.equal(
          rotations[face]
        );
      }

      geometry.dispose();
    }
  });

  it("maps planar UVs across each numbered polyhedral face", () => {
    for (const diceType of [DiceType.D4, DiceType.D20]) {
      const geometry = createDiceGeometry(diceType);

      for (let face = 1; face <= diceType; face += 1) {
        const materialIndex = getFaceMaterialIndex(diceType, face);
        const bounds = getFaceGroupUvBounds(geometry, materialIndex);

        expect(bounds.minU).to.be.at.least(0);
        expect(bounds.maxU).to.be.at.most(1);
        expect(bounds.minV).to.be.at.least(0);
        expect(bounds.maxV).to.be.at.most(1);
        expect(bounds.maxU - bounds.minU).to.be.greaterThan(0.4);
        expect(bounds.maxV - bounds.minV).to.be.greaterThan(0.4);
        expect(bounds.centerU).to.be.closeTo(0.5, 0.25);
        expect(bounds.centerV).to.be.closeTo(0.5, 0.25);
      }

      geometry.dispose();
    }
  });

  it("maps planar UVs for D2 caps", () => {
    const geometry = createDiceGeometry(DiceType.D2);

    for (const materialIndex of [1, 2]) {
      const bounds = getFaceGroupUvBounds(geometry, materialIndex);

      expect(bounds.maxU - bounds.minU).to.be.greaterThan(0.4);
      expect(bounds.maxV - bounds.minV).to.be.greaterThan(0.4);
      expect(bounds.centerU).to.be.closeTo(0.5, 0.25);
      expect(bounds.centerV).to.be.closeTo(0.5, 0.25);
    }

    geometry.dispose();
  });
});

describe("dice face label transforms", () => {
  it("creates one transform per numbered face", () => {
    expect(getFaceLabelTransforms(createDiceGeometry(DiceType.D2), DiceType.D2)).to
      .have.length(2);
    expect(getFaceLabelTransforms(createDiceGeometry(DiceType.D4), DiceType.D4)).to
      .have.length(4);
    expect(getFaceLabelTransforms(createDiceGeometry(DiceType.D6), DiceType.D6)).to
      .have.length(6);
    expect(getFaceLabelTransforms(createDiceGeometry(DiceType.D20), DiceType.D20)).to
      .have.length(20);
  });

  it("places label centroids on the face plane slightly above the surface", () => {
    const geometry = createDiceGeometry(DiceType.D6);
    const transforms = getFaceLabelTransforms(geometry, DiceType.D6);

    transforms.forEach((transform) => {
      const materialIndex = getFaceMaterialIndex(DiceType.D6, transform.faceNumber);
      const centroid = getFaceCentroid(geometry, materialIndex);
      const normal = getFaceNormalForMaterialIndex(geometry, materialIndex);
      const expected = centroid
        .clone()
        .add(normal.clone().multiplyScalar(0.025));
      const offset = transform.position.clone().sub(expected);

      expect(offset.length()).to.be.lessThan(0.001);
    });

    geometry.dispose();
  });
});

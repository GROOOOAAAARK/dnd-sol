import { expect } from "chai";

import {
  getDiceDefinition,
  getTargetRotation,
  isSupportedDiceSides,
} from "../src/lib/diceGeometry";
import {
  classifyDiceOutcome,
  getDiceTotal,
  getSuccessProgress,
} from "../src/lib/diceOutcomes";
import type { DiceResult } from "../src/models/types";

describe("dice UI helpers", () => {
  it("accepts only dice supported by the modal", () => {
    expect(isSupportedDiceSides(2)).to.equal(true);
    expect(isSupportedDiceSides(4)).to.equal(true);
    expect(isSupportedDiceSides(6)).to.equal(true);
    expect(isSupportedDiceSides(20)).to.equal(true);
    expect(isSupportedDiceSides(8)).to.equal(false);
  });

  it("provides deterministic landing rotations for every valid face", () => {
    const d20 = getDiceDefinition(20);

    expect(d20.faces).to.deep.equal(
      [...Array(20)].map((_, index) => index + 1)
    );
    expect(getTargetRotation(20, 1)).to.deep.equal(d20.targetRotations[1]);
    expect(getTargetRotation(20, 20)).to.deep.equal(d20.targetRotations[20]);
  });

  it("rejects impossible landing faces", () => {
    expect(() => getTargetRotation(6, 7)).to.throw(
      "Face 7 is not valid for D6"
    );
  });

  it("classifies critical outcomes before regular success states", () => {
    const criticalSuccess: DiceResult = {
      raw_result: 20,
      bonus: 0,
      success: true,
      critical_success: true,
      critical_failure: false,
    };
    const criticalFailure: DiceResult = {
      raw_result: 1,
      bonus: 10,
      success: true,
      critical_success: false,
      critical_failure: true,
    };

    expect(classifyDiceOutcome(criticalSuccess)).to.equal("critical-success");
    expect(classifyDiceOutcome(criticalFailure)).to.equal("critical-failure");
  });

  it("calculates total and bounded success progress", () => {
    const result: DiceResult = {
      raw_result: 12,
      bonus: 3,
      success: true,
      critical_success: false,
      critical_failure: false,
    };

    expect(getDiceTotal(result)).to.equal(15);
    expect(getSuccessProgress(result, 20)).to.deep.equal({
      totalPercent: 75,
      thresholdPercent: 100,
    });
  });
});

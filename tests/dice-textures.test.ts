import { expect } from "chai";

import { DiceType } from "../src/lib/diceTypes";

describe("dice label textures", () => {
  it("exports a warm bronze outline color for face labels", async () => {
    const { LABEL_OUTLINE_COLOR } = await import("../src/lib/diceTextures");

    expect(LABEL_OUTLINE_COLOR).to.equal("#2a2218");
  });
});

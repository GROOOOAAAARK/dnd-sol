import { createHash, randomBytes } from "crypto";

import { mockGameSteps } from "@/assets/mocks/adventures";

export function createAdventureSecret() {
  return randomBytes(32).toString("hex");
}

export function createSeedSalt() {
  return randomBytes(32).toString("hex");
}

export function hashString(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getAdventurePathHash(
  seedSaltHash: string,
  adventureId: string
) {
  return hashString(`${seedSaltHash}${adventureId}`);
}

export function getAdventureVersionHash(adventureId: string) {
  const adventureSteps = Object.values(mockGameSteps)
    .filter((step) => step.adventureId === adventureId)
    .sort((left, right) => left.id.localeCompare(right.id));

  return hashString(stableStringify(adventureSteps));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right)
    );

    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableStringify(entryValue)}`
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

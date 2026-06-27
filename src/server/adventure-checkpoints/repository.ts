import {
  AdventureCheckpoint as PrismaAdventureCheckpoint,
  AdventureCheckpointStatus as PrismaAdventureCheckpointStatus,
  Prisma,
} from "@prisma/client/index";
import type { PrismaClient } from "@prisma/client/index";

import type { AdventureCheckpoint } from "@/models/types";
import { getPrismaClient } from "@/server/prisma/client";
import { TypedPrismaRepository } from "@/server/repositories/typed-prisma.repository";

type PersistedCheckpointInput = CheckpointIdentity & {
  current_step_id: string;
  adventure_seed: string;
  seed_salt: string;
  adventure_seed_hash: string;
  seed_salt_hash: string;
  adventure_path_hash: string;
  adventure_version_hash: string;
};

type CheckpointIdentity = Pick<
  AdventureCheckpoint,
  "wallet_pubkey" | "character_id" | "adventure_id"
>;

export abstract class AdventureCheckpointRepository {
  abstract getCheckpoint(
    identity: CheckpointIdentity
  ): Promise<AdventureCheckpoint | null>;

  abstract listActiveCheckpoints(
    identity: Pick<AdventureCheckpoint, "wallet_pubkey" | "character_id">
  ): Promise<AdventureCheckpoint[]>;

  abstract createCheckpoint(
    input: PersistedCheckpointInput
  ): Promise<AdventureCheckpoint>;

  abstract updateCheckpointStep(
    identity: CheckpointIdentity,
    currentStepId: string
  ): Promise<AdventureCheckpoint>;

  abstract completeCheckpoint(
    identity: CheckpointIdentity
  ): Promise<AdventureCheckpoint>;

  abstract deleteCheckpoint(identity: CheckpointIdentity): Promise<void>;
}

export class PrismaAdventureCheckpointRepository
  extends TypedPrismaRepository<
    AdventureCheckpoint,
    PrismaAdventureCheckpoint,
    Prisma.AdventureCheckpointWhereUniqueInput,
    Prisma.AdventureCheckpointWhereInput,
    Prisma.AdventureCheckpointCreateInput,
    Prisma.AdventureCheckpointUpdateInput,
    Prisma.AdventureCheckpointOrderByWithRelationInput
  >
  implements AdventureCheckpointRepository
{
  constructor(prisma: PrismaClient) {
    super(prisma, prisma.adventureCheckpoint);
  }

  async getCheckpoint(identity: CheckpointIdentity) {
    const checkpoint = await this.repository.findUnique(
      this.toUniqueIdentity(identity)
    );

    return checkpoint ? this.toDomain(checkpoint) : null;
  }

  async listActiveCheckpoints(
    identity: Pick<AdventureCheckpoint, "wallet_pubkey" | "character_id">
  ) {
    const checkpoints = await this.repository.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      where: {
        walletPubkey: identity.wallet_pubkey,
        characterId: identity.character_id,
        status: PrismaAdventureCheckpointStatus.Active,
      },
    });

    return checkpoints.map((checkpoint) => this.toDomain(checkpoint));
  }

  async createCheckpoint(input: PersistedCheckpointInput) {
    const now = new Date();
    const checkpoint = await this.repository.upsert({
      create: {
        walletPubkey: input.wallet_pubkey,
        characterId: input.character_id,
        adventureId: input.adventure_id,
        currentStepId: input.current_step_id,
        adventureSeed: input.adventure_seed,
        seedSalt: input.seed_salt,
        adventureSeedHash: input.adventure_seed_hash,
        seedSaltHash: input.seed_salt_hash,
        adventurePathHash: input.adventure_path_hash,
        adventureVersionHash: input.adventure_version_hash,
        saveRevision: 1,
        status: PrismaAdventureCheckpointStatus.Active,
        startedAt: now,
        updatedAt: now,
        completedAt: null,
      },
      update: {
        currentStepId: input.current_step_id,
        adventureSeed: input.adventure_seed,
        seedSalt: input.seed_salt,
        adventureSeedHash: input.adventure_seed_hash,
        seedSaltHash: input.seed_salt_hash,
        adventurePathHash: input.adventure_path_hash,
        adventureVersionHash: input.adventure_version_hash,
        saveRevision: 1,
        status: PrismaAdventureCheckpointStatus.Active,
        startedAt: now,
        updatedAt: now,
        completedAt: null,
      },
      where: this.toUniqueIdentity(input),
    });

    return this.toDomain(checkpoint);
  }

  async updateCheckpointStep(
    identity: CheckpointIdentity,
    currentStepId: string
  ) {
    const now = new Date();
    const checkpoint = await this.repository.update(
      this.toUniqueIdentity(identity),
      {
        currentStepId,
        saveRevision: {
          increment: 1,
        },
        status: PrismaAdventureCheckpointStatus.Active,
        updatedAt: now,
        completedAt: null,
      }
    );

    return this.toDomain(checkpoint);
  }

  async completeCheckpoint(identity: CheckpointIdentity) {
    const now = new Date();
    const checkpoint = await this.repository.update(
      this.toUniqueIdentity(identity),
      {
        saveRevision: {
          increment: 1,
        },
        status: PrismaAdventureCheckpointStatus.Completed,
        updatedAt: now,
        completedAt: now,
      }
    );

    return this.toDomain(checkpoint);
  }

  async deleteCheckpoint(identity: CheckpointIdentity) {
    await this.repository.delete(this.toUniqueIdentity(identity));
  }

  private toUniqueIdentity(
    identity: CheckpointIdentity
  ): Prisma.AdventureCheckpointWhereUniqueInput {
    return {
      walletPubkey_characterId_adventureId: {
        walletPubkey: identity.wallet_pubkey,
        characterId: identity.character_id,
        adventureId: identity.adventure_id,
      },
    };
  }

  protected toDomain(row: PrismaAdventureCheckpoint): AdventureCheckpoint {
    return {
      wallet_pubkey: row.walletPubkey,
      character_id: row.characterId,
      adventure_id: row.adventureId,
      current_step_id: row.currentStepId,
      adventure_seed_hash: row.adventureSeedHash,
      seed_salt_hash: row.seedSaltHash,
      adventure_path_hash: row.adventurePathHash,
      adventure_version_hash: row.adventureVersionHash,
      save_revision: row.saveRevision,
      status: row.status,
      started_at: row.startedAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
      completed_at: row.completedAt?.toISOString() ?? null,
    };
  }
}

export function getAdventureCheckpointRepository() {
  return new PrismaAdventureCheckpointRepository(getPrismaClient());
}

-- CreateTable
CREATE TABLE "adventure_checkpoints" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "wallet_pubkey" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "adventure_id" TEXT NOT NULL,
    "current_step_id" TEXT NOT NULL,
    "adventure_seed" TEXT NOT NULL,
    "seed_salt" TEXT NOT NULL,
    "adventure_seed_hash" TEXT NOT NULL,
    "seed_salt_hash" TEXT NOT NULL,
    "adventure_path_hash" TEXT NOT NULL,
    "adventure_version_hash" TEXT NOT NULL,
    "save_revision" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "completed_at" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "adventure_checkpoints_wallet_pubkey_character_id_adventure_id_key" ON "adventure_checkpoints"("wallet_pubkey", "character_id", "adventure_id");

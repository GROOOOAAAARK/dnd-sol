"use client";

import { Backpack, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	CombatRollOverlay,
	type RollStep,
} from "@/components/combat-roll-overlay";
import { HealthBar } from "@/components/health-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CombatRoundResult, CombatSession } from "@/models/solana_types";
import type {
	AdventureCheckpointIdentity,
	AdventureStep,
	CharacterClassValue,
	EncounterResponse,
} from "@/models/types";
import { useCombatService } from "@/services/combat.service";
import { useSolanaService } from "@/services/solana.service";
import { useCharacterStore } from "@/stores/selectedCharacter.store";

interface CombatCardProps {
	adventureId: string;
	identity: AdventureCheckpointIdentity;
	step: AdventureStep;
	/** Called once the fight is terminal; `true` on Victory. */
	onResolved: (success: boolean) => void;
}

type Phase = "loading" | "idle" | "rolling" | "overlay" | "terminal";

function damageDieForClass(characterClass?: CharacterClassValue): number {
	switch (characterClass) {
		case "barbarian":
		case "warrior":
			return 8;
		case "thief":
		case "monk":
			return 6;
		default:
			return 4;
	}
}

function buildSteps(
	result: CombatRoundResult,
	playerDie: number,
	monsterDie: number,
): RollStep[] {
	return [
		{
			label: "Your attack",
			die: 20,
			roll: result.player_hit,
			outcome: result.player_hit_success ? "hit" : "miss",
			crit: result.player_crit,
		},
		{
			label: "Your damage",
			die: playerDie,
			roll: result.player_damages,
		},
		{
			label: "Monster attack",
			die: 20,
			roll: result.monster_hit,
			outcome: result.monster_hit_success ? "hit" : "miss",
		},
		{
			label: "Monster damage",
			die: monsterDie,
			roll: result.monster_damages,
		},
	];
}

export function CombatCard({
	adventureId,
	identity,
	step,
	onResolved,
}: CombatCardProps) {
	const solana = useSolanaService();
	const combat = useCombatService();
	const character = useCharacterStore((state) => state.selectedCharacter);

	const [encounter, setEncounter] = useState<EncounterResponse | null>(null);
	const [session, setSession] = useState<CombatSession | null>(null);
	const [attackId, setAttackId] = useState("main-hand");
	const [phase, setPhase] = useState<Phase>("loading");
	const [steps, setSteps] = useState<RollStep[]>([]);
	const [pendingResult, setPendingResult] = useState<CombatRoundResult | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const [log, setLog] = useState<string[]>([]);
	const [reloadToken, setReloadToken] = useState(0);

	const reload = useCallback(() => {
		setEncounter(null);
		setSession(null);
		setReloadToken((token) => token + 1);
	}, []);

	const playerMaxHp = character?.stats.hit_points ?? 0;
	const playerDie = damageDieForClass(character?.character_class);
	const monsterDie =
		encounter?.monster.attacks[0]?.damages[0]?.dice_roll.die ?? 6;

	useEffect(() => {
		let active = true;

		const load = async () => {
			setPhase("loading");
			setError(null);
			try {
				const current = await combat.getCurrentEncounter(adventureId, identity);
				const existing = await solana.getCombatSession();

				// Only resume when the on-chain fight is still live and bound to
				// this encounter. Otherwise a terminal/stale session would replay
				// the old ticket and trip the on-chain nonce guard.
				const canResume =
					Boolean(current) &&
					Boolean(existing) &&
					existing?.status === "inProgress" &&
					existing?.encounterId === current?.encounter_id;

				let encounter = canResume ? current : null;

				if (!encounter) {
					// Allocate a fresh encounter so the ticket nonce advances past
					// the session's `last_nonce`.
					encounter = await combat.startEncounter(adventureId, identity);

					if (encounter) {
						await solana.startCombat(encounter.ticket, encounter.signature);
					}
				}

				if (!active) {
					return;
				}

				if (!encounter) {
					setError("No encounter could be created for this step.");
					setPhase("idle");
					return;
				}

				setEncounter(encounter);
				setAttackId(encounter.playerAttacks[0]?.id ?? "main-hand");

				const fresh = await solana.getCombatSession();

				if (active) {
					setSession(fresh);
					setPhase("idle");
				}
			} catch (loadError) {
				if (active) {
					setError(
						loadError instanceof Error
							? loadError.message
							: "Failed to start the fight",
					);
					setPhase("idle");
				}
			}
		};

		load();

		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [adventureId, identity.character_id, step.id, reloadToken]);

	const rollRound = useCallback(async () => {
		if (!session || !encounter) {
			return;
		}

		setPhase("rolling");
		setError(null);

		try {
			const signed = await combat.getRoundPayload(
				adventureId,
				identity,
				session.round,
				attackId,
			);

			await solana.combatCommit(signed.payload, signed.signature);
			const result = await solana.combatReveal(signed.payload);

			setSteps(buildSteps(result, playerDie, monsterDie));
			setLog((entries) => [
				`Round ${result.round}: you dealt ${result.player_damages}, took ${result.monster_damages}`,
				...entries,
			]);
			setSession((previous) =>
				previous
					? {
							...previous,
							monsterHp: result.monster_hp,
							characterHp: result.character_hp,
							round: result.round + (result.status === "inProgress" ? 1 : 0),
							status: result.status,
						}
					: previous,
			);
			setPendingResult(result);
			setPhase("overlay");
		} catch (rollError) {
			setError(rollError instanceof Error ? rollError.message : "Round failed");
			// The reveal may have landed even if the result could not be read
			// (RPC return-data lag). Resync so the next attempt uses the
			// on-chain round instead of replaying a stale payload.
			try {
				const fresh = await solana.getCombatSession();
				if (fresh) {
					setSession(fresh);
				}
			} catch {
				// Keep the last known session if the resync fails.
			}
			setPhase("idle");
		}
	}, [
		adventureId,
		attackId,
		combat,
		encounter,
		identity,
		monsterDie,
		playerDie,
		session,
		solana,
	]);

	const finishRound = useCallback(() => {
		const result = pendingResult;
		setPendingResult(null);
		setSteps([]);

		if (!result) {
			setPhase("idle");
			return;
		}

		if (result.status === "inProgress") {
			setPhase("idle");
			return;
		}

		setPhase("terminal");
		onResolved(result.status === "victory");
	}, [onResolved, pendingResult]);

	if (phase === "loading") {
		return (
			<Card>
				<CardContent className="flex items-center justify-center gap-2 p-8">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Preparing the encounter…</span>
				</CardContent>
			</Card>
		);
	}

	if (!encounter) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center gap-4 p-8 text-center">
					<p className="text-sm text-destructive">
						{error ?? "Unable to start the encounter."}
					</p>
					<Button onClick={reload} type="button" variant="outline">
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	const monsterMaxHp = encounter.monster.hit_points;
	const isTerminal = phase === "terminal" || session?.status !== "inProgress";

	return (
		<Card>
			<CardContent className="space-y-6 p-6">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold">{encounter.monster.name}</h2>
					<span className="text-sm text-muted-foreground">
						AC {encounter.monster.ac} · Round {session?.round ?? 1}
					</span>
				</div>

				<div className="space-y-3">
					<HealthBar
						label="You"
						current={session?.characterHp ?? 0}
						max={playerMaxHp}
					/>
					<HealthBar
						label={encounter.monster.name}
						current={session?.monsterHp ?? 0}
						max={monsterMaxHp}
					/>
				</div>

				{error ? <p className="text-sm text-destructive">{error}</p> : null}

				{phase === "terminal" ? (
					<p className="text-lg font-semibold">
						{session?.status === "victory"
							? "Victory!"
							: session?.status === "draw"
								? "Draw"
								: "Defeat"}
					</p>
				) : (
					<div className="space-y-4">
						<div className="space-y-2">
							<div className="text-sm font-medium">Choose your attack</div>
							<div className="flex flex-wrap gap-2">
								{encounter.playerAttacks.map((attack) => (
									<Button
										key={attack.id}
										onClick={() => setAttackId(attack.id)}
										type="button"
										variant={attackId === attack.id ? "default" : "outline"}
									>
										{attack.label}
									</Button>
								))}
								<Button disabled type="button" variant="outline">
									<Backpack className="mr-2 h-4 w-4" />
									Use item
								</Button>
							</div>
						</div>

						<Button
							disabled={phase === "rolling" || isTerminal}
							onClick={rollRound}
							type="button"
						>
							{phase === "rolling" ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Attack
						</Button>
					</div>
				)}

				{log.length > 0 ? (
					<div className="space-y-1 text-sm text-muted-foreground">
						{log.map((entry, index) => (
							<div key={index}>{entry}</div>
						))}
					</div>
				) : null}
			</CardContent>

			{phase === "overlay" ? (
				<CombatRollOverlay onDone={finishRound} steps={steps} />
			) : null}
		</Card>
	);
}

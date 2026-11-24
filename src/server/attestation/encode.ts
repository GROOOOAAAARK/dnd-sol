import bs58 from "bs58";

import {
	type AttackProfile,
	type EncounterTicketInput,
	MAX_DAMAGE_GROUPS,
	MAX_DICE_PER_GROUP,
	MONSTER_ID_LEN,
	type RoundPayloadInput,
	TICKET_VERSION,
} from "@/server/attestation/types";

const textEncoder = new TextEncoder();

/**
 * Minimal little-endian borsh writer. Hand-rolled on purpose: the bytes must be
 * identical to Anchor's `AnchorSerialize`, and this is the fastest way to see
 * that they are.
 */
class ByteWriter {
	private readonly bytes: number[] = [];

	u8(value: number) {
		this.bytes.push(value & 0xff);
	}

	i8(value: number) {
		this.u8(value);
	}

	u16(value: number) {
		this.bytes.push(value & 0xff, (value >>> 8) & 0xff);
	}

	i16(value: number) {
		this.u16(value & 0xffff);
	}

	u32(value: number) {
		this.bytes.push(
			value & 0xff,
			(value >>> 8) & 0xff,
			(value >>> 16) & 0xff,
			(value >>> 24) & 0xff,
		);
	}

	u64(value: bigint) {
		for (let shift = BigInt(0); shift < BigInt(64); shift += BigInt(8)) {
			this.bytes.push(Number((value >> shift) & BigInt(0xff)));
		}
	}

	i64(value: bigint) {
		this.u64(value < BigInt(0) ? value + (BigInt(1) << BigInt(64)) : value);
	}

	raw(bytes: Uint8Array) {
		for (const byte of bytes) {
			this.bytes.push(byte);
		}
	}

	toBytes(): Uint8Array {
		return Uint8Array.from(this.bytes);
	}
}

function pubkeyBytes(character: Uint8Array | string): Uint8Array {
	const bytes =
		typeof character === "string" ? bs58.decode(character) : character;

	if (bytes.length !== 32) {
		throw new Error(`character pubkey must be 32 bytes, got ${bytes.length}`);
	}

	return bytes;
}

export function monsterIdToBytes(monsterId: string): Uint8Array {
	const encoded = textEncoder.encode(monsterId);

	if (encoded.length === 0 || encoded.length > MONSTER_ID_LEN) {
		throw new Error(
			`monster id must be 1..${MONSTER_ID_LEN} bytes, got ${encoded.length}`,
		);
	}

	const padded = new Uint8Array(MONSTER_ID_LEN);
	padded.set(encoded);
	return padded;
}

function assertAttack(attack: AttackProfile) {
	if (attack.damages.length > MAX_DAMAGE_GROUPS) {
		throw new Error(`too many damage groups: ${attack.damages.length}`);
	}

	for (const damage of attack.damages) {
		if (
			damage.die < 2 ||
			damage.die > 0xff ||
			damage.num_die > MAX_DICE_PER_GROUP
		) {
			throw new Error(
				`invalid damage group die=${damage.die} num_die=${damage.num_die}`,
			);
		}
	}
}

/** Rust `Attack`: `to_hit: Option<i8>` then `damages: Vec<DamageRoll>`. */
function writeAttack(writer: ByteWriter, attack: AttackProfile) {
	assertAttack(attack);

	if (attack.to_hit === undefined) {
		writer.u8(0);
	} else {
		writer.u8(1);
		writer.i8(attack.to_hit);
	}

	writer.u32(attack.damages.length);

	for (const damage of attack.damages) {
		writer.u8(damage.die);
		writer.u8(damage.num_die);
		writer.i16(damage.damage_bonus);
	}
}

/** Canonical borsh bytes for an `EncounterTicket`. */
export function encodeEncounterTicket(
	ticket: EncounterTicketInput,
): Uint8Array {
	const writer = new ByteWriter();
	writer.u8(TICKET_VERSION);
	writer.raw(pubkeyBytes(ticket.character));
	writer.u64(ticket.encounterId);
	writer.raw(monsterIdToBytes(ticket.monsterId));
	writer.u8(ticket.ac);
	writer.u16(ticket.hitPoints);
	writer.u64(ticket.nonce);
	writer.i64(ticket.expiry);
	return writer.toBytes();
}

/** Canonical borsh bytes for a `RoundPayload`. */
export function encodeRoundPayload(payload: RoundPayloadInput): Uint8Array {
	const writer = new ByteWriter();
	writer.u8(TICKET_VERSION);
	writer.raw(pubkeyBytes(payload.character));
	writer.u64(payload.encounterId);
	writer.u8(payload.round);
	writeAttack(writer, payload.player);
	writeAttack(writer, payload.monster);
	writer.i64(payload.expiry);
	return writer.toBytes();
}

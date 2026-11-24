import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";

/** Message the program recovers against: `keccak256(ticket_bytes)`. */
export function ticketDigest(ticketBytes: Uint8Array): Uint8Array {
	return keccak_256(ticketBytes);
}

/**
 * 64-byte compact ECDSA signature (r || s) over `keccak256(ticketBytes)`.
 * The recovery id is not transmitted: the program tries 0..=3 and compares the
 * recovered pubkey against `config.attester`.
 */
export function signTicket(
	ticketBytes: Uint8Array,
	secretKey: Uint8Array,
): Uint8Array {
	const signature = secp256k1.sign(ticketDigest(ticketBytes), secretKey);
	return signature.toCompactRawBytes();
}

/** 64-byte uncompressed pubkey (x || y), matching the on-chain `[u8; 64]`. */
export function attesterPublicKey(secretKey: Uint8Array): Uint8Array {
	// 65 bytes = 0x04 prefix + x + y; the program stores only x || y.
	return secp256k1.getPublicKey(secretKey, false).slice(1);
}

function hexToBytes(hex: string): Uint8Array {
	const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;

	if (normalized.length !== 64) {
		throw new Error(
			`ATTESTER_SECRET_KEY must be 32 bytes of hex, got ${normalized.length / 2}`,
		);
	}

	return Uint8Array.from(
		normalized.match(/.{2}/g)!.map((pair) => parseInt(pair, 16)),
	);
}

/** Server-only attester secret. Never expose to the client. */
export function getAttesterSecretKey(): Uint8Array {
	const raw = process.env.ATTESTER_SECRET_KEY;

	if (!raw) {
		throw new Error("ATTESTER_SECRET_KEY is not set");
	}

	return hexToBytes(raw);
}

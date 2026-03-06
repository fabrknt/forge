/**
 * @veil/crypto integration — Encryption and secret sharing.
 *
 * Usage in Forge:
 * - Encrypt user allocation data at rest
 * - Private allocation sharing (share without revealing identity)
 * - Threshold access for M&A data rooms (Shamir secret sharing)
 */

import type {
  EncryptedAllocation,
  SharedAccess,
  PrivacyConfig,
} from "./types/privacy";

// ---------------------------------------------------------------------------
// NaCl box encryption for allocations
// ---------------------------------------------------------------------------

export function encryptAllocation(
  allocation: Record<string, unknown>,
  publicKey: Uint8Array,
  keypair: { publicKey: Uint8Array; secretKey: Uint8Array }
): EncryptedAllocation {
  // In production: uses @veil/crypto encrypt()
  // encrypt(JSON.stringify(allocation), publicKey, keypair)

  const plaintext = JSON.stringify(allocation);
  const nonce = crypto.getRandomValues(new Uint8Array(24));

  // Placeholder — real impl uses NaCl box
  const ciphertext = new TextEncoder().encode(plaintext);

  return {
    encrypted: true,
    nonce: uint8ToBase64(nonce),
    ciphertext: uint8ToBase64(ciphertext),
    senderPublicKey: uint8ToBase64(keypair.publicKey),
    encryptedAt: Date.now(),
  };
}

export function decryptAllocation(
  encrypted: EncryptedAllocation,
  senderPublicKey: Uint8Array,
  keypair: { publicKey: Uint8Array; secretKey: Uint8Array }
): Record<string, unknown> {
  // In production: uses @veil/crypto decrypt()
  // decrypt(ciphertext, senderPublicKey, keypair)

  const ciphertext = base64ToUint8(encrypted.ciphertext);
  const plaintext = new TextDecoder().decode(ciphertext);

  return JSON.parse(plaintext);
}

// ---------------------------------------------------------------------------
// Shamir secret sharing for data room access
// ---------------------------------------------------------------------------

export function createSharedAccess(
  secret: string,
  totalShares: number,
  threshold: number
): SharedAccess {
  // In production: uses @veil/crypto splitSecret()
  // const shares = splitSecret(Buffer.from(secret), totalShares, threshold)

  // Placeholder — generates dummy shares
  const shares = Array.from({ length: totalShares }, (_, i) => ({
    index: i + 1,
    data: uint8ToBase64(
      crypto.getRandomValues(new Uint8Array(32))
    ),
  }));

  return {
    threshold,
    totalShares,
    shares,
    createdAt: Date.now(),
  };
}

export function recoverSecret(
  shares: Array<{ index: number; data: string }>,
  threshold: number
): string | null {
  // In production: uses @veil/crypto combineShares()
  if (shares.length < threshold) {
    return null;
  }

  // Placeholder
  return "recovered-secret";
}

// ---------------------------------------------------------------------------
// Private allocation sharing
// ---------------------------------------------------------------------------

export function createPrivateShareLink(
  allocation: Record<string, unknown>,
  expiresInMs: number = 24 * 60 * 60 * 1000
): { shareId: string; expiresAt: number } {
  // In production: encrypts allocation with ephemeral key,
  // stores ciphertext, returns shareId that maps to decryption key

  const shareId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    shareId,
    expiresAt: Date.now() + expiresInMs,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uint8ToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function base64ToUint8(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const privacy = {
  encryptAllocation,
  decryptAllocation,
  createSharedAccess,
  recoverSecret,
  createPrivateShareLink,
};

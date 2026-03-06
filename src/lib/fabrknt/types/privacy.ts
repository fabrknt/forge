export interface EncryptedAllocation {
  encrypted: true;
  nonce: string;
  ciphertext: string;
  senderPublicKey: string;
  encryptedAt: number;
}

export interface SharedAccess {
  threshold: number;
  totalShares: number;
  shares: Array<{ index: number; data: string }>;
  createdAt: number;
}

export interface PrivacyConfig {
  encryptAtRest: boolean;
  enablePrivateSharing: boolean;
  dataRoomThreshold: number;
  dataRoomShares: number;
}

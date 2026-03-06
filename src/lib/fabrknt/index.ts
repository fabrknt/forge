/**
 * Fabrknt SDK Integration Layer
 *
 * Dogfooding all 5 Fabrknt products within Forge.
 * Each module wraps the corresponding SDK with Forge-specific defaults.
 *
 * Products:
 * - sentinel: Transaction guard, execution patterns (DCA, rebalance), Jito bundles
 * - complr:   Off-chain compliance screening for pools and wallets
 * - accredit: On-chain KYC/AML verification and whitelist checks
 * - veil:     Encryption for user allocations and data room access
 * - stratum:  Merkle proofs for allocation history, bitfield for pool tracking
 */

export { sentinel } from "./sentinel";
export { compliance } from "./compliance";
export { identity } from "./identity";
export { privacy } from "./privacy";
export { data } from "./data";

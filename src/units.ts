/**
 * Units.
 *
 * A `uint256` on its own is not a quantity. It becomes one only when paired with
 * the decimals the contract actually declares. These types make that pairing
 * structural, so a value can never be added to a value of another unit without
 * the compiler objecting.
 */

/** The chain's native currency, in its smallest indivisible unit. */
export type Wei = bigint & { readonly __unit: 'wei' };

/** The chain's native currency, scaled to 18 decimals for display. Never used for arithmetic. */
export type Eth = bigint & { readonly __unit: 'eth' };

/** An ERC-20 amount in the token's own smallest unit. */
export type TokenAmount = bigint & { readonly __unit: 'token' };

export type UnitKind = 'wei' | 'eth' | 'token';

export interface NativeUnit {
  readonly kind: 'wei' | 'eth';
  readonly symbol: string;
  readonly decimals: number;
}

export interface TokenUnit {
  readonly kind: 'token';
  readonly symbol: string;
  readonly decimals: number;
  /** The contract the decimals were read from. Never assumed, always sourced. */
  readonly contract: string;
}

export type Unit = NativeUnit | TokenUnit;

export const WEI: NativeUnit = { kind: 'wei', symbol: 'WEI', decimals: 0 };
export const ETH: NativeUnit = { kind: 'eth', symbol: 'ETH', decimals: 18 };

/**
 * Build a token unit from decimals read off the contract.
 *
 * Assuming 18 decimals is the single most common misread on an EVM chain: USDC
 * carries 6, so the assumption is wrong by a factor of 10^12. Pass the value
 * `decimals()` returned; do not pass a guess.
 */
export function token(params: { symbol: string; decimals: number; contract: string }): TokenUnit {
  if (!Number.isInteger(params.decimals) || params.decimals < 0 || params.decimals > 77) {
    throw new TypeError(`decimals must be an integer in [0, 77], received ${String(params.decimals)}`);
  }
  return { kind: 'token', symbol: params.symbol, decimals: params.decimals, contract: params.contract };
}

/** True when two units are the same unit, contract included. */
export function sameUnit(a: Unit, b: Unit): boolean {
  if (a.kind !== b.kind || a.decimals !== b.decimals || a.symbol !== b.symbol) return false;
  if (a.kind === 'token' && b.kind === 'token') return a.contract === b.contract;
  return true;
}

/**
 * Throw unless two units match. Call this before any arithmetic that combines
 * two readings; the runtime check backs up what the types already prevent.
 */
export function assertSameUnit(a: Unit, b: Unit): void {
  if (!sameUnit(a, b)) {
    throw new TypeError(`unit mismatch: ${describeUnit(a)} cannot be combined with ${describeUnit(b)}`);
  }
}

export function describeUnit(u: Unit): string {
  return u.kind === 'token' ? `${u.symbol}(dec ${u.decimals} @ ${u.contract})` : `${u.symbol}(dec ${u.decimals})`;
}

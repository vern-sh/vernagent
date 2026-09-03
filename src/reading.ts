/**
 * Readings.
 *
 * A reading is a number plus the four facts that make it mean something: the
 * unit it is denominated in, the block it was taken at, the finality of that
 * block, and the call it came from.
 */

import { type Unit, assertSameUnit, describeUnit } from './units.ts';

/** How settled the block behind a reading is. */
export type Finality = 'pending' | 'latest' | 'safe' | 'finalized';

export interface ReadingAt {
  readonly block: bigint;
  readonly finality: Finality;
  /** Unix seconds, when the node reported one. */
  readonly timestamp?: number;
}

export interface ReadingSource {
  readonly standard: string;
  readonly method: string;
  readonly address?: string;
}

/** A quantity that carries its own proof. */
export interface Reading {
  readonly value: bigint;
  readonly unit: Unit;
  readonly at: ReadingAt;
  readonly source: ReadingSource;
  readonly warnings: readonly string[];
}

const GROUP = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Scale a raw integer to its decimal string. Exact, string based; no float ever
 * touches a balance.
 */
export function toDecimalString(value: bigint, decimals: number): string {
  if (typeof value !== 'bigint') throw new TypeError('value must be a bigint');
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new TypeError('decimals must be a non-negative integer');
  }
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  if (decimals === 0) return (negative ? '-' : '') + digits;
  const padded = digits.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals);
  const fraction = padded.slice(padded.length - decimals);
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

/** Group the integer part with commas. Full precision is preserved. */
export function group(decimalString: string): string {
  const negative = decimalString.startsWith('-');
  const body = negative ? decimalString.slice(1) : decimalString;
  const [whole = '0', fraction] = body.split('.');
  const grouped = whole.replace(GROUP, ',');
  return `${negative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction}`}`;
}

/** The reading, scaled and grouped, with no unit attached. */
export function ui(reading: Reading): string {
  return group(toDecimalString(reading.value, reading.unit.decimals));
}

/**
 * The reading with its proof, ready to print or hand to a model:
 * `18,204.000000 USDC · dec 6 · block 3,214,876 · finalized`
 */
export function format(reading: Reading): string {
  const parts = [
    `${ui(reading)} ${reading.unit.symbol}`,
    `dec ${reading.unit.decimals}`,
    `block ${group(reading.at.block.toString())}`,
    reading.at.finality,
  ];
  if (reading.warnings.length > 0) parts.push(`warnings: ${reading.warnings.join(', ')}`);
  return parts.join(' · ');
}

/** Add two readings. Throws unless the units and the block match exactly. */
export function add(a: Reading, b: Reading): Reading {
  assertSameUnit(a.unit, b.unit);
  if (a.at.block !== b.at.block) {
    throw new TypeError(
      `block mismatch: ${a.at.block} and ${b.at.block}. Combining readings from different blocks produces a number that was never true at either.`,
    );
  }
  return {
    value: a.value + b.value,
    unit: a.unit,
    at: a.at,
    source: { standard: 'vern', method: 'add' },
    warnings: [...new Set([...a.warnings, ...b.warnings])],
  };
}

/** True when a reading is settled enough to act on. */
export function isSettled(reading: Reading): boolean {
  return reading.at.finality === 'finalized' || reading.at.finality === 'safe';
}

/**
 * Throw unless the reading is settled. Use before anything irreversible; a
 * `pending` or `latest` value can still be replaced by a reorg.
 */
export function assertSettled(reading: Reading): void {
  if (!isSettled(reading)) {
    throw new Error(
      `reading at block ${reading.at.block} is ${reading.at.finality}, not settled. ` +
        `Value ${format(reading)} may not survive a reorg.`,
    );
  }
}

export { describeUnit };

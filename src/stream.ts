/**
 * The reading stream.
 *
 * An RPC read at `latest` is a claim, not a fact. The same account, read at the
 * block that just arrived, can return a value the finalized state later replaces.
 * Nothing throws; the number simply turns out to have been wrong.
 *
 * The lattice keeps the last N reads and, as each block settles, marks which of
 * them held and which drifted. It never edits a past reading — it records what
 * the chain said at the time and what it turned out to mean.
 */

import type { Reading, ReadingAt } from './reading.ts';
import { format, group, toDecimalString } from './reading.ts';
import { assertSameUnit } from './units.ts';
import type { VernClient } from './client.ts';
import type { Finality } from './reading.ts';

/**
 * What a block's read turned out to be worth, once the chain settled.
 *
 * - `unsettled`: read at `latest`/`pending`; not yet reconciled against a
 *   finalized value. Its truth is still open.
 * - `agrees`: the unsettled value matched the finalized one. It held.
 * - `disagrees`: the finalized state replaced the value this read reported. It
 *   lied, without throwing.
 * - `finalized`: read directly at a settled block. True when taken, true now.
 */
export type CellState = 'unsettled' | 'agrees' | 'disagrees' | 'finalized';

/** One block's place in the lattice: the value observed and what it came to. */
export interface LatticeCell {
  readonly block: bigint;
  /** The reading as it was observed when this block was head. Never rewritten. */
  readonly reading: Reading;
  readonly state: CellState;
  /**
   * `observed - finalized`, in the unit's smallest indivisible unit. Zero until
   * reconciled, and zero for a cell that agreed. Positive means the head read
   * over-reported; negative, under.
   */
  readonly drift: bigint;
}

/** A drift, expressed as a reading so it prints with its own unit and decimals. */
export interface DriftReading {
  readonly cell: LatticeCell;
  readonly amount: bigint;
  /** `12.500000 USDC` — the magnitude, scaled and unit-tagged. */
  readonly ui: string;
}

/**
 * A bounded window over the most recent reads of one account, each classified as
 * it settles. Pure: feed it readings and finalized values, ask it what drifted.
 * No provider, no clock, no I/O.
 */
export class ReadingLattice {
  readonly #size: number;
  readonly #cells: LatticeCell[] = [];

  /** @param size how many recent blocks to keep. The web bench shows 25. */
  constructor(size = 25) {
    if (!Number.isInteger(size) || size < 1) {
      throw new TypeError(`lattice size must be a positive integer, received ${String(size)}`);
    }
    this.#size = size;
  }

  /** The cells, oldest first. A copy; the lattice owns its own history. */
  cells(): readonly LatticeCell[] {
    return [...this.#cells];
  }

  /** The most recent cell, or undefined before any read has landed. */
  head(): LatticeCell | undefined {
    return this.#cells[this.#cells.length - 1];
  }

  /**
   * Record a reading at the head of the lattice. A reading already at a settled
   * block lands `finalized`; anything at `latest`/`pending` lands `unsettled`,
   * awaiting a finalized value for its block to judge it.
   */
  ingest(reading: Reading): LatticeCell {
    const settled = reading.at.finality === 'finalized' || reading.at.finality === 'safe';
    const cell: LatticeCell = {
      block: reading.at.block,
      reading,
      state: settled ? 'finalized' : 'unsettled',
      drift: 0n,
    };
    this.#cells.push(cell);
    while (this.#cells.length > this.#size) this.#cells.shift();
    return cell;
  }

  /**
   * Settle every unsettled cell at or before `finalized`'s block against the
   * finalized value. A cell whose observed value matches `agrees`; one that
   * differs `disagrees`, with the gap recorded as drift. Returns the cells this
   * call moved, so a caller can react only to what changed.
   */
  reconcile(finalized: Reading): readonly LatticeCell[] {
    if (finalized.at.finality !== 'finalized' && finalized.at.finality !== 'safe') {
      throw new TypeError(
        `reconcile expects a settled reading; got ${finalized.at.finality}. ` +
          `Judging one unsettled value against another settles nothing.`,
      );
    }
    const moved: LatticeCell[] = [];
    for (let i = 0; i < this.#cells.length; i++) {
      const cell = this.#cells[i]!;
      if (cell.state !== 'unsettled' || cell.block > finalized.at.block) continue;
      assertSameUnit(cell.reading.unit, finalized.unit);
      const drift = cell.reading.value - finalized.value;
      const next: LatticeCell = {
        ...cell,
        state: drift === 0n ? 'agrees' : 'disagrees',
        drift,
      };
      this.#cells[i] = next;
      moved.push(next);
    }
    return moved;
  }

  /** The cells whose head read did not survive to finality. */
  disagreements(): readonly LatticeCell[] {
    return this.#cells.filter((c) => c.state === 'disagrees');
  }

  /**
   * The largest drift in the window, as a reading. Undefined when nothing has
   * disagreed yet. This is the number the web bench prints as MAX DRIFT.
   */
  maxDrift(): DriftReading | undefined {
    let worst: LatticeCell | undefined;
    let worstMag = -1n;
    for (const cell of this.#cells) {
      const mag = cell.drift < 0n ? -cell.drift : cell.drift;
      if (mag > worstMag) {
        worstMag = mag;
        worst = cell;
      }
    }
    if (!worst || worstMag <= 0n) return undefined;
    return {
      cell: worst,
      amount: worst.drift,
      ui: `${group(toDecimalString(worst.drift, worst.reading.unit.decimals))} ${worst.reading.unit.symbol}`,
    };
  }
}

/** An event the stream emits as blocks arrive and settle. */
export type StreamEvent =
  | { readonly kind: 'read'; readonly cell: LatticeCell; readonly at: ReadingAt }
  | { readonly kind: 'settled'; readonly cells: readonly LatticeCell[] }
  | { readonly kind: 'drift'; readonly drift: DriftReading };

export interface StreamOptions {
  /** How many blocks the lattice keeps. Defaults to 25. */
  readonly latticeSize?: number;
  /** Milliseconds between head polls. Defaults to 1000. */
  readonly intervalMs?: number;
  /** How many blocks back the settled reconciliation read is taken. Defaults to `finalized`. */
  readonly settleFinality?: Finality;
  /** Stop after this many reads. Omit to stream until the caller breaks. */
  readonly limit?: number;
  /** An abort signal to end the stream from outside. */
  readonly signal?: AbortSignal;
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error('aborted'));
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

/**
 * Stream an ERC-20 account, one read per block, and watch which blocks lie.
 *
 * The web bench streams `wss://stream.vern.sh/v1/account`. This drives the same
 * shape over an ordinary provider: it reads the account at `latest` as each new
 * block arrives, then reconciles those reads against the finalized value. Every
 * yielded event carries a full reading, never a bare number.
 *
 * ```ts
 * for await (const ev of streamAccount(client, USDC, wallet, { limit: 25 })) {
 *   if (ev.kind === 'drift') console.warn('drift:', ev.drift.ui);
 * }
 * ```
 */
export async function* streamAccount(
  client: VernClient,
  contract: string,
  owner: string,
  options: StreamOptions = {},
): AsyncGenerator<StreamEvent, void, void> {
  const lattice = new ReadingLattice(options.latticeSize ?? 25);
  const intervalMs = options.intervalMs ?? 1000;
  const settleFinality = options.settleFinality ?? 'finalized';
  const { limit, signal } = options;

  let lastHead: bigint | undefined;
  let count = 0;

  while (limit === undefined || count < limit) {
    if (signal?.aborted) return;

    const head = await client.balanceOf(contract, owner, 'latest');
    if (head.at.block !== lastHead) {
      lastHead = head.at.block;
      count++;
      const cell = lattice.ingest(head);
      yield { kind: 'read', cell, at: head.at };

      const settled = await client.balanceOf(contract, owner, settleFinality);
      const moved = lattice.reconcile(settled);
      if (moved.length > 0) {
        yield { kind: 'settled', cells: moved };
        const drift = lattice.maxDrift();
        for (const c of moved) {
          if (c.state === 'disagrees' && drift && drift.cell.block === c.block) {
            yield { kind: 'drift', drift };
          }
        }
      }
    }

    if (limit !== undefined && count >= limit) return;
    await sleep(intervalMs, signal);
  }
}

/**
 * The lattice as a single line, newest block last, for a log or a console:
 * `4871✗ 4872✗ 4873✗ 4874· 4875· 4876·`  (`✗` disagreed, `·` held/settled)
 */
export function describeLattice(lattice: ReadingLattice): string {
  const mark: Record<CellState, string> = {
    unsettled: '?',
    agrees: '·',
    disagrees: '✗',
    finalized: '·',
  };
  const cells = lattice
    .cells()
    .map((c) => `${c.block.toString().slice(-4)}${mark[c.state]}`)
    .join(' ');
  const drift = lattice.maxDrift();
  return drift ? `${cells}   max drift ${drift.ui}` : cells;
}

export { format };

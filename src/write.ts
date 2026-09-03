/**
 * The write path.
 *
 * intent -> build -> simulate -> sign. vern stops at simulate. It builds the
 * transaction and reports what it would do to balances; the agent holds the key
 * and decides. vern never signs, never holds a key, never takes custody.
 */

import type { Reading } from './reading.ts';
import { format, toDecimalString } from './reading.ts';
import type { Unit } from './units.ts';
import { GuardError } from './errors.ts';

export interface Intent {
  readonly action: string;
  readonly summary: string;
}

export interface BuiltTransaction {
  readonly to: string;
  readonly data: string;
  readonly value: bigint;
  readonly from: string;
  readonly chainId: number;
}

/** One account's movement, in the account's own unit. */
export interface BalanceDelta {
  readonly account: string;
  readonly unit: Unit;
  readonly before: bigint;
  readonly after: bigint;
}

export function deltaValue(d: BalanceDelta): bigint {
  return d.after - d.before;
}

export function formatDelta(d: BalanceDelta): string {
  const raw = deltaValue(d);
  const sign = raw > 0n ? '+' : '';
  return `${sign}${toDecimalString(raw, d.unit.decimals)} ${d.unit.symbol}`;
}

export interface GasEstimate {
  readonly gas: bigint;
  readonly maxFeePerGas: bigint;
}

/** What the transaction would do, before anyone signs anything. */
export interface Simulation {
  readonly intent: Intent;
  readonly transaction: BuiltTransaction;
  readonly deltas: readonly BalanceDelta[];
  readonly gas: GasEstimate;
  readonly at: Reading['at'];
  readonly warnings: readonly string[];
}

export interface Guard {
  /** Reject the simulation unless this account gains at least this much. */
  readonly minReceived?: { account: string; amount: bigint };
  /** Reject the simulation if this account loses more than this. */
  readonly maxSpent?: { account: string; amount: bigint };
  /** Reject when the simulated block is not settled. */
  readonly requireSettled?: boolean;
}

/**
 * Check a simulation against the caller's bounds. Throws with the numbers that
 * failed, not a generic rejection.
 */
export function assertWithinGuard(sim: Simulation, guard: Guard): void {
  if (guard.requireSettled && sim.at.finality !== 'finalized' && sim.at.finality !== 'safe') {
    throw new GuardError(`simulated against a ${sim.at.finality} block; the result may not hold`);
  }

  if (guard.minReceived) {
    const d = sim.deltas.find((x) => x.account.toLowerCase() === guard.minReceived!.account.toLowerCase());
    const got = d ? deltaValue(d) : 0n;
    if (got < guard.minReceived.amount) {
      throw new GuardError(
        `minReceived not met: expected at least ${guard.minReceived.amount}, simulation gives ${got}`,
      );
    }
  }

  if (guard.maxSpent) {
    const d = sim.deltas.find((x) => x.account.toLowerCase() === guard.maxSpent!.account.toLowerCase());
    const spent = d ? -deltaValue(d) : 0n;
    if (spent > guard.maxSpent.amount) {
      throw new GuardError(`maxSpent exceeded: cap ${guard.maxSpent.amount}, simulation spends ${spent}`);
    }
  }
}

/** The simulation as a few lines an agent, or a person, can read before signing. */
export function describeSimulation(sim: Simulation): string {
  const lines = [
    `${sim.intent.action}: ${sim.intent.summary}`,
    ...sim.deltas.map((d) => `  ${formatDelta(d)}  (${d.account})`),
    `  gas ${sim.gas.gas} @ ${sim.gas.maxFeePerGas} wei`,
    `  simulated at block ${sim.at.block} (${sim.at.finality})`,
  ];
  for (const w of sim.warnings) lines.push(`  ! ${w}`);
  lines.push('  vern does not sign. Your agent holds the key.');
  return lines.join('\n');
}

export { format };

import test from 'node:test';
import assert from 'node:assert/strict';
import { token, WEI } from '../src/units.ts';
import { type Simulation, assertWithinGuard, describeSimulation, formatDelta, deltaValue } from '../src/write.ts';
import { GuardError } from '../src/errors.ts';

const USDC = token({ symbol: 'USDC', decimals: 6, contract: '0xa0b8' });
const AAPLX = token({ symbol: 'AAPLx', decimals: 6, contract: '0xaapl' });
const WALLET = '0x1111111111111111111111111111111111111111';

const sim: Simulation = {
  intent: { action: 'buy', summary: '500 USDC of AAPLx' },
  transaction: { to: '0xrouter', data: '0x', value: 0n, from: WALLET, chainId: 1 },
  deltas: [
    { account: WALLET, unit: USDC, before: 1000000000n, after: 500000000n },
    { account: WALLET, unit: AAPLX, before: 0n, after: 2084310n },
  ],
  gas: { gas: 21000n, maxFeePerGas: 34000000000n },
  at: { block: 3214876n, finality: 'finalized' },
  warnings: [],
};

test('a delta prints with its sign and its unit', () => {
  assert.equal(formatDelta(sim.deltas[0]!), '-500.000000 USDC');
  assert.equal(formatDelta(sim.deltas[1]!), '+2.084310 AAPLx');
  assert.equal(deltaValue(sim.deltas[0]!), -500000000n);
});

test('a simulation within bounds passes', () => {
  assert.doesNotThrow(() =>
    assertWithinGuard(sim, { maxSpent: { account: WALLET, amount: 500000000n }, requireSettled: true }),
  );
});

test('maxSpent rejects and names both numbers', () => {
  assert.throws(
    () => assertWithinGuard(sim, { maxSpent: { account: WALLET, amount: 400000000n } }),
    (e: unknown) => e instanceof GuardError && /cap 400000000, simulation spends 500000000/.test((e as Error).message),
  );
});

test('minReceived rejects when the simulation gives too little', () => {
  const thin: Simulation = { ...sim, deltas: [{ account: WALLET, unit: AAPLX, before: 0n, after: 1n }] };
  assert.throws(() => assertWithinGuard(thin, { minReceived: { account: WALLET, amount: 2000000n } }), GuardError);
});

test('requireSettled rejects a simulation run against an unsettled block', () => {
  const pending: Simulation = { ...sim, at: { block: 3214876n, finality: 'latest' } };
  assert.throws(() => assertWithinGuard(pending, { requireSettled: true }), /may not hold/);
});

test('the description states the boundary out loud', () => {
  const text = describeSimulation(sim);
  assert.match(text, /-500\.000000 USDC/);
  assert.match(text, /\+2\.084310 AAPLx/);
  assert.match(text, /vern does not sign/);
});

test('an unknown account counts as no movement, never as a pass by omission', () => {
  assert.throws(
    () => assertWithinGuard(sim, { minReceived: { account: '0x9999999999999999999999999999999999999999', amount: 1n } }),
    GuardError,
  );
});

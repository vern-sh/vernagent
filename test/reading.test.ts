import test from 'node:test';
import assert from 'node:assert/strict';
import { token } from '../src/units.ts';
import { type Reading, toDecimalString, group, ui, format, add, isSettled, assertSettled } from '../src/reading.ts';

const USDC = token({ symbol: 'USDC', decimals: 6, contract: '0xa0b8' });

const reading = (value: bigint, over: Partial<Reading> = {}): Reading => ({
  value,
  unit: USDC,
  at: { block: 3214876n, finality: 'finalized' },
  source: { standard: 'erc-20', method: 'balanceOf' },
  warnings: [],
  ...over,
});

test('toDecimalString scales exactly, with no float in the path', () => {
  assert.equal(toDecimalString(18204000000n, 6), '18204.000000');
  assert.equal(toDecimalString(1n, 18), '0.000000000000000001');
  assert.equal(toDecimalString(0n, 6), '0.000000');
  assert.equal(toDecimalString(-2500000n, 6), '-2.500000');
  // 2^256-1 must survive; this is where Number would have failed long ago.
  assert.equal(
    toDecimalString(115792089237316195423570985008687907853269984665640564039457584007913129639935n, 18),
    '115792089237316195423570985008687907853269984665640564039457.584007913129639935',
  );
});

test('the 18-vs-6 decimals misread is off by 10^12', () => {
  const raw = 18204000000n;
  assert.equal(toDecimalString(raw, 6), '18204.000000');
  assert.equal(toDecimalString(raw, 18), '0.000000018204000000');
});

test('group keeps full precision while adding separators', () => {
  assert.equal(group('18204.000000'), '18,204.000000');
  assert.equal(group('-1234567.5'), '-1,234,567.5');
  assert.equal(group('999'), '999');
});

test('format carries value, unit, decimals, block and finality', () => {
  assert.equal(format(reading(18204000000n)), '18,204.000000 USDC · dec 6 · block 3,214,876 · finalized');
});

test('format surfaces warnings rather than hiding them', () => {
  const r = reading(1n, { at: { block: 1n, finality: 'latest' }, warnings: ['read at latest'] });
  assert.match(format(r), /warnings: read at latest/);
});

test('add refuses readings taken at different blocks', () => {
  const a = reading(1n);
  const b = reading(2n, { at: { block: 3214877n, finality: 'finalized' } });
  assert.throws(() => add(a, b), /block mismatch/);
});

test('add refuses readings in different units', () => {
  const other = token({ symbol: 'DAI', decimals: 18, contract: '0x6b17' });
  assert.throws(() => add(reading(1n), reading(1n, { unit: other })), /unit mismatch/);
});

test('add combines matching readings and keeps the proof', () => {
  const sum = add(reading(1000000n), reading(2000000n));
  assert.equal(ui(sum), '3.000000');
  assert.equal(sum.at.block, 3214876n);
});

test('only safe and finalized count as settled', () => {
  assert.equal(isSettled(reading(1n, { at: { block: 1n, finality: 'finalized' } })), true);
  assert.equal(isSettled(reading(1n, { at: { block: 1n, finality: 'safe' } })), true);
  assert.equal(isSettled(reading(1n, { at: { block: 1n, finality: 'latest' } })), false);
  assert.equal(isSettled(reading(1n, { at: { block: 1n, finality: 'pending' } })), false);
});

test('assertSettled names the value and the risk', () => {
  const r = reading(18204000000n, { at: { block: 9n, finality: 'latest' } });
  assert.throws(() => assertSettled(r), /may not survive a reorg/);
});

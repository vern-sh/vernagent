import test from 'node:test';
import assert from 'node:assert/strict';
import { token } from '../src/units.ts';
import type { Reading } from '../src/reading.ts';
import type { Finality } from '../src/reading.ts';
import { ReadingLattice, describeLattice } from '../src/stream.ts';

const USDC = token({ symbol: 'USDC', decimals: 6, contract: '0xa0b8' });

const reading = (value: bigint, block: bigint, finality: Finality = 'latest'): Reading => ({
  value,
  unit: USDC,
  at: { block, finality },
  source: { standard: 'erc-20', method: 'balanceOf' },
  warnings: [],
});

test('a fresh reading at latest lands unsettled', () => {
  const lattice = new ReadingLattice(25);
  const cell = lattice.ingest(reading(18204000000n, 3214876n, 'latest'));
  assert.equal(cell.state, 'unsettled');
  assert.equal(cell.drift, 0n);
});

test('a reading at a settled block lands finalized, not unsettled', () => {
  const lattice = new ReadingLattice(25);
  const cell = lattice.ingest(reading(18204000000n, 3214852n, 'finalized'));
  assert.equal(cell.state, 'finalized');
});

test('reconcile marks a matching head read as agreeing', () => {
  const lattice = new ReadingLattice(25);
  lattice.ingest(reading(18204000000n, 3214876n, 'latest'));
  const moved = lattice.reconcile(reading(18204000000n, 3214876n, 'finalized'));
  assert.equal(moved.length, 1);
  assert.equal(moved[0]!.state, 'agrees');
  assert.equal(moved[0]!.drift, 0n);
});

test('reconcile catches a value the finalized state replaced', () => {
  const lattice = new ReadingLattice(25);
  // Head reported 18,203.774900 but the block finalized at 18,204.000000.
  lattice.ingest(reading(18203774900n, 3214871n, 'latest'));
  const moved = lattice.reconcile(reading(18204000000n, 3214871n, 'finalized'));
  assert.equal(moved[0]!.state, 'disagrees');
  assert.equal(moved[0]!.drift, -225100n); // observed under the finalized value
});

test('nothing threw; the read simply turned out wrong', () => {
  const lattice = new ReadingLattice(25);
  lattice.ingest(reading(18203472847n, 3214872n, 'latest'));
  const [cell] = lattice.reconcile(reading(18204000000n, 3214872n, 'finalized'));
  assert.equal(cell!.state, 'disagrees');
  assert.equal(cell!.reading.value, 18203472847n); // the observed value is preserved, never rewritten
});

test('reconcile refuses to judge against an unsettled value', () => {
  const lattice = new ReadingLattice(25);
  lattice.ingest(reading(1n, 5n, 'latest'));
  assert.throws(() => lattice.reconcile(reading(1n, 5n, 'latest')), /settled/);
});

test('reconcile leaves blocks newer than the finalized head alone', () => {
  const lattice = new ReadingLattice(25);
  lattice.ingest(reading(1n, 10n, 'latest'));
  lattice.ingest(reading(2n, 11n, 'latest'));
  lattice.reconcile(reading(1n, 10n, 'finalized'));
  const cells = lattice.cells();
  assert.equal(cells[0]!.state, 'agrees');
  assert.equal(cells[1]!.state, 'unsettled'); // block 11 not yet final
});

test('maxDrift reports the largest gap as a unit-tagged reading', () => {
  const lattice = new ReadingLattice(25);
  lattice.ingest(reading(18203774900n, 4871n, 'latest'));
  lattice.ingest(reading(18203255458n, 4873n, 'latest'));
  lattice.reconcile(reading(18204000000n, 4873n, 'finalized'));
  const drift = lattice.maxDrift();
  assert.ok(drift);
  assert.equal(drift!.cell.block, 4873n); // 0.744542 is the wider gap
  assert.match(drift!.ui, /0\.744542 USDC/);
});

test('maxDrift is undefined until something has disagreed', () => {
  const lattice = new ReadingLattice(25);
  lattice.ingest(reading(1n, 1n, 'latest'));
  lattice.reconcile(reading(1n, 1n, 'finalized'));
  assert.equal(lattice.maxDrift(), undefined);
});

test('the lattice stays bounded to its size, dropping the oldest', () => {
  const lattice = new ReadingLattice(3);
  for (let b = 1n; b <= 5n; b++) lattice.ingest(reading(b, b, 'latest'));
  const cells = lattice.cells();
  assert.equal(cells.length, 3);
  assert.equal(cells[0]!.block, 3n);
  assert.equal(cells[2]!.block, 5n);
});

test('disagreements lists only the blocks that lied', () => {
  const lattice = new ReadingLattice(25);
  lattice.ingest(reading(100n, 1n, 'latest'));
  lattice.ingest(reading(999n, 2n, 'latest'));
  lattice.reconcile(reading(100n, 2n, 'finalized'));
  const bad = lattice.disagreements();
  assert.equal(bad.length, 1);
  assert.equal(bad[0]!.block, 2n);
});

test('describeLattice renders newest last and flags disagreements', () => {
  const lattice = new ReadingLattice(25);
  lattice.ingest(reading(18203774900n, 3214871n, 'latest'));
  lattice.ingest(reading(18204000000n, 3214876n, 'latest'));
  lattice.reconcile(reading(18204000000n, 3214876n, 'finalized'));
  const line = describeLattice(lattice);
  assert.match(line, /4871✗/);
  assert.match(line, /4876·/);
});

test('a positive drift means the head read over-reported', () => {
  const lattice = new ReadingLattice(25);
  lattice.ingest(reading(18205000000n, 7n, 'latest')); // observed above finalized
  const [cell] = lattice.reconcile(reading(18204000000n, 7n, 'finalized'));
  assert.equal(cell!.drift, 1000000n);
});

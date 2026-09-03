import test from 'node:test';
import assert from 'node:assert/strict';
import { token, sameUnit, assertSameUnit, WEI, ETH, describeUnit } from '../src/units.ts';

const USDC = token({ symbol: 'USDC', decimals: 6, contract: '0xa0b8' });
const USDCe = token({ symbol: 'USDC.e', decimals: 6, contract: '0xdead' });

test('token() rejects decimals that cannot be real', () => {
  assert.throws(() => token({ symbol: 'X', decimals: 18.5, contract: '0x1' }), TypeError);
  assert.throws(() => token({ symbol: 'X', decimals: -1, contract: '0x1' }), TypeError);
  assert.throws(() => token({ symbol: 'X', decimals: 200, contract: '0x1' }), TypeError);
});

test('a wei is not an ETH', () => {
  assert.equal(sameUnit(WEI, ETH), false);
  assert.throws(() => assertSameUnit(WEI, ETH), TypeError);
});

test('two tokens with the same symbol and decimals are still different contracts', () => {
  assert.equal(USDC.decimals, USDCe.decimals);
  assert.equal(sameUnit(USDC, USDCe), false);
  assert.throws(() => assertSameUnit(USDC, USDCe), /unit mismatch/);
});

test('a unit matches itself', () => {
  assert.ok(sameUnit(USDC, token({ symbol: 'USDC', decimals: 6, contract: '0xa0b8' })));
  assert.doesNotThrow(() => assertSameUnit(USDC, USDC));
});

test('describeUnit names the contract for tokens', () => {
  assert.equal(describeUnit(USDC), 'USDC(dec 6 @ 0xa0b8)');
  assert.equal(describeUnit(ETH), 'ETH(dec 18)');
});

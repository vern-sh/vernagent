import test from 'node:test';
import assert from 'node:assert/strict';
import { VernClient, type Eip1193Provider } from '../src/client.ts';
import { DecimalsUnavailableError } from '../src/errors.ts';
import { format } from '../src/reading.ts';

const uint = (n: bigint) => '0x' + n.toString(16).padStart(64, '0');
const abiString = (s: string) => {
  const hex = Buffer.from(s, 'utf8').toString('hex');
  return '0x' + (32n).toString(16).padStart(64, '0') + BigInt(s.length).toString(16).padStart(64, '0') + hex.padEnd(64, '0');
};

function stub(over: Partial<Record<string, unknown>> = {}, opts: { failDecimals?: boolean } = {}): Eip1193Provider {
  return {
    async request({ method, params }) {
      if (method === 'eth_getBlockByNumber') return { number: uint(3214876n) };
      if (method === 'eth_getBalance') return uint(2500000000000000000n);
      if (method === 'eth_call') {
        const data = (params?.[0] as { data: string }).data;
        if (data.startsWith('0x313ce567')) {
          if (opts.failDecimals) throw new Error('execution reverted');
          return uint(6n);
        }
        if (data.startsWith('0x95d89b41')) return abiString('USDC');
        if (data.startsWith('0x70a08231')) return uint(18204000000n);
      }
      return over[method] ?? null;
    },
  };
}

test('balanceOf returns a reading with decimals read off the contract', async () => {
  const vern = new VernClient({ provider: stub() });
  const r = await vern.balanceOf('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0x1111111111111111111111111111111111111111');
  assert.equal(r.unit.decimals, 6);
  assert.equal(r.unit.symbol, 'USDC');
  assert.equal(r.value, 18204000000n);
  assert.equal(format(r), '18,204.000000 USDC · dec 6 · block 3,214,876 · finalized');
});

test('a contract that will not answer decimals() produces an error, never a guess', async () => {
  const vern = new VernClient({ provider: stub({}, { failDecimals: true }) });
  await assert.rejects(
    () => vern.balanceOf('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0x1111111111111111111111111111111111111111'),
    DecimalsUnavailableError,
  );
});

test('reads at latest carry a reorg warning; finalized reads carry none', async () => {
  const vern = new VernClient({ provider: stub() });
  const token = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  const owner = '0x1111111111111111111111111111111111111111';
  const latest = await vern.balanceOf(token, owner, 'latest');
  const finalized = await vern.balanceOf(token, owner, 'finalized');
  assert.match(latest.warnings[0] ?? '', /reorg/);
  assert.deepEqual(finalized.warnings, []);
});

test('a malformed address is rejected before any call goes out', async () => {
  const vern = new VernClient({ provider: stub() });
  await assert.rejects(() => vern.balanceOf('0xa0b8', 'not-an-address'), TypeError);
});

test('the native balance is denominated in wei, not ETH', async () => {
  const vern = new VernClient({ provider: stub() });
  const r = await vern.balance('0x1111111111111111111111111111111111111111');
  assert.equal(r.unit.symbol, 'WEI');
  assert.equal(r.unit.decimals, 0);
  assert.equal(r.value, 2500000000000000000n);
});

test('the unit is cached, so decimals() is read once per contract', async () => {
  let decimalsCalls = 0;
  const provider: Eip1193Provider = {
    async request({ method, params }) {
      if (method === 'eth_getBlockByNumber') return { number: uint(1n) };
      if (method === 'eth_call') {
        const data = (params?.[0] as { data: string }).data;
        if (data.startsWith('0x313ce567')) { decimalsCalls++; return uint(6n); }
        if (data.startsWith('0x95d89b41')) return abiString('USDC');
        if (data.startsWith('0x70a08231')) return uint(1n);
      }
      return null;
    },
  };
  const vern = new VernClient({ provider });
  const token = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  const owner = '0x1111111111111111111111111111111111111111';
  await vern.balanceOf(token, owner);
  await vern.balanceOf(token, owner);
  await vern.balanceOf(token.toUpperCase().replace('0X', '0x'), owner);
  assert.equal(decimalsCalls, 1);
});

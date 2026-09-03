/**
 * Read a USDC balance and print it with its proof.
 *
 *   RPC_URL=https://... node --experimental-strip-types examples/read-balance.ts
 */

import { VernClient, format, assertSettled, type Eip1193Provider } from '../src/index.ts';

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) throw new Error('set RPC_URL');

const provider: Eip1193Provider = {
  async request({ method, params }) {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: params ?? [] }),
    });
    const json = (await res.json()) as { result?: unknown; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return json.result;
  },
};

const vern = new VernClient({ provider });

const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const OWNER = process.argv[2] ?? '0x0000000000000000000000000000000000000000';

const reading = await vern.balanceOf(USDC, OWNER);

console.log(format(reading));
// 18,204.000000 USDC · dec 6 · block 3,214,876 · finalized

assertSettled(reading); // throws if the value could still be replaced by a reorg

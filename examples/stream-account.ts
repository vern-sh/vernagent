/**
 * Stream a USDC account and watch which blocks lie.
 *
 * Reads the account at every new block, reconciles each read against the
 * finalized value, and prints the drift when a head read does not survive to
 * finality. Nothing here throws on a bad read; the lattice records it.
 *
 *   RPC_URL=https://... node --experimental-strip-types examples/stream-account.ts <owner>
 */

import { VernClient, describeLattice, streamAccount, type Eip1193Provider } from '../src/index.ts';

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

// Ctrl-C ends the stream cleanly rather than tearing it down mid-read.
const controller = new AbortController();
process.on('SIGINT', () => controller.abort());

for await (const event of streamAccount(vern, USDC, OWNER, {
  latticeSize: 25,
  limit: 25,
  signal: controller.signal,
})) {
  switch (event.kind) {
    case 'read':
      console.log(`head  block ${event.at.block}  ${event.cell.reading.warnings.join('; ') || 'read'}`);
      break;
    case 'settled':
      console.log(`settled ${event.cells.length} block(s)`);
      break;
    case 'drift':
      // A value a model would have acted on, replaced by the finalized state.
      console.warn(`DRIFT  block ${event.drift.cell.block}  ${event.drift.ui}`);
      break;
  }
}

console.log('\nfinal lattice:');

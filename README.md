# vern

**The precision layer for AI agents on Robinhood Chain.**

An RPC hands your agent a `uint256`. vern hands it a reading that carries its unit, its
decimals, its block, and where it came from.

```ts
const reading = await vern.balanceOf(USDC, wallet);

format(reading);
// 18,204.000000 USDC · dec 6 · block 3,214,876 · finalized
```

---

## The problem

Agents do not fail on chain by throwing. They fail by returning a number that looks right.

```ts
const raw = await provider.request({ method: 'eth_call', params: [balanceOf, 'latest'] });
// 18204000000

formatUnits(raw, 18);  // 0.000000018204   ← USDC has 6 decimals, not 18
```

That call did not throw. It returned a plausible number, wrong by a factor of 10¹². A model
will size a position from it without hesitating. The same class of error covers reading at
an unsettled block, mixing values taken at different blocks, and adding a wei to an ETH.

vern's answer is that a quantity is never a bare integer. It is a value plus the four facts
that make it mean something.

## Install

```bash
npm install @vern/agent
```

Requires Node 22.6 or newer. The package ships compiled JavaScript with type declarations;
the source is TypeScript and runs directly on Node 23.6+ without a build step.

## Readings

```ts
import { VernClient, format, assertSettled } from '@vern/agent';

const vern = new VernClient({ provider });          // any EIP-1193 provider
const reading = await vern.balanceOf(USDC, wallet); // finalized by default

reading.value;          // 18204000000n            the integer the contract returned
reading.unit;           // { symbol: 'USDC', decimals: 6, contract: '0xa0b8…' }
reading.at;             // { block: 3214876n, finality: 'finalized' }
reading.source;         // { standard: 'erc-20', method: 'balanceOf' }
reading.warnings;       // []

format(reading);        // '18,204.000000 USDC · dec 6 · block 3,214,876 · finalized'
assertSettled(reading); // throws when a reorg could still replace the value
```

**Decimals are sourced, never assumed.** vern reads `decimals()` off the contract and caches
it. A contract that will not answer raises `DecimalsUnavailableError` rather than returning a
number scaled by a guess.

**Scaling is exact.** Values are `bigint` throughout and formatted through string arithmetic.
No float touches a balance, so `2^256 - 1` formats as precisely as `1`.

## Units are types

```ts
const gas: Reading = await vern.balance(wallet);     // WEI, decimals 0
const held: Reading = await vern.balanceOf(USDC, wallet);

add(gas, held);
// TypeError: unit mismatch: WEI(dec 0) cannot be combined with USDC(dec 6 @ 0xa0b8…)
```

`add` also refuses readings taken at different blocks, because a total assembled from two
blocks was never true at either one.

## The write path

```
intent → build → simulate → sign
```

vern stops at simulate. It reports what the transaction would do to balances; your agent
holds the key and decides.

```ts
assertWithinGuard(simulation, {
  maxSpent:      { account: wallet, amount: 500_000000n },
  minReceived:   { account: wallet, amount: 2_000000n },
  requireSettled: true,
});

console.log(describeSimulation(simulation));
// buy: 500 USDC of AAPLx
//   -500.000000 USDC  (0x1111…)
//   +2.084310 AAPLx   (0x1111…)
//   gas 21000 @ 34000000000 wei
//   simulated at block 3214876 (finalized)
//   vern does not sign. Your agent holds the key.
```

Guards fail loudly and name both numbers: `cap 400000000, simulation spends 500000000`.

**The boundary.** vern builds and simulates. Your agent signs. vern never holds a key, never
signs a transaction, and never takes custody.

## MCP

```ts
import { tools, call } from '@vern/agent/mcp';
```

`tools` describes `vern.read_token_balance` and `vern.read_native_balance`; `call` executes
one and returns the reading with its unit, block, finality, and a `summary` line a model can
quote without dropping the proof. Both are pure, so they wire to stdio, HTTP, or an
in-process harness.

## Development

```bash
npm test        # node --test, no build step
npm run build   # tsc → dist/
npm run typecheck
```

## Status

Early access. The SDK surface is stable enough to build against; the hosted infrastructure
behind it is not public yet. `$VERN` has 9 decimals and no live contract.

## License

MIT

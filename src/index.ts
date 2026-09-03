/**
 * vern — the precision layer for AI agents on Robinhood Chain.
 *
 * An RPC hands your agent a uint256. vern hands it a reading that carries its
 * unit, its decimals, its block, and where it came from.
 */

export { VernClient, type ClientOptions, type Eip1193Provider } from './client.ts';

export {
  type Reading,
  type ReadingAt,
  type ReadingSource,
  type Finality,
  format,
  ui,
  add,
  group,
  toDecimalString,
  isSettled,
  assertSettled,
} from './reading.ts';

export {
  type Unit,
  type NativeUnit,
  type TokenUnit,
  type Wei,
  type Eth,
  type TokenAmount,
  WEI,
  ETH,
  token,
  sameUnit,
  assertSameUnit,
  describeUnit,
} from './units.ts';

export {
  type Intent,
  type BuiltTransaction,
  type BalanceDelta,
  type GasEstimate,
  type Simulation,
  type Guard,
  deltaValue,
  formatDelta,
  assertWithinGuard,
  describeSimulation,
} from './write.ts';

export {
  type CellState,
  type LatticeCell,
  type DriftReading,
  type StreamEvent,
  type StreamOptions,
  ReadingLattice,
  streamAccount,
  describeLattice,
} from './stream.ts';

export { VernError, CallError, DecimalsUnavailableError, GuardError } from './errors.ts';

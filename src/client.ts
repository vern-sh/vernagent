/**
 * The client.
 *
 * A thin, honest layer over an EIP-1193 provider. Every read returns a Reading,
 * never a bare integer, and decimals are always sourced from the contract.
 */

import { type Unit, WEI, token } from './units.ts';
import type { Finality, Reading } from './reading.ts';
import { CallError, DecimalsUnavailableError } from './errors.ts';

/** The minimum provider surface vern needs. Any EIP-1193 provider satisfies it. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export interface ClientOptions {
  readonly provider: Eip1193Provider;
  /** Finality every read defaults to. `finalized` is the safe default and the one vern ships. */
  readonly finality?: Finality;
}

const SELECTOR = {
  balanceOf: '0x70a08231',
  decimals: '0x313ce567',
  symbol: '0x95d89b41',
} as const;

function encodeAddress(address: string): string {
  const clean = address.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{40}$/.test(clean)) throw new TypeError(`not an address: ${address}`);
  return clean.padStart(64, '0');
}

function decodeUint(hex: unknown, what: string): bigint {
  if (typeof hex !== 'string' || !hex.startsWith('0x') || hex.length < 3) {
    throw new CallError(`${what} returned ${JSON.stringify(hex)}, which is not a uint256`);
  }
  return BigInt(hex);
}

function decodeString(hex: unknown): string | undefined {
  if (typeof hex !== 'string' || hex.length <= 2) return undefined;
  const body = hex.slice(2);
  // Try the ABI-encoded dynamic string layout first, then a bytes32 fallback.
  try {
    const offset = Number(BigInt('0x' + body.slice(0, 64))) * 2;
    const length = Number(BigInt('0x' + body.slice(offset, offset + 64))) * 2;
    const data = body.slice(offset + 64, offset + 64 + length);
    const text = Buffer.from(data, 'hex').toString('utf8').replace(/\0+$/, '');
    if (text) return text;
  } catch {
    /* fall through to bytes32 */
  }
  const text = Buffer.from(body, 'hex').toString('utf8').replace(/\0+$/, '').trim();
  return text || undefined;
}

export class VernClient {
  readonly #provider: Eip1193Provider;
  readonly #finality: Finality;
  readonly #unitCache = new Map<string, Unit>();

  constructor(options: ClientOptions) {
    this.#provider = options.provider;
    this.#finality = options.finality ?? 'finalized';
  }

  async #call(to: string, data: string, tag: string): Promise<unknown> {
    return this.#provider.request({ method: 'eth_call', params: [{ to, data }, tag] });
  }

  /** The block a read is anchored to, at the requested finality. */
  async blockNumber(finality: Finality = this.#finality): Promise<bigint> {
    const raw = await this.#provider.request({ method: 'eth_getBlockByNumber', params: [finality, false] });
    if (!raw || typeof raw !== 'object' || !('number' in raw)) {
      throw new CallError(`eth_getBlockByNumber(${finality}) returned no block`);
    }
    return decodeUint((raw as { number: unknown }).number, 'eth_getBlockByNumber');
  }

  /**
   * Read a token's unit from the contract and cache it. Decimals are never
   * assumed; a contract that will not answer `decimals()` produces an error
   * rather than a plausible wrong number.
   */
  async unitOf(contract: string, finality: Finality = this.#finality): Promise<Unit> {
    const key = contract.toLowerCase();
    const cached = this.#unitCache.get(key);
    if (cached) return cached;

    let decimals: number;
    try {
      decimals = Number(decodeUint(await this.#call(contract, SELECTOR.decimals, finality), 'decimals()'));
    } catch (cause) {
      throw new DecimalsUnavailableError(contract, cause);
    }

    let symbol = 'TOKEN';
    try {
      symbol = decodeString(await this.#call(contract, SELECTOR.symbol, finality)) ?? symbol;
    } catch {
      // A missing symbol costs nothing; a missing decimals is fatal. Carry on.
    }

    const unit = token({ symbol, decimals, contract: key });
    this.#unitCache.set(key, unit);
    return unit;
  }

  /** An ERC-20 balance, as a reading. */
  async balanceOf(contract: string, owner: string, finality: Finality = this.#finality): Promise<Reading> {
        const [unit, block, raw] = await Promise.all([
      this.unitOf(contract, finality),
      this.blockNumber(finality),
      this.#call(contract, SELECTOR.balanceOf + encodeAddress(owner), finality),
    ]);

    const warnings: string[] = [];
    if (finality === 'pending' || finality === 'latest') {
      warnings.push(`read at ${finality}; the value may be replaced by a reorg`);
    }

    return {
      value: decodeUint(raw, 'balanceOf()'),
      unit,
      at: { block, finality },
      source: { standard: 'erc-20', method: 'balanceOf', address: contract },
      warnings,
    };
  }

  /** The native balance, as a reading in wei. */
  async balance(owner: string, finality: Finality = this.#finality): Promise<Reading> {
        const [block, raw] = await Promise.all([
      this.blockNumber(finality),
      this.#provider.request({ method: 'eth_getBalance', params: [owner, finality] }),
    ]);
    return {
      value: decodeUint(raw, 'eth_getBalance'),
      unit: WEI,
      at: { block, finality },
      source: { standard: 'eip-1193', method: 'eth_getBalance', address: owner },
      warnings: finality === 'latest' || finality === 'pending' ? [`read at ${finality}`] : [],
    };
  }
}

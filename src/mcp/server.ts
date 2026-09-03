/**
 * MCP surface.
 *
 * Exposes vern to any agent that speaks the Model Context Protocol. Tool results
 * are readings, so a model receives the unit, the decimals, the block, and the
 * finality alongside the number, and cannot silently drop them.
 *
 * Transport is left to the caller: `tools` and `call` are pure, so they can be
 * wired to stdio, HTTP, or an in-process harness.
 */

import { VernClient } from '../client.ts';
import { format, ui } from '../reading.ts';
import type { Finality } from '../reading.ts';

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export const tools: readonly ToolDefinition[] = [
  {
    name: 'vern.read_token_balance',
    description:
      'Read an ERC-20 balance as a reading. Returns the value with the decimals declared by the contract, ' +
      'the block it was read at, and the finality of that block. Decimals are never assumed.',
    inputSchema: {
      type: 'object',
      required: ['contract', 'owner'],
      properties: {
        contract: { type: 'string', description: 'ERC-20 contract address' },
        owner: { type: 'string', description: 'Address whose balance to read' },
        finality: {
          type: 'string',
          enum: ['pending', 'latest', 'safe', 'finalized'],
          description: 'Defaults to finalized. Anything less carries a reorg warning.',
        },
      },
    },
  },
  {
    name: 'vern.read_native_balance',
    description: 'Read the native balance as a reading, denominated in wei.',
    inputSchema: {
      type: 'object',
      required: ['owner'],
      properties: {
        owner: { type: 'string' },
        finality: { type: 'string', enum: ['pending', 'latest', 'safe', 'finalized'] },
      },
    },
  },
];

export interface ToolResult {
  readonly ui: string;
  readonly raw: string;
  readonly unit: { symbol: string; decimals: number; contract?: string };
  readonly at: { block: string; finality: Finality };
  readonly source: { standard: string; method: string };
  readonly warnings: readonly string[];
  /** One line a model can quote verbatim without losing the proof. */
  readonly summary: string;
}

export async function call(
  client: VernClient,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const finality = (args.finality as Finality | undefined) ?? 'finalized';

  const reading =
    name === 'vern.read_token_balance'
      ? await client.balanceOf(String(args.contract), String(args.owner), finality)
      : name === 'vern.read_native_balance'
        ? await client.balance(String(args.owner), finality)
        : (() => {
            throw new Error(`unknown tool: ${name}`);
          })();

  return {
    ui: ui(reading),
    raw: reading.value.toString(),
    unit:
      reading.unit.kind === 'token'
        ? { symbol: reading.unit.symbol, decimals: reading.unit.decimals, contract: reading.unit.contract }
        : { symbol: reading.unit.symbol, decimals: reading.unit.decimals },
    at: { block: reading.at.block.toString(), finality: reading.at.finality },
    source: { standard: reading.source.standard, method: reading.source.method },
    warnings: reading.warnings,
    summary: format(reading),
  };
}

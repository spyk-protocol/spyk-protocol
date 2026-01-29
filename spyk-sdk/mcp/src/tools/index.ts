import { spyk_balance } from './spyk_balance.js';
import { spyk_shield } from './spyk_shield.js';
import { spyk_pay } from './spyk_pay.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Tool registry - all available MCP tools
 *
 * Tools:
 * - spyk_balance: Check shielded and public balance
 * - spyk_shield: Shield funds for private payments
 * - spyk_pay: Pay for x402 APIs privately
 */
export const tools: Tool[] = [
  spyk_balance,
  spyk_shield,
  spyk_pay,
];

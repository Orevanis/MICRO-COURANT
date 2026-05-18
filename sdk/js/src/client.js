import { SorobanRpc, Keypair } from "stellar-sdk";
import { BillingContract } from "./contracts/billing.js";
import { TradingContract } from "./contracts/trading.js";
import { GovernanceContract } from "./contracts/governance.js";
import { SettlementContract } from "./contracts/settlement.js";
import { MeterRegistryContract } from "./contracts/meterRegistry.js";

/**
 * Top-level client for interacting with the Micro-Courant smart contracts.
 *
 * @example
 * const client = new MicroCourantClient({
 *   rpcUrl: "https://soroban-testnet.stellar.org",
 *   network: "testnet",
 *   secretKey: "S...",
 *   contractIds: {
 *     meterRegistry: "C...",
 *     billing: "C...",
 *     trading: "C...",
 *     governance: "C...",
 *     settlement: "C...",
 *   },
 * });
 * await client.initialize();
 */
export class MicroCourantClient {
  /**
   * @param {object} options
   * @param {string} options.rpcUrl - Soroban RPC endpoint
   * @param {"testnet"|"public"} options.network
   * @param {string} [options.secretKey] - Stellar secret key for signing
   * @param {object} options.contractIds - Map of contract names to IDs
   */
  constructor({ rpcUrl, network, secretKey, contractIds = {} }) {
    this.rpcUrl = rpcUrl;
    this.network = network;
    this.keypair = secretKey ? Keypair.fromSecret(secretKey) : null;
    this.contractIds = contractIds;
    this.server = null;

    this.billing = null;
    this.trading = null;
    this.governance = null;
    this.settlement = null;
    this.meterRegistry = null;
  }

  async initialize() {
    this.server = new SorobanRpc.Server(this.rpcUrl);

    const ctx = {
      server: this.server,
      network: this.network,
      keypair: this.keypair,
    };

    this.meterRegistry = new MeterRegistryContract(
      ctx,
      this.contractIds.meterRegistry,
    );
    this.billing = new BillingContract(ctx, this.contractIds.billing);
    this.trading = new TradingContract(ctx, this.contractIds.trading);
    this.governance = new GovernanceContract(ctx, this.contractIds.governance);
    this.settlement = new SettlementContract(ctx, this.contractIds.settlement);
  }
}

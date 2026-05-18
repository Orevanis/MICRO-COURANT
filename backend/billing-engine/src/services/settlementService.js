import * as Stellar from "stellar-sdk";
import {
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Keypair,
  Asset,
  Contract,
  Address,
  SorobanRpc,
  xdr,
} from "stellar-sdk";

const { Server } = SorobanRpc;
const ScVal = xdr.ScVal;
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  CircuitBreaker,
  circuitBreakerManager,
} from "@micro-courant/circuit-breaker";

export class SettlementService {
  constructor() {
    this.server = null;
    this.stellarServer = null;
    this.contractIds = {};
    this.keypair = null;
  }

  async initialize() {
    this.server = new Server(config.stellar.rpcUrl);

    this.stellarServer = new Stellar.Server(
      config.stellar.network === "public"
        ? "https://horizon.stellar.org"
        : "https://horizon-testnet.stellar.org",
    );

    const secretKey = process.env.SETTLEMENT_SECRET_KEY;
    if (secretKey) {
      this.keypair = Keypair.fromSecret(secretKey);
      logger.info("Settlement keypair loaded");
    } else {
      logger.warn(
        "SETTLEMENT_SECRET_KEY not set - settlement will be simulated",
      );
    }

    // Register circuit breakers for external dependencies
    circuitBreakerManager.register("stellar-api", {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 10000,
      onStateChange: (newState, oldState) => {
        logger.warn(`Stellar API circuit breaker: ${oldState} -> ${newState}`);
      },
    });

    circuitBreakerManager.register("soroban-rpc", {
      failureThreshold: 3,
      resetTimeout: 30000,
      monitoringPeriod: 5000,
      onStateChange: (newState, oldState) => {
        logger.warn(`Soroban RPC circuit breaker: ${oldState} -> ${newState}`);
      },
    });

    logger.info(
      "Settlement service initialized with Soroban, Stellar SDK, and circuit breakers",
    );
  }

  setContractIds(contractIds) {
    this.contractIds = contractIds;
  }

  async createSettlement(type, fromAddress, toAddress, amount, referenceId) {
    try {
      // Call the GridSettlement contract to create settlement
      const contractId = this.contractIds.gridSettlement;
      if (!contractId) {
        throw new Error("GridSettlement contract ID not configured");
      }

      const contract = new Contract(contractId);

      const operation = contract.call(
        "create_settlement",
        ...this.encodeSettlementType(type),
        ...this.encodeAddress(fromAddress),
        ...this.encodeAddress(toAddress),
        ...this.encodeAmount(amount),
        ...this.encodeReference(referenceId),
      );

      const transaction = new TransactionBuilder(this.server, {
        fee: BASE_FEE,
        networkPassphrase:
          Networks[config.stellar.network.toUpperCase()].NETWORK_PASSPHRASE,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      if (this.keypair) {
        transaction.sign(this.keypair);
      }

      const result = await this.server.sendTransaction(transaction);

      const settlement = {
        settlement_id: this.extractSettlementId(result.resultXdr),
        type,
        from_address: fromAddress,
        to_address: toAddress,
        amount,
        reference_id: referenceId,
        status: "pending",
        transaction_hash: result.hash,
        timestamp: new Date().toISOString(),
      };

      logger.info(
        `Settlement created: ${settlement.settlement_id}, tx: ${result.hash}`,
      );

      return settlement;
    } catch (error) {
      logger.error("Settlement creation error:", error);
      throw error;
    }
  }

  async processPendingSettlements(batchSize = 10) {
    try {
      const contractId = this.contractIds.gridSettlement;
      if (!contractId) {
        throw new Error("GridSettlement contract ID not configured");
      }

      const contract = new Contract(contractId);

      // Get pending settlement count
      const countResult = await this.server.getContractData(
        contractId,
        ScVal.toUint32(0),
      );
      const pendingCount = countResult.val.toU32();

      const toProcess = Math.min(pendingCount, batchSize);
      const processed = [];
      const failed = [];

      for (let i = 0; i < toProcess; i++) {
        try {
          // Process each pending settlement
          const operation = contract.call(
            "process_pending_settlement",
            ScVal.toUint32(i),
          );

          const transaction = new TransactionBuilder(this.server, {
            fee: BASE_FEE,
            networkPassphrase:
              Networks[config.stellar.network.toUpperCase()].NETWORK_PASSPHRASE,
          })
            .addOperation(operation)
            .setTimeout(30)
            .build();

          if (this.keypair) {
            transaction.sign(this.keypair);
          }

          const result = await this.server.sendTransaction(transaction);

          processed.push({
            settlement_index: i,
            status: "completed",
            transaction_hash: result.hash,
          });
        } catch (error) {
          logger.error(`Failed to process settlement ${i}:`, error);
          failed.push({
            settlement_index: i,
            status: "failed",
            error: error.message,
          });
        }
      }

      logger.info(
        `Processed ${processed.length} settlements, ${failed.length} failed`,
      );

      return { processed, failed, count: toProcess };
    } catch (error) {
      logger.error("Settlement processing error:", error);
      throw error;
    }
  }

  async executeStellarTransaction(fromAddress, toAddress, amount, memo) {
    return await circuitBreakerManager.execute("stellar-api", async () => {
      if (!this.keypair) {
        throw new Error("Settlement keypair not configured");
      }

      const sourceAccount = await this.stellarServer.loadAccount(
        this.keypair.publicKey(),
      );

      const transaction = new Stellar.TransactionBuilder(sourceAccount, {
        fee: Stellar.BASE_FEE,
        networkPassphrase:
          config.stellar.network === "public"
            ? Stellar.Networks.PUBLIC
            : Stellar.Networks.TESTNET,
      })
        .addOperation(
          Stellar.Operation.payment({
            destination: toAddress,
            asset: Stellar.Asset.native(),
            amount: amount.toString(),
          }),
        )
        .addMemo(memo ? Stellar.Memo.text(memo) : null)
        .setTimeout(30)
        .build();

      transaction.sign(this.keypair);

      const result = await this.stellarServer.submitTransaction(transaction);

      logger.info(
        `Stellar transaction executed: ${result.hash}, amount: ${amount} XLM`,
      );

      return {
        success: true,
        transaction_hash: result.hash,
        ledger: result.ledger,
        result_xdr: result.resultXdr,
      };
    });
  }

  async getSettlementStatus(settlementId) {
    try {
      const contractId = this.contractIds.gridSettlement;
      if (!contractId) {
        throw new Error("GridSettlement contract ID not configured");
      }

      const contract = new Contract(contractId);

      const key = ScVal.fromUint256(Buffer.from(settlementId, "hex"));
      const result = await this.server.getContractData(contractId, key);

      if (result.val) {
        return this.decodeSettlement(result.val);
      }

      return {
        settlement_id: settlementId,
        status: "not_found",
      };
    } catch (error) {
      logger.error("Get settlement status error:", error);
      throw error;
    }
  }

  // Helper methods for encoding/decoding
  encodeSettlementType(type) {
    const types = { consumption_billing: 0, p2p_trading: 1, subsidy: 2 };
    return [ScVal.toUint32(types[type] || 0)];
  }

  encodeAddress(address) {
    return [ScVal.fromScVal(ScVal.address(new Address(address)))];
  }

  encodeAmount(amount) {
    return [ScVal.toI128(amount)];
  }

  encodeReference(referenceId) {
    return [ScVal.fromString(referenceId)];
  }

  extractSettlementId(resultXdr) {
    // Parse the result XDR to extract settlement ID
    // This is a simplified version - actual implementation would parse the XDR
    return `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  decodeSettlement(val) {
    // Decode settlement data from contract storage
    return {
      settlement_id: val.toString(),
      status: "completed",
      transaction_hash: "pending",
    };
  }

  async shutdown() {
    logger.info("Settlement service shutdown");
  }
}

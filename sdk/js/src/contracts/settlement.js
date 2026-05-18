import { xdr, Address } from "stellar-sdk";
import { BaseContract } from "./base.js";

const SETTLEMENT_TYPES = {
  consumption_billing: 0,
  p2p_trade: 1,
  subsidy_distribution: 2,
  refund: 3,
};

export class SettlementContract extends BaseContract {
  async createSettlement(
    type,
    fromAddress,
    toAddress,
    amount,
    referenceId,
    priority = 50,
  ) {
    return this._call(
      "create_settlement",
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(type)]),
      new Address(fromAddress).toScVal(),
      new Address(toAddress).toScVal(),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(amount))),
      xdr.ScVal.scvString(referenceId),
      xdr.ScVal.scvU32(priority),
    );
  }

  async processPendingSettlements(batchSize = 10) {
    return this._call(
      "process_pending_settlements",
      xdr.ScVal.scvU32(batchSize),
    );
  }

  async getSettlement(settlementId) {
    return this._call(
      "get_settlement",
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(settlementId))),
    );
  }

  async getPendingCount() {
    return this._call("get_pending_count");
  }

  async getStatistics() {
    return this._call("get_statistics");
  }
}

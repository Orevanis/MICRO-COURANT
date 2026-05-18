import { xdr, Address } from "stellar-sdk";
import { BaseContract } from "./base.js";

export class TradingContract extends BaseContract {
  async createOffer(producerAddress, energyAmountKwh, pricePerKwh, expiryHours) {
    return this._call(
      "create_offer",
      new Address(producerAddress).toScVal(),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(energyAmountKwh))),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(pricePerKwh))),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(expiryHours))),
    );
  }

  async createRequest(consumerAddress, energyAmountKwh, maxPricePerKwh, expiryHours) {
    return this._call(
      "create_request",
      new Address(consumerAddress).toScVal(),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(energyAmountKwh))),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(maxPricePerKwh))),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(expiryHours))),
    );
  }

  async matchTrade(offerId, requestId) {
    return this._call(
      "match_trade",
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(offerId))),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(requestId))),
    );
  }

  async getOpenOffers(limit = 20) {
    return this._call("get_open_offers", xdr.ScVal.scvU32(limit));
  }

  async getOpenRequests(limit = 20) {
    return this._call("get_open_requests", xdr.ScVal.scvU32(limit));
  }
}

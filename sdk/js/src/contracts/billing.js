import { xdr, Address } from "stellar-sdk";
import { BaseContract } from "./base.js";

export class BillingContract extends BaseContract {
  async registerHousehold(householdAddress, billingMode, initialBalance) {
    const modeVal = billingMode === "prepaid"
      ? xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Prepaid")])
      : xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Postpaid")]);

    return this._call(
      "register_household",
      new Address(householdAddress).toScVal(),
      modeVal,
      xdr.ScVal.scvI128(new xdr.Int128Parts({ hi: xdr.Int64.fromString("0"), lo: xdr.Uint64.fromString(String(initialBalance)) })),
    );
  }

  async getBalance(householdAddress) {
    return this._call("get_balance", new Address(householdAddress).toScVal());
  }

  async addBalance(householdAddress, amount) {
    return this._call(
      "add_balance",
      new Address(householdAddress).toScVal(),
      xdr.ScVal.scvI128(new xdr.Int128Parts({ hi: xdr.Int64.fromString("0"), lo: xdr.Uint64.fromString(String(amount)) })),
    );
  }

  async recordUsage(meterId, householdAddress, consumptionKwh) {
    return this._call(
      "record_usage",
      xdr.ScVal.scvBytes(Buffer.from(meterId)),
      new Address(householdAddress).toScVal(),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(consumptionKwh))),
    );
  }

  async getTariffRate() {
    return this._call("get_tariff_rate");
  }
}

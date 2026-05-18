import { xdr, Address } from "stellar-sdk";
import { BaseContract } from "./base.js";

export class MeterRegistryContract extends BaseContract {
  async registerMeter(meterId, householdAddress, location, operatorAddress) {
    return this._call(
      "register_meter",
      xdr.ScVal.scvBytes(Buffer.from(meterId)),
      new Address(householdAddress).toScVal(),
      xdr.ScVal.scvString(location),
      new Address(operatorAddress).toScVal(),
    );
  }

  async getMeter(meterId) {
    return this._call("get_meter", xdr.ScVal.scvBytes(Buffer.from(meterId)));
  }

  async updateReading(meterId, reading) {
    return this._call(
      "update_reading",
      xdr.ScVal.scvBytes(Buffer.from(meterId)),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(reading))),
    );
  }

  async meterExists(meterId) {
    return this._call("meter_exists", xdr.ScVal.scvBytes(Buffer.from(meterId)));
  }
}

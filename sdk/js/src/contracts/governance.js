import { xdr, Address } from "stellar-sdk";
import { BaseContract } from "./base.js";

export class GovernanceContract extends BaseContract {
  async createProposal(proposerAddress, proposalType, title, description) {
    return this._call(
      "create_proposal",
      new Address(proposerAddress).toScVal(),
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(proposalType)]),
      xdr.ScVal.scvString(title),
      xdr.ScVal.scvString(description),
    );
  }

  async castVote(voterAddress, proposalId, voteOption) {
    return this._call(
      "cast_vote",
      new Address(voterAddress).toScVal(),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(proposalId))),
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(voteOption)]),
    );
  }

  async getProposal(proposalId) {
    return this._call(
      "get_proposal",
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(proposalId))),
    );
  }

  async getActiveSubsidies(limit = 20) {
    return this._call("get_active_subsidies", xdr.ScVal.scvU32(limit));
  }
}

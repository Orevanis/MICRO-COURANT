import { Contract, TransactionBuilder, Networks, BASE_FEE } from "stellar-sdk";

export class BaseContract {
  constructor({ server, network, keypair }, contractId) {
    this.server = server;
    this.network = network;
    this.keypair = keypair;
    this.contractId = contractId;
    this.contract = contractId ? new Contract(contractId) : null;
  }

  _networkPassphrase() {
    return this.network === "public" ? Networks.PUBLIC : Networks.TESTNET;
  }

  async _call(method, ...args) {
    if (!this.contract) throw new Error(`Contract ID not set for ${this.constructor.name}`);
    if (!this.keypair) throw new Error("No keypair configured — read-only mode");

    const account = await this.server.getAccount(this.keypair.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this._networkPassphrase(),
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const prepared = await this.server.prepareTransaction(tx);
    prepared.sign(this.keypair);
    return this.server.sendTransaction(prepared);
  }
}

import { useState } from "react";
import { PlusCircle, Wallet, CheckCircle } from "lucide-react";

export default function Recharge() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const presetAmounts = [10, 25, 50, 100];

  const handleRecharge = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Recharge Successful!
          </h2>
          <p className="text-gray-600 mb-6">Your balance has been updated.</p>
          <button onClick={() => setSuccess(false)} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recharge Balance</h1>
        <p className="text-gray-600">
          Add funds to your energy account using Stellar
        </p>
      </div>

      {/* Stellar wallet integration */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Wallet className="text-primary-600" size={32} />
          </div>
          <div>
            <h3 className="font-semibold">Stellar Wallet</h3>
            <p className="text-sm text-gray-600">
              Connect your wallet to recharge
            </p>
          </div>
        </div>

        <button className="btn-primary w-full flex items-center justify-center space-x-2">
          <PlusCircle size={20} />
          <span>Connect Freighter Wallet</span>
        </button>
      </div>

      {/* Amount selection */}
      <div className="card">
        <h3 className="font-semibold mb-4">Select Amount</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              className={`p-4 rounded-lg border-2 transition-colors ${
                amount === preset.toString()
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-2xl font-bold">{preset}</p>
              <p className="text-sm text-gray-600">XLM</p>
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Amount (XLM)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="input-field"
            min="1"
            step="0.01"
          />
        </div>

        <button
          onClick={handleRecharge}
          disabled={!amount || loading}
          className="btn-primary w-full"
        >
          {loading ? "Processing..." : "Recharge"}
        </button>
      </div>

      {/* Information */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Connect your Stellar wallet (Freighter)</li>
          <li>• Select or enter the recharge amount</li>
          <li>• Confirm the transaction in your wallet</li>
          <li>• Balance is updated instantly on-chain</li>
        </ul>
      </div>

      {/* Transaction fees */}
      <div className="card">
        <h3 className="font-semibold mb-3">Fee Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Network Fee</span>
            <span>0.00001 XLM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Service Fee</span>
            <span>0%</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t">
            <span>Total Fee</span>
            <span>0.00001 XLM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEnergyStore } from "../stores/energyStore";
import { Wallet, ArrowDown, ArrowUp, Clock } from "lucide-react";

export default function Balance() {
  const { currentBalance, tariffRate } = useEnergyStore();

  const balanceInXLM = (currentBalance / 10000000).toFixed(2);
  const estimatedDailyCost = (10 * tariffRate) / 10000000; // Assuming 10 kWh daily
  const daysRemaining =
    currentBalance > 0 ? (currentBalance / (10 * tariffRate)).toFixed(0) : 0;

  const transactions = [
    {
      id: 1,
      type: "credit",
      description: "Recharge via Stellar",
      amount: 50,
      date: "2024-01-15",
    },
    {
      id: 2,
      type: "debit",
      description: "Daily consumption",
      amount: -1.5,
      date: "2024-01-15",
    },
    {
      id: 3,
      type: "debit",
      description: "Daily consumption",
      amount: -1.8,
      date: "2024-01-14",
    },
    {
      id: 4,
      type: "credit",
      description: "Subsidy applied",
      amount: 5,
      date: "2024-01-14",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Balance</h1>
        <p className="text-gray-600">Manage your energy account balance</p>
      </div>

      {/* Balance card */}
      <div className="card bg-gradient-to-br from-primary-500 to-primary-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100">Current Balance</p>
            <p className="text-4xl font-bold mt-2">{balanceInXLM} XLM</p>
            <p className="text-primary-100 mt-1">
              {(currentBalance / 10000000).toFixed(7)} XLM
            </p>
          </div>
          <Wallet size={64} className="text-primary-200" />
        </div>

        <div className="mt-6 pt-6 border-t border-primary-400">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-primary-100 text-sm">Estimated Daily Cost</p>
              <p className="text-xl font-semibold">
                {estimatedDailyCost.toFixed(2)} XLM
              </p>
            </div>
            <div>
              <p className="text-primary-100 text-sm">Days Remaining</p>
              <p className="text-xl font-semibold">{daysRemaining} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="btn-primary flex items-center justify-center space-x-2">
          <ArrowDown size={20} />
          <span>Recharge Balance</span>
        </button>
        <button className="btn-secondary flex items-center justify-center space-x-2">
          <ArrowUp size={20} />
          <span>Request Payout</span>
        </button>
      </div>

      {/* Transaction history */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between py-3 border-b last:border-b-0"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    transaction.type === "credit"
                      ? "bg-green-100"
                      : "bg-red-100"
                  }`}
                >
                  {transaction.type === "credit" ? (
                    <ArrowDown className="text-green-600" size={20} />
                  ) : (
                    <ArrowUp className="text-red-600" size={20} />
                  )}
                </div>
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Clock size={14} className="mr-1" />
                    {transaction.date}
                  </p>
                </div>
              </div>
              <p
                className={`font-semibold ${
                  transaction.type === "credit"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {transaction.amount > 0 ? "+" : ""}
                {transaction.amount.toFixed(2)} XLM
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Billing information */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Billing Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Tariff Rate</span>
            <span className="font-medium">
              {(tariffRate / 10000000).toFixed(7)} XLM/kWh
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Billing Cycle</span>
            <span className="font-medium">Monthly</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Next Billing Date</span>
            <span className="font-medium">February 1, 2024</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Payment Method</span>
            <span className="font-medium">Stellar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

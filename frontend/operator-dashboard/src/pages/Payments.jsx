import { DollarSign, Download, Filter, Check } from "lucide-react";

export default function Payments() {
  const payments = [
    {
      id: 1,
      household: "HH-001",
      amount: 50,
      date: "2024-01-15",
      status: "completed",
      method: "Stellar",
    },
    {
      id: 2,
      household: "HH-002",
      amount: 25,
      date: "2024-01-15",
      status: "pending",
      method: "Stellar",
    },
    {
      id: 3,
      household: "HH-003",
      amount: 100,
      date: "2024-01-14",
      status: "completed",
      method: "Stellar",
    },
    {
      id: 4,
      household: "HH-004",
      amount: 75,
      date: "2024-01-14",
      status: "failed",
      method: "Stellar",
    },
    {
      id: 5,
      household: "HH-005",
      amount: 30,
      date: "2024-01-13",
      status: "completed",
      method: "Stellar",
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const totalRevenue = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Track and manage energy payments</p>
        </div>
        <button className="btn-secondary flex items-center space-x-2">
          <Download size={20} />
          <span>Export</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalRevenue} XLM
              </p>
            </div>
            <DollarSign className="text-green-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {pendingAmount} XLM
              </p>
            </div>
            <Filter className="text-yellow-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.length}
              </p>
            </div>
            <Check className="text-blue-600" size={32} />
          </div>
        </div>
      </div>

      {/* Payment table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                ID
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Household
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Amount
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Date
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Method
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Status
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">#{payment.id}</td>
                <td className="py-3 px-4">{payment.household}</td>
                <td className="py-3 px-4 font-semibold">
                  {payment.amount} XLM
                </td>
                <td className="py-3 px-4">{payment.date}</td>
                <td className="py-3 px-4">{payment.method}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}
                  >
                    {payment.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Settlement queue */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Settlement Queue</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <p className="font-medium">Pending Settlements</p>
              <p className="text-sm text-gray-600">
                3 transactions awaiting confirmation
              </p>
            </div>
            <button className="btn-primary text-sm">Process All</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div>
              <p className="font-medium">Last Settlement</p>
              <p className="text-sm text-gray-600">Completed 2 hours ago</p>
            </div>
            <span className="text-green-600 font-semibold">Success</span>
          </div>
        </div>
      </div>
    </div>
  );
}

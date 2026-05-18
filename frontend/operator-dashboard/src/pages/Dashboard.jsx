import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";

export default function Dashboard() {
  // Mock data - in production, this would come from API
  const stats = {
    totalMeters: 1247,
    activeMeters: 1198,
    totalRevenue: 45230,
    pendingPayments: 89,
    gridLoad: 85.6,
    alerts: 12,
  };

  const recentActivity = [
    {
      id: 1,
      type: "meter_registered",
      message: "New meter registered: MTR-1248",
      time: "2 min ago",
    },
    {
      id: 2,
      type: "payment_received",
      message: "Payment received: 50 XLM from HH-456",
      time: "15 min ago",
    },
    {
      id: 3,
      type: "alert",
      message: "High consumption detected: MTR-0892",
      time: "32 min ago",
    },
    {
      id: 4,
      type: "meter_suspended",
      message: "Meter suspended: MTR-0341 (non-payment)",
      time: "1 hour ago",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
        <p className="text-gray-600">Grid overview and management</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Meters</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalMeters}
              </p>
            </div>
            <Zap className="text-blue-600" size={24} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.activeMeters}
              </p>
            </div>
            <Activity className="text-green-600" size={24} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue (XLM)</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="text-yellow-600" size={24} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.pendingPayments}
              </p>
            </div>
            <Users className="text-orange-600" size={24} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Grid Load</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.gridLoad}%
              </p>
            </div>
            <TrendingUp className="text-purple-600" size={24} />
          </div>
        </div>

        <div className="card border-orange-200 bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-800">Active Alerts</p>
              <p className="text-2xl font-bold text-orange-900">
                {stats.alerts}
              </p>
            </div>
            <AlertTriangle className="text-orange-600" size={24} />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="btn-primary">Register Meter</button>
          <button className="btn-secondary">View Payments</button>
          <button className="btn-secondary">Grid Status</button>
          <button className="btn-secondary">Generate Report</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 py-2 border-b last:border-b-0"
              >
                <div
                  className={`p-2 rounded-lg ${
                    activity.type === "alert" ? "bg-orange-100" : "bg-blue-100"
                  }`}
                >
                  {activity.type === "alert" ? (
                    <AlertTriangle className="text-orange-600" size={16} />
                  ) : (
                    <Activity className="text-blue-600" size={16} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid status */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Grid Status</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Current Load</span>
                <span className="font-medium">{stats.gridLoad}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    stats.gridLoad > 90
                      ? "bg-red-500"
                      : stats.gridLoad > 75
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${stats.gridLoad}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">98.2%</p>
                <p className="text-xs text-gray-600">Uptime</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">1.2s</p>
                <p className="text-xs text-gray-600">Avg Response</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Distribution by Zone</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Zone A</span>
                  <span>45%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Zone B</span>
                  <span>32%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Zone C</span>
                  <span>23%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

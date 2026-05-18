import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Activity, TrendingUp, Zap, AlertTriangle } from "lucide-react";

export default function GridLoad() {
  const hourlyData = [
    { time: "00:00", load: 45, capacity: 100 },
    { time: "04:00", load: 38, capacity: 100 },
    { time: "08:00", load: 65, capacity: 100 },
    { time: "12:00", load: 82, capacity: 100 },
    { time: "16:00", load: 78, capacity: 100 },
    { time: "20:00", load: 95, capacity: 100 },
    { time: "24:00", load: 52, capacity: 100 },
  ];

  const zoneData = [
    { name: "Zone A", load: 45, capacity: 50 },
    { name: "Zone B", load: 32, capacity: 40 },
    { name: "Zone C", load: 23, capacity: 30 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Grid Load Monitoring
        </h1>
        <p className="text-gray-600">
          Real-time energy consumption and grid status
        </p>
      </div>

      {/* Current status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Load</p>
              <p className="text-2xl font-bold text-gray-900">85.6 kW</p>
            </div>
            <Zap className="text-yellow-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Capacity</p>
              <p className="text-2xl font-bold text-gray-900">120 kW</p>
            </div>
            <Activity className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilization</p>
              <p className="text-2xl font-bold text-orange-600">71.3%</p>
            </div>
            <TrendingUp className="text-orange-600" size={32} />
          </div>
        </div>

        <div className="card border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-800">Peak Alert</p>
              <p className="text-2xl font-bold text-red-900">95 kW</p>
            </div>
            <AlertTriangle className="text-red-600" size={32} />
          </div>
        </div>
      </div>

      {/* Load chart */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">24-Hour Load Profile</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="load"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
              />
              <Line
                type="monotone"
                dataKey="capacity"
                stroke="#ef4444"
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone breakdown */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Zone Breakdown</h2>
        <div className="space-y-4">
          {zoneData.map((zone) => {
            const percentage = (zone.load / zone.capacity) * 100;
            return (
              <div key={zone.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{zone.name}</span>
                  <span>
                    {zone.load} kW / {zone.capacity} kW ({percentage.toFixed(1)}
                    %)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      percentage > 90
                        ? "bg-red-500"
                        : percentage > 75
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Active Alerts</h2>
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="text-red-600 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-red-800">High Load Warning</p>
              <p className="text-sm text-red-700">
                Zone C approaching capacity (95%)
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-yellow-800">Unusual Consumption</p>
              <p className="text-sm text-yellow-700">
                Meter MTR-005 showing abnormal patterns
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

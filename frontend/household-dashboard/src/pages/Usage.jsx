import { useQuery } from '@tanstack/react-query';
import { energyApi } from '../api/energy';
import { useEnergyStore } from '../stores/energyStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';

export default function Usage() {
  const { meterId } = useEnergyStore();
  
  const { data: usageData } = useQuery({
    queryKey: ['usageHistory', meterId],
    queryFn: () => energyApi.getUsageHistory(meterId),
    enabled: !!meterId
  });

  // Mock data for chart
  const chartData = [
    { time: '00:00', usage: 0.5 },
    { time: '04:00', usage: 0.3 },
    { time: '08:00', usage: 1.2 },
    { time: '12:00', usage: 2.5 },
    { time: '16:00', usage: 1.8 },
    { time: '20:00', usage: 3.2 },
    { time: '24:00', usage: 1.5 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usage History</h1>
        <p className="text-gray-600">Track your energy consumption over time</p>
      </div>

      {/* Usage chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Today's Consumption</h2>
          <div className="flex items-center space-x-2">
            <Calendar size={20} className="text-gray-400" />
            <select className="input-field w-auto">
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="usage" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Usage statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Today</p>
              <p className="text-2xl font-bold text-gray-900">11.0 kWh</p>
            </div>
            <TrendingUp className="text-primary-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div>
            <p className="text-sm text-gray-600">Average per Hour</p>
            <p className="text-2xl font-bold text-gray-900">0.46 kWh</p>
          </div>
        </div>

        <div className="card">
          <div>
            <p className="text-sm text-gray-600">Peak Usage</p>
            <p className="text-2xl font-bold text-gray-900">3.2 kWh</p>
            <p className="text-xs text-gray-500">at 20:00</p>
          </div>
        </div>
      </div>

      {/* Usage breakdown */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Usage Breakdown</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Lighting</span>
              <span>2.5 kWh (23%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full" style={{ width: '23%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Appliances</span>
              <span>4.2 kWh (38%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '38%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Heating/Cooling</span>
              <span>3.8 kWh (35%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '35%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Other</span>
              <span>0.5 kWh (4%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gray-600 h-2 rounded-full" style={{ width: '4%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { energyApi } from '../api/energy';
import { useEnergyStore } from '../stores/energyStore';
import { Zap, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { currentBalance, currentUsage, tariffRate } = useEnergyStore();
  
  const { data: gridLoad } = useQuery({
    queryKey: ['gridLoad'],
    queryFn: energyApi.getGridLoad,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const balanceInXLM = (currentBalance / 10000000).toFixed(2);
  const estimatedCost = (currentUsage * tariffRate) / 10000000;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your energy management dashboard</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">{balanceInXLM} XLM</p>
            </div>
            <Wallet className="text-primary-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Usage</p>
              <p className="text-2xl font-bold text-gray-900">{currentUsage.toFixed(2)} kWh</p>
            </div>
            <Zap className="text-yellow-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estimated Cost</p>
              <p className="text-2xl font-bold text-gray-900">{estimatedCost.toFixed(2)} XLM</p>
            </div>
            <TrendingUp className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Grid Load</p>
              <p className="text-2xl font-bold text-gray-900">
                {gridLoad?.current_load?.toFixed(2) || '0'} kW
              </p>
            </div>
            <AlertTriangle className="text-orange-600" size={32} />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-primary">
            View Usage History
          </button>
          <button className="btn-secondary">
            Recharge Balance
          </button>
          <button className="btn-secondary">
            Check Alerts
          </button>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Meter Reading</p>
              <p className="text-sm text-gray-600">Automatic reading recorded</p>
            </div>
            <p className="text-sm text-gray-500">{format(new Date(), 'HH:mm')}</p>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Balance Update</p>
              <p className="text-sm text-gray-600">0.5 kWh consumed</p>
            </div>
            <p className="text-sm text-gray-500">{format(new Date(Date.now() - 3600000), 'HH:mm')}</p>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">System Check</p>
              <p className="text-sm text-gray-600">All systems operational</p>
            </div>
            <p className="text-sm text-gray-500">{format(new Date(Date.now() - 7200000), 'HH:mm')}</p>
          </div>
        </div>
      </div>

      {/* Low balance warning */}
      {currentBalance < 10000000 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="text-yellow-600 mt-0.5 mr-3" size={20} />
            <div>
              <h3 className="font-semibold text-yellow-800">Low Balance Warning</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your balance is running low. Please recharge to avoid service interruption.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

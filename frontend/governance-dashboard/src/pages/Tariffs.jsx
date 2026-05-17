import { Edit, Save, TrendingUp, Calculator, History } from 'lucide-react';
import { useState } from 'react';

export default function Tariffs() {
  const [editing, setEditing] = useState(false);
  const [currentTariff, setCurrentTariff] = useState(100);

  const tariffHistory = [
    { date: '2024-01-01', rate: 100, reason: 'Standard rate' },
    { date: '2023-07-01', rate: 95, reason: 'Summer discount' },
    { date: '2023-01-01', rate: 100, reason: 'Standard rate' },
    { date: '2022-07-01', rate: 90, reason: 'Promotional rate' },
  ];

  const tariffStructure = [
    { tier: '0-10 kWh', rate: 100, description: 'Basic consumption' },
    { tier: '10-50 kWh', rate: 95, description: 'Standard household' },
    { tier: '50-100 kWh', rate: 90, description: 'High consumption' },
    { tier: '100+ kWh', rate: 85, description: 'Industrial rate' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tariff Management</h1>
        <p className="text-gray-600">Configure energy pricing structures</p>
      </div>

      {/* Current tariff */}
      <div className="card bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Current Base Tariff</h2>
            <div className="flex items-baseline space-x-2">
              {editing ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={currentTariff}
                    onChange={(e) => setCurrentTariff(parseInt(e.target.value))}
                    className="input-field w-32"
                  />
                  <span className="text-gray-600">stroops/kWh</span>
                  <button 
                    onClick={() => setEditing(false)}
                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Save size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-4xl font-bold text-gray-900">{currentTariff}</p>
                  <p className="text-gray-600 ml-2">stroops/kWh</p>
                  <button 
                    onClick={() => setEditing(true)}
                    className="ml-4 p-2 bg-white rounded-lg hover:bg-gray-100"
                  >
                    <Edit size={20} className="text-gray-600" />
                  </button>
                </>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {(currentTariff / 10000000).toFixed(7)} XLM per kWh
            </p>
          </div>
          <Calculator className="text-purple-600" size={64} />
        </div>
      </div>

      {/* Tiered pricing */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Tiered Pricing Structure</h2>
        <div className="space-y-3">
          {tariffStructure.map((tier, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="font-semibold">{tier.tier}</span>
                  <span className="text-sm text-gray-600">{tier.description}</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-lg font-bold">{tier.rate} stroops/kWh</span>
                <button className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tariff history */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <History size={20} />
            <span>Tariff History</span>
          </h2>
          <button className="text-sm text-purple-600 hover:text-purple-700">View Full History</button>
        </div>
        <div className="space-y-3">
          {tariffHistory.map((entry, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{entry.date}</span>
                <span className="font-medium">{entry.rate} stroops/kWh</span>
              </div>
              <span className="text-sm text-gray-600">{entry.reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Propose tariff change */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Propose Tariff Change</h2>
        <p className="text-sm text-gray-600 mb-4">
          Tariff changes require community approval through the governance process.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Rate (stroops/kWh)</label>
            <input type="number" className="input-field" placeholder="95" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
            <input type="date" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select className="input-field">
              <option>Cost adjustment</option>
              <option>Seasonal variation</option>
              <option>Policy change</option>
              <option>Other</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Justification</label>
            <textarea className="input-field" rows={3} placeholder="Explain the reason for this tariff change" />
          </div>
          <div className="md:col-span-3">
            <button className="btn-primary">Create Governance Proposal</button>
          </div>
        </div>
      </div>

      {/* Impact analysis */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <TrendingUp size={20} />
          <span>Impact Analysis</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">Low-Income Households</p>
            <p className="text-2xl font-bold text-green-900">-15%</p>
            <p className="text-xs text-green-700">Estimated impact</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">Average Household</p>
            <p className="text-2xl font-bold text-blue-900">+5%</p>
            <p className="text-xs text-blue-700">Estimated impact</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-800">High Consumption</p>
            <p className="text-2xl font-bold text-purple-900">+10%</p>
            <p className="text-xs text-purple-700">Estimated impact</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Shield, AlertTriangle, Ban, CheckCircle, Search } from 'lucide-react';
import { useState } from 'react';

export default function Enforcement() {
  const [searchTerm, setSearchTerm] = useState('');

  const violations = [
    { id: 1, type: 'non_payment', meter: 'MTR-0034', household: 'HH-034', severity: 'high', date: '2024-01-15', status: 'pending' },
    { id: 2, type: 'tampering', meter: 'MTR-0089', household: 'HH-089', severity: 'critical', date: '2024-01-14', status: 'action_taken' },
    { id: 3, type: 'overload', meter: 'MTR-0156', household: 'HH-156', severity: 'medium', date: '2024-01-14', status: 'pending' },
    { id: 4, type: 'non_payment', meter: 'MTR-0201', household: 'HH-201', severity: 'high', date: '2024-01-13', status: 'resolved' },
  ];

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'action_taken':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredViolations = violations.filter(v =>
    v.meter.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.household.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enforcement</h1>
        <p className="text-gray-600">Monitor violations and take enforcement actions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-800">Critical</p>
              <p className="text-2xl font-bold text-red-900">1</p>
            </div>
            <AlertTriangle className="text-red-600" size={32} />
          </div>
        </div>

        <div className="card border-orange-200 bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-800">High</p>
              <p className="text-2xl font-bold text-orange-900">2</p>
            </div>
            <Shield className="text-orange-600" size={32} />
          </div>
        </div>

        <div className="card border-yellow-200 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-800">Medium</p>
              <p className="text-2xl font-bold text-yellow-900">1</p>
            </div>
            <AlertTriangle className="text-yellow-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Actions</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
            <Ban className="text-gray-600" size={32} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by meter ID or household..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Violations table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Meter</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Household</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Severity</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredViolations.map((violation) => (
              <tr key={violation.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">#{violation.id}</td>
                <td className="py-3 px-4 capitalize">{violation.type.replace('_', ' ')}</td>
                <td className="py-3 px-4">{violation.meter}</td>
                <td className="py-3 px-4">{violation.household}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadge(violation.severity)}`}>
                    {violation.severity}
                  </span>
                </td>
                <td className="py-3 px-4">{violation.date}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(violation.status)}`}>
                    {violation.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    {violation.status === 'pending' && (
                      <>
                        <button className="text-sm text-blue-600 hover:text-blue-700">
                          Suspend
                        </button>
                        <button className="text-sm text-green-600 hover:text-green-700">
                          Warn
                        </button>
                      </>
                    )}
                    {violation.status === 'action_taken' && (
                      <button className="text-sm text-gray-600 hover:text-gray-700">
                        Review
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-secondary flex items-center justify-center space-x-2">
            <Ban size={20} />
            <span>Suspend Meter</span>
          </button>
          <button className="btn-secondary flex items-center justify-center space-x-2">
            <CheckCircle size={20} />
            <span>Reactivate Meter</span>
          </button>
          <button className="btn-secondary flex items-center justify-center space-x-2">
            <Shield size={20} />
            <span>Update Trust Score</span>
          </button>
        </div>
      </div>
    </div>
  );
}

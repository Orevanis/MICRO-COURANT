import { Plus, DollarSign, Users, Calendar, CheckCircle, XCircle } from 'lucide-react';

export default function Subsidies() {
  const subsidies = [
    { id: 1, name: 'Low-Income Support', discount: 30, allocated: 5000, distributed: 3200, beneficiaries: 45, status: 'active', endDate: '2024-06-30' },
    { id: 2, name: 'Solar Panel Incentive', discount: 25, allocated: 8000, distributed: 1500, beneficiaries: 12, status: 'active', endDate: '2024-12-31' },
    { id: 3, name: 'Rural Electrification', discount: 40, allocated: 10000, distributed: 8500, beneficiaries: 89, status: 'active', endDate: '2024-03-31' },
    { id: 4, name: 'Emergency Relief', discount: 50, allocated: 2000, distributed: 2000, beneficiaries: 15, status: 'completed', endDate: '2023-12-31' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalAllocated = subsidies.reduce((sum, s) => sum + s.allocated, 0);
  const totalDistributed = subsidies.reduce((sum, s) => sum + s.distributed, 0);
  const totalBeneficiaries = subsidies.reduce((sum, s) => sum + s.beneficiaries, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subsidies</h1>
          <p className="text-gray-600">Manage community energy subsidies</p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Create Subsidy</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-900">{totalAllocated.toLocaleString()} XLM</p>
            </div>
            <DollarSign className="text-green-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Distributed</p>
              <p className="text-2xl font-bold text-blue-600">{totalDistributed.toLocaleString()} XLM</p>
            </div>
            <DollarSign className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Beneficiaries</p>
              <p className="text-2xl font-bold text-gray-900">{totalBeneficiaries}</p>
            </div>
            <Users className="text-purple-600" size={32} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Programs</p>
              <p className="text-2xl font-bold text-green-600">{subsidies.filter(s => s.status === 'active').length}</p>
            </div>
            <CheckCircle className="text-green-600" size={32} />
          </div>
        </div>
      </div>

      {/* Subsidies list */}
      <div className="space-y-4">
        {subsidies.map((subsidy) => (
          <div key={subsidy.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold">{subsidy.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(subsidy.status)}`}>
                    {subsidy.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                    {subsidy.discount}% discount
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-gray-600">Allocated</p>
                    <p className="font-medium">{subsidy.allocated.toLocaleString()} XLM</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Distributed</p>
                    <p className="font-medium text-blue-600">{subsidy.distributed.toLocaleString()} XLM</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Beneficiaries</p>
                    <p className="font-medium">{subsidy.beneficiaries}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">End Date</p>
                    <p className="font-medium flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {subsidy.endDate}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Distribution Progress</span>
                    <span className="font-medium">{((subsidy.distributed / subsidy.allocated) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${(subsidy.distributed / subsidy.allocated) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="ml-4 flex flex-col space-y-2">
                {subsidy.status === 'active' && (
                  <>
                    <button className="btn-secondary text-sm">Edit</button>
                    <button className="btn-secondary text-sm text-red-600 hover:text-red-700">Suspend</button>
                  </>
                )}
                {subsidy.status === 'completed' && (
                  <button className="btn-secondary text-sm">View Report</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create subsidy form */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Create Subsidy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subsidy Name</label>
            <input type="text" className="input-field" placeholder="e.g., Summer Relief Program" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
            <input type="number" className="input-field" placeholder="25" min={0} max={100} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allocation (XLM)</label>
            <input type="number" className="input-field" placeholder="5000" min={0} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (months)</label>
            <input type="number" className="input-field" placeholder="6" min={1} max={24} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary">Create Subsidy</button>
          </div>
        </div>
      </div>
    </div>
  );
}

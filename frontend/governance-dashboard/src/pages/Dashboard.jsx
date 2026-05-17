import { Vote, FileText, DollarSign, Users, TrendingUp, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const stats = {
    activeProposals: 5,
    totalVotes: 342,
    activeSubsidies: 3,
    communityFund: 15000,
    participationRate: 67,
    passedProposals: 28
  };

  const recentProposals = [
    { id: 1, title: 'Reduce tariff for low-income households', status: 'voting', votes: 45, endDate: '2024-01-20' },
    { id: 2, title: 'Create solar panel subsidy program', status: 'passed', votes: 89, endDate: '2024-01-15' },
    { id: 3, title: 'Expand grid to Zone D', status: 'active', votes: 0, endDate: '2024-01-25' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'voting':
        return 'bg-yellow-100 text-yellow-800';
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Governance Dashboard</h1>
        <p className="text-gray-600">Community decision-making and resource management</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Proposals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeProposals}</p>
            </div>
            <Vote className="text-purple-600" size={24} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Votes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVotes}</p>
            </div>
            <Users className="text-blue-600" size={24} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Subsidies</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeSubsidies}</p>
            </div>
            <DollarSign className="text-green-600" size={24} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Community Fund</p>
              <p className="text-2xl font-bold text-gray-900">{stats.communityFund.toLocaleString()} XLM</p>
            </div>
            <FileText className="text-yellow-600" size={24} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Participation</p>
              <p className="text-2xl font-bold text-gray-900">{stats.participationRate}%</p>
            </div>
            <TrendingUp className="text-orange-600" size={24} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Passed</p>
              <p className="text-2xl font-bold text-green-600">{stats.passedProposals}</p>
            </div>
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="btn-primary">Create Proposal</button>
          <button className="btn-secondary">View Subsidies</button>
          <button className="btn-secondary">Manage Tariffs</button>
          <button className="btn-secondary">Cast Vote</button>
        </div>
      </div>

      {/* Recent proposals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Proposals</h2>
          <button className="text-sm text-purple-600 hover:text-purple-700">View All</button>
        </div>
        <div className="space-y-3">
          {recentProposals.map((proposal) => (
            <div key={proposal.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <p className="font-medium">{proposal.title}</p>
                <div className="flex items-center space-x-3 mt-1 text-sm text-gray-600">
                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadge(proposal.status)}`}>
                    {proposal.status}
                  </span>
                  <span>•</span>
                  <span>{proposal.votes} votes</span>
                  <span>•</span>
                  <span>Ends: {proposal.endDate}</span>
                </div>
              </div>
              {proposal.status === 'voting' && (
                <button className="btn-primary text-sm">Vote Now</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Community fund overview */}
      <div className="card bg-gradient-to-r from-purple-50 to-blue-50">
        <h2 className="text-lg font-semibold mb-4">Community Fund Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Balance</p>
            <p className="text-2xl font-bold text-gray-900">{stats.communityFund.toLocaleString()} XLM</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600">Allocated</p>
            <p className="text-2xl font-bold text-gray-900">8,500 XLM</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600">Available</p>
            <p className="text-2xl font-bold text-green-600">6,500 XLM</p>
          </div>
        </div>
      </div>
    </div>
  );
}

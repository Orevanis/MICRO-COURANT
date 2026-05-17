import { useState } from 'react';
import { Plus, Filter, Search, Vote, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function Proposals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const proposals = [
    { id: 1, title: 'Reduce tariff for low-income households', type: 'tariff', status: 'voting', votes: { yes: 45, no: 12, abstain: 5 }, endDate: '2024-01-20', proposer: 'HH-001' },
    { id: 2, title: 'Create solar panel subsidy program', type: 'subsidy', status: 'passed', votes: { yes: 89, no: 8, abstain: 3 }, endDate: '2024-01-15', proposer: 'HH-045' },
    { id: 3, title: 'Expand grid to Zone D', type: 'infrastructure', status: 'active', votes: { yes: 0, no: 0, abstain: 0 }, endDate: '2024-01-25', proposer: 'OP-001' },
    { id: 4, title: 'Increase maintenance budget', type: 'budget', status: 'rejected', votes: { yes: 23, no: 67, abstain: 10 }, endDate: '2024-01-10', proposer: 'HH-089' },
    { id: 5, title: 'Implement peak-hour pricing', type: 'tariff', status: 'voting', votes: { yes: 34, no: 28, abstain: 8 }, endDate: '2024-01-22', proposer: 'OP-002' },
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'voting':
        return <Vote className="text-yellow-600" size={20} />;
      case 'passed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'active':
        return <Clock className="text-blue-600" size={20} />;
      case 'rejected':
        return <XCircle className="text-red-600" size={20} />;
      default:
        return null;
    }
  };

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
          <p className="text-gray-600">Community governance proposals</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create Proposal</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search proposals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="voting">Voting</option>
              <option value="passed">Passed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Proposals list */}
      <div className="space-y-4">
        {filteredProposals.map((proposal) => (
          <div key={proposal.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {getStatusIcon(proposal.status)}
                  <h3 className="text-lg font-semibold">{proposal.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(proposal.status)}`}>
                    {proposal.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800 capitalize">
                    {proposal.type}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-gray-600">Proposer</p>
                    <p className="font-medium">{proposal.proposer}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">End Date</p>
                    <p className="font-medium">{proposal.endDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Votes</p>
                    <p className="font-medium">{proposal.votes.yes + proposal.votes.no + proposal.votes.abstain}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Yes Votes</p>
                    <p className="font-medium text-green-600">{proposal.votes.yes}</p>
                  </div>
                </div>

                {/* Vote breakdown */}
                {proposal.status === 'voting' && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{proposal.votes.yes}</p>
                        <p className="text-xs text-green-800">Yes</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{proposal.votes.no}</p>
                        <p className="text-xs text-red-800">No</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-600">{proposal.votes.abstain}</p>
                        <p className="text-xs text-gray-800">Abstain</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {proposal.status === 'voting' && (
                <button className="btn-primary ml-4">Vote</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create proposal modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Create New Proposal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" className="input-field" placeholder="Proposal title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="input-field">
                    <option>Tariff Adjustment</option>
                    <option>Subsidy Creation</option>
                    <option>Subsidy Modification</option>
                    <option>Budget Allocation</option>
                    <option>Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea className="input-field" rows={4} placeholder="Detailed description of the proposal" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voting Period (days)</label>
                  <input type="number" className="input-field" defaultValue={7} min={1} max={30} />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button className="btn-primary">Submit Proposal</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

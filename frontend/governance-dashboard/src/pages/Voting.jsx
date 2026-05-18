import { Vote, CheckCircle, XCircle, MinusCircle } from "lucide-react";

export default function Voting() {
  const activeProposals = [
    {
      id: 1,
      title: "Reduce tariff for low-income households",
      description:
        "This proposal aims to reduce the base tariff by 15% for households classified as low-income based on their monthly consumption patterns.",
      votes: { yes: 45, no: 12, abstain: 5 },
      totalVoters: 100,
      endDate: "2024-01-20",
      hasVoted: false,
    },
    {
      id: 2,
      title: "Implement peak-hour pricing",
      description:
        "Introduce time-of-use pricing with higher rates during peak hours (6PM-10PM) to encourage load balancing.",
      votes: { yes: 34, no: 28, abstain: 8 },
      totalVoters: 100,
      endDate: "2024-01-22",
      hasVoted: true,
      userVote: "yes",
    },
  ];

  const calculatePercentage = (votes, total) => {
    return total > 0 ? ((votes / total) * 100).toFixed(1) : 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Voting</h1>
        <p className="text-gray-600">
          Cast your vote on active governance proposals
        </p>
      </div>

      {/* Voting stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">2</p>
            <p className="text-sm text-gray-600">Active Proposals</p>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">1</p>
            <p className="text-sm text-gray-600">Your Votes Cast</p>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">67%</p>
            <p className="text-sm text-gray-600">Participation Rate</p>
          </div>
        </div>
      </div>

      {/* Active proposals for voting */}
      <div className="space-y-6">
        {activeProposals.map((proposal) => (
          <div key={proposal.id} className="card">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Vote className="text-purple-600" size={24} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{proposal.title}</h3>
                  {proposal.hasVoted && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Voted
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-4">{proposal.description}</p>

                {/* Vote breakdown */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <CheckCircle className="text-green-600" size={16} />
                      <span className="text-2xl font-bold text-green-600">
                        {proposal.votes.yes}
                      </span>
                    </div>
                    <p className="text-xs text-green-800">
                      Yes (
                      {calculatePercentage(
                        proposal.votes.yes,
                        proposal.totalVoters,
                      )}
                      %)
                    </p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <XCircle className="text-red-600" size={16} />
                      <span className="text-2xl font-bold text-red-600">
                        {proposal.votes.no}
                      </span>
                    </div>
                    <p className="text-xs text-red-800">
                      No (
                      {calculatePercentage(
                        proposal.votes.no,
                        proposal.totalVoters,
                      )}
                      %)
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <MinusCircle className="text-gray-600" size={16} />
                      <span className="text-2xl font-bold text-gray-600">
                        {proposal.votes.abstain}
                      </span>
                    </div>
                    <p className="text-xs text-gray-800">
                      Abstain (
                      {calculatePercentage(
                        proposal.votes.abstain,
                        proposal.totalVoters,
                      )}
                      %)
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Voting Progress</span>
                    <span className="font-medium">
                      {proposal.votes.yes +
                        proposal.votes.no +
                        proposal.votes.abstain}{" "}
                      / {proposal.totalVoters} votes
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="flex h-full">
                      <div
                        className="bg-green-500"
                        style={{
                          width: `${calculatePercentage(proposal.votes.yes, proposal.totalVoters)}%`,
                        }}
                      ></div>
                      <div
                        className="bg-red-500"
                        style={{
                          width: `${calculatePercentage(proposal.votes.no, proposal.totalVoters)}%`,
                        }}
                      ></div>
                      <div
                        className="bg-gray-400"
                        style={{
                          width: `${calculatePercentage(proposal.votes.abstain, proposal.totalVoters)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Ends: {proposal.endDate} • Quorum: 50%
                  </p>
                  {!proposal.hasVoted ? (
                    <div className="flex space-x-2">
                      <button className="btn-primary bg-green-600 hover:bg-green-700">
                        Vote Yes
                      </button>
                      <button className="btn-primary bg-red-600 hover:bg-red-700">
                        Vote No
                      </button>
                      <button className="btn-secondary">Abstain</button>
                    </div>
                  ) : (
                    <span className="text-sm text-green-600 font-medium">
                      You voted: {proposal.userVote}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Voting information */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How Voting Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each household gets one vote per proposal</li>
          <li>• Proposals require 50% quorum to be valid</li>
          <li>• A proposal passes if yes votes exceed no votes</li>
          <li>• Voting period is typically 7 days</li>
          <li>• You can change your vote until the proposal ends</li>
        </ul>
      </div>
    </div>
  );
}

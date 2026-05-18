import { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

export default function Meters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const meters = [
    {
      id: "MTR-0001",
      household: "HH-001",
      location: "Zone A - Sector 1",
      status: "active",
      lastReading: 45.2,
      trustScore: 100,
    },
    {
      id: "MTR-0002",
      household: "HH-002",
      location: "Zone A - Sector 1",
      status: "active",
      lastReading: 38.7,
      trustScore: 98,
    },
    {
      id: "MTR-0003",
      household: "HH-003",
      location: "Zone B - Sector 2",
      status: "suspended",
      lastReading: 52.1,
      trustScore: 95,
    },
    {
      id: "MTR-0004",
      household: "HH-004",
      location: "Zone B - Sector 2",
      status: "active",
      lastReading: 41.3,
      trustScore: 100,
    },
    {
      id: "MTR-0005",
      household: "HH-005",
      location: "Zone C - Sector 3",
      status: "tampered",
      lastReading: 89.4,
      trustScore: 45,
    },
    {
      id: "MTR-0006",
      household: "HH-006",
      location: "Zone C - Sector 3",
      status: "active",
      lastReading: 36.8,
      trustScore: 100,
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="text-green-600" size={20} />;
      case "suspended":
        return <XCircle className="text-red-600" size={20} />;
      case "tampered":
        return <AlertCircle className="text-orange-600" size={20} />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      case "tampered":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredMeters = meters.filter((meter) => {
    const matchesSearch =
      meter.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meter.household.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || meter.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meter Management</h1>
          <p className="text-gray-600">Register and manage energy meters</p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Register Meter</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by meter ID or household..."
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
              <option value="suspended">Suspended</option>
              <option value="tampered">Tampered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Meter table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Meter ID
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Household
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Location
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Status
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Last Reading
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Trust Score
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMeters.map((meter) => (
              <tr key={meter.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{meter.id}</td>
                <td className="py-3 px-4">{meter.household}</td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {meter.location}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(meter.status)}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(meter.status)}`}
                    >
                      {meter.status}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">{meter.lastReading} kWh</td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          meter.trustScore >= 90
                            ? "bg-green-500"
                            : meter.trustScore >= 70
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${meter.trustScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{meter.trustScore}%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <MoreVertical size={20} className="text-gray-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredMeters.length} of {meters.length} meters
        </p>
        <div className="flex space-x-2">
          <button className="btn-secondary px-4 py-2" disabled>
            Previous
          </button>
          <button className="btn-primary px-4 py-2">Next</button>
        </div>
      </div>
    </div>
  );
}

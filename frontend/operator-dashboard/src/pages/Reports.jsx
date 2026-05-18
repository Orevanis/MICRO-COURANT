import { FileText, Download, Calendar, TrendingUp } from "lucide-react";

export default function Reports() {
  const reports = [
    {
      id: 1,
      name: "Monthly Revenue Report",
      type: "financial",
      date: "2024-01-15",
      status: "ready",
    },
    {
      id: 2,
      name: "Grid Load Analysis",
      type: "operational",
      date: "2024-01-14",
      status: "ready",
    },
    {
      id: 3,
      name: "Customer Usage Summary",
      type: "usage",
      date: "2024-01-13",
      status: "generating",
    },
    {
      id: 4,
      name: "Fraud Detection Report",
      type: "security",
      date: "2024-01-12",
      status: "ready",
    },
  ];

  const getTypeBadge = (type) => {
    switch (type) {
      case "financial":
        return "bg-green-100 text-green-800";
      case "operational":
        return "bg-blue-100 text-blue-800";
      case "usage":
        return "bg-purple-100 text-purple-800";
      case "security":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate and download system reports</p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <FileText size={20} />
          <span>New Report</span>
        </button>
      </div>

      {/* Report types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <h3 className="font-semibold">Financial</h3>
          </div>
          <p className="text-sm text-gray-600">
            Revenue, payments, and billing reports
          </p>
        </div>

        <div className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="text-blue-600" size={24} />
            </div>
            <h3 className="font-semibold">Operational</h3>
          </div>
          <p className="text-sm text-gray-600">
            Grid load, meter status, and performance
          </p>
        </div>

        <div className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="text-purple-600" size={24} />
            </div>
            <h3 className="font-semibold">Usage</h3>
          </div>
          <p className="text-sm text-gray-600">Customer consumption patterns</p>
        </div>

        <div className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="text-red-600" size={24} />
            </div>
            <h3 className="font-semibold">Security</h3>
          </div>
          <p className="text-sm text-gray-600">
            Fraud detection and enforcement
          </p>
        </div>
      </div>

      {/* Recent reports */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Reports</h2>
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <FileText className="text-gray-400" size={24} />
                <div>
                  <p className="font-medium">{report.name}</p>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getTypeBadge(report.type)}`}
                    >
                      {report.type}
                    </span>
                    <span>•</span>
                    <span>{report.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-sm ${
                    report.status === "ready"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {report.status === "ready" ? "Ready" : "Generating..."}
                </span>
                {report.status === "ready" && (
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Download className="text-gray-600" size={20} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom report */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Generate Custom Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select className="input-field">
              <option>Financial Report</option>
              <option>Usage Report</option>
              <option>Grid Load Report</option>
              <option>Custom Query</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select className="input-field">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Custom range</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <select className="input-field">
              <option>PDF</option>
              <option>CSV</option>
              <option>Excel</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full">Generate Report</button>
          </div>
        </div>
      </div>
    </div>
  );
}

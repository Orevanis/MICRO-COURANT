import { Bell, AlertTriangle, Info, CheckCircle } from "lucide-react";

export default function Alerts() {
  const alerts = [
    {
      id: 1,
      type: "warning",
      title: "Low Balance Warning",
      message:
        "Your balance is below 1 XLM. Please recharge to avoid service interruption.",
      timestamp: "2024-01-15 14:30",
      read: false,
    },
    {
      id: 2,
      type: "info",
      title: "Scheduled Maintenance",
      message:
        "System maintenance scheduled for January 20, 2024 from 02:00 to 04:00 UTC.",
      timestamp: "2024-01-14 10:00",
      read: false,
    },
    {
      id: 3,
      type: "success",
      title: "Subsidy Applied",
      message: "Community subsidy of 5 XLM has been applied to your account.",
      timestamp: "2024-01-13 09:15",
      read: true,
    },
    {
      id: 4,
      type: "warning",
      title: "Unusual Usage Detected",
      message: "Higher than normal consumption detected on January 12.",
      timestamp: "2024-01-12 18:00",
      read: true,
    },
  ];

  const getAlertIcon = (type) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="text-yellow-600" size={24} />;
      case "success":
        return <CheckCircle className="text-green-600" size={24} />;
      case "info":
      default:
        return <Info className="text-blue-600" size={24} />;
    }
  };

  const getAlertBgColor = (type) => {
    switch (type) {
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "info":
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-600">
            Stay informed about your energy account
          </p>
        </div>
        <button className="btn-secondary text-sm">Mark All as Read</button>
      </div>

      {/* Alert settings */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Low Balance Alerts</p>
              <p className="text-sm text-gray-600">
                Get notified when balance is low
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Usage Anomalies</p>
              <p className="text-sm text-gray-600">
                Alert on unusual consumption patterns
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-sm text-gray-600">Receive alerts via SMS</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Alerts list */}
      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`card border ${getAlertBgColor(alert.type)} ${!alert.read ? "border-l-4 border-l-primary-500" : ""}`}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">{getAlertIcon(alert.type)}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{alert.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {alert.message}
                    </p>
                  </div>
                  {!alert.read && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      New
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">{alert.timestamp}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SMS/USSD info */}
      <div className="card bg-gray-50">
        <div className="flex items-start space-x-4">
          <Bell className="text-gray-600 mt-1" size={24} />
          <div>
            <h3 className="font-semibold">SMS/USSD Alerts</h3>
            <p className="text-sm text-gray-600 mt-1">
              Enable SMS notifications to receive alerts even without internet
              access. Dial *123# to check your balance via USSD.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
